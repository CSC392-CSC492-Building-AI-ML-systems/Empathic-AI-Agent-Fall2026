import asyncio
import json
from dataclasses import dataclass
from uuid import UUID

from ..database.dao.message_dao import MessageDao
from ..database.dao.session_dao import SessionDao
from ..database.dao.user_dao import UserDao
from ..database.model.session import Session
from .evaluate_answer import model_decide
from .fine_tune import send_model

TURN_LIMIT = 10

@dataclass
class Decision:

    raw: str
    is_tool_call: bool
    call: str
    content: str
    memory_key: str | None = None

def parse(raw: str) -> Decision:
    """Parse the model's JSON response"""

    if not raw:
        raw = ""

    data = json.loads(raw)
    if not isinstance(data, dict):
        raise TypeError("Decision must be a JSON object")

    call = data.get("call")
    if call not in ("RESPOND", "SAVE-TO-MEMORY", "TERMINATE-SESSION"):
        raise ValueError("Unknown decision call")

    content = data.get("content", "")
    if not isinstance(content, str):
        raise TypeError("Decision content must be a string")

    memory_key = data.get("memory_key")
    if call == "SAVE-TO-MEMORY":
        if not isinstance(memory_key, str) or not memory_key.strip():
            raise ValueError("SAVE-TO-MEMORY requires a memory_key")
        if not content.strip():
            raise ValueError("SAVE-TO-MEMORY requires content")
        memory_key = memory_key.strip()
    else:
        memory_key = None

    if call != "RESPOND":
        return Decision(raw, True, call, content, memory_key)
    return Decision(raw, False, call, content, memory_key)

@dataclass(kw_only=True)
class GenericJob:
    message_dao: MessageDao
    session_dao: SessionDao
    user_dao: UserDao
    response_future: asyncio.Future[str]
    queue: asyncio.Queue
    session_id: UUID
    message: str
    turn_count: int = 0
    session: Session | None = None
    decision: Decision | None = None

    def _finish(self, response: str) -> None:
        self.response_future.set_result(response)

    async def _decide(self, session: Session):
        if not session:
            self._finish("AGENT-ERROR")
            return

        if session.terminated:
            self._finish("This session has been terminated.")
            return

        job = None

        if self.turn_count < TURN_LIMIT:
            memories = await self.user_dao.get_memories(session.user_id)
            raw = await model_decide(session, memories)
            decision = parse(raw)

            if decision.call == "RESPOND":
                job = ResponseJob(message_dao=self.message_dao,
                                  session_dao=self.session_dao,
                                  user_dao=self.user_dao,
                                  response_future=self.response_future,
                                  queue=self.queue,
                                  turn_count=self.turn_count + 1,
                                  session=session,
                                  session_id=self.session_id,
                                  message=self.message,
                                  decision=decision)
            if decision.call == "SAVE-TO-MEMORY":
                job = UpdateMemoryJob(message_dao=self.message_dao,
                                      session_dao=self.session_dao,
                                      user_dao=self.user_dao,
                                      response_future=self.response_future,
                                      queue=self.queue,
                                      turn_count=self.turn_count + 1,
                                      session=session,
                                      session_id=self.session_id,
                                      message=self.message,
                                      decision=decision)
            elif decision.call == "TERMINATE-SESSION":
                job = TerminateSessionJob(message_dao=self.message_dao,
                                          session_dao=self.session_dao,
                                          user_dao=self.user_dao,
                                          response_future=self.response_future,
                                          queue=self.queue,
                                          turn_count=self.turn_count + 1,
                                          session=session,
                                          session_id=self.session_id,
                                          message=self.message,
                                          decision=decision)

            if job is None:
                self._finish("AGENT-ERROR")
                return

            if decision.is_tool_call:
                await self.message_dao.add_message("tool", decision.raw, self.session_id)

        await self.queue.put(job)

    # First job only needs to add msg to database then decide
    async def run(self):
        await self.message_dao.add_message("user", self.message, self.session_id)
        session = await self.session_dao.get_session(self.session_id)
        await self._decide(session)


class ResponseJob(GenericJob):

    async def run(self):

        if not self.session:
            self._finish("AGENT-ERROR")
            return

        memories = await self.user_dao.get_memories(self.session.user_id)
        response = await send_model(self.session, memories)
        await self.message_dao.add_message("assistant", response, self.session_id)
        self._finish(response)


class UpdateMemoryJob(GenericJob):

    async def run(self):

        if not self.session or not self.decision or not self.decision.memory_key:
            self._finish("AGENT-ERROR")
            return

        await self.user_dao.upsert_memory(self.session.user_id,
                                          self.decision.memory_key,
                                          self.decision.content)
        await self._decide(self.session)


class TerminateSessionJob(GenericJob):

    async def run(self):
        await self.session_dao.terminate_session(self.session_id)
        self._finish("SESSION-TERMINATED")
