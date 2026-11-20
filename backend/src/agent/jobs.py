import asyncio
import json
from dataclasses import dataclass, replace
from uuid import UUID

from ..database.dao.message_dao import MessageDao
from ..database.dao.session_dao import SessionDao
from ..database.dao.user_dao import UserDao
from ..database.model.session import Session
from .evaluate_answer import model_decide, model_web_search
from .fine_tune import send_model

TURN_LIMIT = 10
SESSION_CLOSED_REPLY = "This session has been terminated."

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
    if not isinstance(call, str) or call not in JOB_TYPES:
        raise ValueError("Unknown decision call")

    content = data.get("content", "")
    if not isinstance(content, str):
        raise TypeError("Decision content must be a string")
    if call == "WEB-SEARCH" and not content.strip():
        raise ValueError("WEB-SEARCH requires a search query")

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
        if not self.response_future.done():
            self.response_future.set_result(response)

    async def _decide(self, session: Session) -> None:
        """Queue the next job or resolve the request's response future."""
        if not session:
            raise RuntimeError("Cannot choose an agent action without a session")

        if session.terminated:
            self._finish(SESSION_CLOSED_REPLY)
            return

        job = None

        if self.turn_count < TURN_LIMIT:
            memories = await self.user_dao.get_memories(session.user_id)
            if self.turn_count == 0:
                session = replace(session, memories_at_turn_start=memories.copy())
            tool_context = await self.session_dao.get_tool_context(self.session_id)
            raw = await model_decide(session, tool_context=tool_context, memories=memories)
            decision = parse(raw)

            job = JOB_TYPES[decision.call](
                message_dao=self.message_dao,
                session_dao=self.session_dao,
                user_dao=self.user_dao,
                response_future=self.response_future,
                queue=self.queue,
                turn_count=self.turn_count + 1,
                session=session,
                session_id=self.session_id,
                message=self.message,
                decision=decision,
            )

            if decision.is_tool_call:
                await self.message_dao.add_message("tool", decision.raw, self.session_id)

        if job is None:
            raise RuntimeError(f"Agent exceeded the decision turn limit ({TURN_LIMIT})")

        await self.queue.put(job)

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
            raise RuntimeError("Cannot generate a response without a session")

        tool_context = await self.session_dao.get_tool_context(self.session_id)
        response = await send_model(self.session, tool_context=tool_context)
        await self.message_dao.add_message("assistant", response, self.session_id)
        self._finish(response)

"""
NON TERMINAL STATE

Removes a memory entry from the memory table then chooses the next state.
"""
class RemoveMemoryJob(GenericJob):

    async def run(self):

        if not self.session or not self.decision or not self.decision.memory_key:
            raise RuntimeError("Removing a memory requires a session and a decision with a memory key")

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
            raise RuntimeError("Updating a memory requires a session and a decision with a memory key")

        await self.user_dao.upsert_memory(self.session.user_id,
                                          self.decision.memory_key,
                                          self.decision.content)
        await self._decide(self.session)

"""
NON TERMINAL STATE

Runs a websearch and stores the result in the tool context, then chooses the next state.
"""
class WebSearchJob(GenericJob):

    async def run(self):
        if not self.session or not self.decision:
            raise RuntimeError("Web search requires a session and a decision")

        result = await model_web_search(self.decision.content)
        await self.session_dao.add_tool_context(self.session_id, result)
        await self._decide(self.session)

"""
TERMINAL STATE

Terminates the current session and returns a response to the saved future.
"""
class TerminateSessionJob(GenericJob):

    async def run(self):
        await self.session_dao.terminate_session(self.session_id)
        self._finish("SESSION-TERMINATED")


JOB_TYPES: dict[str, type[GenericJob]] = {
    "RESPOND": ResponseJob,
    "UPDATE-MEMORY": UpdateMemoryJob,
    "REMOVE-MEMORY": RemoveMemoryJob,
    "WEB-SEARCH": WebSearchJob,
    "TERMINATE-SESSION": TerminateSessionJob,
}
