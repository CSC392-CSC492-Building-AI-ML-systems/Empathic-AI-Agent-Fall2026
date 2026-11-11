from dataclasses import dataclass
from typing import Callable
from uuid import UUID

from backend.src.agent.evaluate_answer import model_decide, model_respond
from backend.src.agent.fine_tune import send_model
from backend.src.database.dao.message_dao import MessageDao
from backend.src.database.dao.session_dao import SessionDao
from backend.src.database.dao.user_dao import UserDao


@dataclass
class Decision:

    raw: str
    is_tool_call: bool
    call: str
    content: str

def parse(raw: str) -> Decision:
    return Decision(raw=raw, is_tool_call=False, call="Y", content="X")


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
            memory = self.user_dao.get_memory(session.user_id)

            # choose what to do
            raw = await model_decide(session, memory)
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
                current_memory = await self.user_dao.get_memory(session.user_id)
                if current_memory:
                    await self.user_dao.update_memory(session.user_id, current_memory + " | " + decision.content) # change memory store format later
                    continue
                await self.user_dao.update_memory(session.user_id, decision.content)  # change memory store format later


        if not session:
            session = await self.session_dao.get_session(self.session_id)

        memory = self.user_dao.get_memory(session.user_id)
        response = send_model(session, memory)
        return response




