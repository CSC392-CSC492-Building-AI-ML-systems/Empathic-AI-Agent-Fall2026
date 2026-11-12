import json

from dataclasses import dataclass
from typing import Callable
from uuid import UUID

from ..database.dao.message_dao import MessageDao
from ..database.dao.session_dao import SessionDao
from ..database.dao.user_dao import UserDao
from .evaluate_answer import model_decide
from .fine_tune import send_model


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


class Job:

    session_dao: SessionDao
    message_dao: MessageDao
    user_dao: UserDao
    action: Callable
    session_id: UUID
    turn_limit: int

    def __init__(self, message, message_dao, session_dao, user_dao, session_id, turn_limit):

        self.turn_limit = turn_limit
        self.message = message
        self.session_dao = session_dao
        self.message_dao = message_dao
        self.user_dao = user_dao
        self.session_id = session_id

    async def run(self):

        await self.message_dao.add_message("user", self.message, self.session_id)
        session = None

        for i in range(self.turn_limit):
            session = await self.session_dao.get_session(self.session_id)
            memories = await self.user_dao.get_memories(session.user_id)

            # choose what to do
            raw = await model_decide(session, memories)
            decision = parse(raw)

            if not decision or not decision.is_tool_call:
                break # should do something else later

            await self.message_dao.add_message("tool", decision.raw, session.session_id)

            if decision.call == "TERMINATE-SESSION":
                await self.session_dao.terminate_session(session.session_id)
                return "SESSION-TERMINATED" # CHANGE WHEN AGREED UPON

            elif decision.call == "WEB-SEARCH":
                # implement when web search method found
                # result = await _websearch()
                # add result to session context
                pass

            elif decision.call == "SAVE-TO-MEMORY":
                if decision.memory_key is None:
                    raise ValueError("SAVE-TO-MEMORY requires a memory_key")
                await self.user_dao.upsert_memory(session.user_id, decision.memory_key, decision.content)


        if not session:
            session = await self.session_dao.get_session(self.session_id)

        memories = await self.user_dao.get_memories(session.user_id)
        response = await send_model(session, memories) # fine tuned model
        await self.message_dao.add_message("assistant", response, session.session_id)
        return response




