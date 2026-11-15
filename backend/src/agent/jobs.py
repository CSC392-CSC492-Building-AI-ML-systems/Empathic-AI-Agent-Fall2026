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

class GenericJob:

    # Database access
    message_dao: MessageDao | None
    session_dao: SessionDao | None
    user_dao: UserDao | None

    owner: asyncio.Future[str] | None
    queue: asyncio.Queue | None
    turn_count: int
    session: Session | None
    session_id: UUID | None
    progress_msg: str | None = "..."
    decision: Decision | None
    message: str | None

    def __init__(self,
                 message_dao: MessageDao | None = None,
                 session_dao: SessionDao | None = None,
                 user_dao: UserDao | None = None,
                 owner: asyncio.Future[str] | None = None,
                 queue: asyncio.Queue | None = None,
                 session: Session | None = None,
                 session_id: UUID | None = None,
                 message: str | None = None):

        self.message_dao = message_dao
        self.session_dao = session_dao
        self.user_dao = user_dao
        self.owner = owner
        self.queue = queue
        self.session = session
        self.session_id = session_id
        self.message = message
        self.decision: Decision | None = None
        self.turn_count = 0


    def _gather(self, other):
        self.message_dao = other.message_dao
        self.session_dao = other.session_dao
        self.user_dao = other.user_dao
        self.owner = other.owner
        self.queue = other.queue
        self.session = other.session
        self.session_id = other.session_id
        self.turn_count = other.turn_count + 1

    def _finish(self, response: str):
        self.owner.set_result(response)
        # change later to allow for progress update?

    async def _setup(self):
        self.session = await self.session_dao.get_session(self.session_id)

    def send_progress_update(self):
        if self.progress_msg:
            pass
            # figure out later

    async def _decide(self):

        job = ResponseJob()

        if self.turn_count < TURN_LIMIT:
            memories = await self.user_dao.get_memories(self.session.user_id)
            raw = await model_decide(self.session, memories)
            decision = parse(raw)

            if decision.call == "SAVE-TO-MEMORY":
                job = UpdateMemoryJob()
            elif decision.call == "TERMINATE-SESSION":
                job = TerminateSessionJob()

            job.decision = decision
            if decision.is_tool_call:
                await self.message_dao.add_message("tool", decision.raw, self.session_id)

        # Copies necessary values from this job to the next job
        job._gather(self)
        await self.queue.put(job)

    async def run(self):
        await self.message_dao.add_message("user", self.message, self.session_id)
        await self._setup()
        await self._decide()


class ResponseJob(GenericJob):

    progress_msg = None

    async def run(self):
        memories = await self.user_dao.get_memories(self.session.user_id)
        response = await send_model(self.session, memories)
        await self.message_dao.add_message("assistant", response, self.session_id)
        self._finish(response)



class UpdateMemoryJob(GenericJob):

    progress_msg = "Updating Memory..."

    async def run(self):
        await self.user_dao.upsert_memory(self.session.user_id,
                                          self.decision.memory_key,
                                          self.decision.content)
        await self._decide()


class RemoveMemoryJob(GenericJob):

    progress_msg = "Removing Memory..."

    async def run(self):
        pass
        #implement later


class TerminateSessionJob(GenericJob):

    progress_msg = "Terminating Session..."

    async def run(self):
        await self.session_dao.terminate_session(self.session_id)
        self._finish("SESSION-TERMINATED")



