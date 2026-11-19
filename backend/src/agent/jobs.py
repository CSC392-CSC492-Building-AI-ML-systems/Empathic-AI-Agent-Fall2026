import asyncio
import json
from dataclasses import dataclass, replace
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
    if call not in ("RESPOND", "UPDATE-MEMORY", "TERMINATE-SESSION", "REMOVE-MEMORY"):
        raise ValueError("Unknown decision call")

    content = data.get("content", "")
    if not isinstance(content, str):
        raise TypeError("Decision content must be a string")

    memory_key = None
    if call in ("UPDATE-MEMORY", "REMOVE-MEMORY"):
        memory_key = data.get("memory_key")
        if not isinstance(memory_key, str) or not memory_key.strip():
            raise ValueError(f"{call} requires a memory_key")
        memory_key = memory_key.strip()
        if call == "UPDATE-MEMORY" and not content.strip():
            raise ValueError("UPDATE-MEMORY requires content")

    return Decision(raw, call != "RESPOND", call, content, memory_key)

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
            if self.turn_count == 0:
                session = replace(session, memories_at_turn_start=memories.copy())
            tool_context = await self.session_dao.get_tool_context(self.session_id)
            raw = await model_decide(session, tool_context=tool_context, memories=memories)
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
            elif decision.call == "UPDATE-MEMORY":
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
            elif decision.call == "REMOVE-MEMORY":
                job = RemoveMemoryJob(message_dao=self.message_dao,
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

            if decision.is_tool_call:
                await self.message_dao.add_message("tool", decision.raw, self.session_id)

        if job is None:
            self._finish("AGENT-ERROR")
            return

        await self.queue.put(job)

    # First job only needs to add msg to database then decide
    async def run(self):
        await self.message_dao.add_message("user", self.message, self.session_id)
        session = await self.session_dao.get_session(self.session_id)
        await self._decide(session)

"""
TERMINAL STATE

Takes memories and contexts, sends them to Edward's fine tune model and gets the response.
Response is returned to the future this state holds.
"""
class ResponseJob(GenericJob):

    async def run(self):

        if not self.session:
            self._finish("AGENT-ERROR")
            return

        response = await send_model(self.session)
        await self.message_dao.add_message("assistant", response, self.session_id)
        self._finish(response)

"""
NON TERMINAL STATE

Removes a memory entry from the memory table then chooses the next state.
"""
class RemoveMemoryJob(GenericJob):

    async def run(self):

        if not self.session or not self.decision or not self.decision.memory_key:
            self._finish("AGENT-ERROR")
            return

        await self.user_dao.remove_memory(self.session.user_id,
                                          self.decision.memory_key)
        await self._decide(self.session)

"""
NON TERMINAL STATE

Add/updates a memory entry from the memory table then chooses the next state.
"""
class UpdateMemoryJob(GenericJob):

    async def run(self):

        if not self.session or not self.decision or not self.decision.memory_key:
            self._finish("AGENT-ERROR")
            return

        await self.user_dao.upsert_memory(self.session.user_id,
                                          self.decision.memory_key,
                                          self.decision.content)
        await self._decide(self.session)

"""
NON TERMINAL STATE

Runs a websearch and stores the result in the tool context, then chooses the next state.
"""
#class WebSearchJob(GenericJob):
#
#    async def run(self):
#
#        if not self.session or not self.decision or not self.decision.memory_key:
#            self._finish("AGENT-ERROR")
#            return
#
#        await self.user_dao.upsert_memory(self.session.user_id,
#                                          self.decision.memory_key,
#                                          self.decision.content)
#        await self._decide(self.session)


"""
TERMINAL STATE

Terminates the current session and returns a response to the saved future.
"""
class TerminateSessionJob(GenericJob):

    async def run(self):
        await self.session_dao.terminate_session(self.session_id)
        self._finish("SESSION-TERMINATED")
