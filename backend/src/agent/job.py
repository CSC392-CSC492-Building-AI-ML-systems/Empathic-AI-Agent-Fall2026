from dataclasses import dataclass
from typing import Callable
from uuid import UUID

from backend.src.agent.evaluate_answer import model_decide, model_respond
from backend.src.database.dao.message_dao import MessageDao
from backend.src.database.dao.session_dao import SessionDao

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
    action: Callable
    session_id: UUID
    turns: int = 0

    def __init__(self, message, message_dao, session_dao, session_id):

        self.message = message
        self.session_dao = session_dao
        self.message_dao = message_dao
        self.session_id = session_id

    async def run(self):

        await self.message_dao.add_message("user", self.message, self.session_id)

        while True:

            if self.turns > 10:
                break

            session = await self.session_dao.get_session(self.session_id)

            # choose what to do
            raw = await model_decide(session)
            decision = parse(raw)

            if not decision:
                break # should do something else later

            if decision.is_tool_call:
                await self.message_dao.add_message("tool", decision.raw, self.session_id)

                if decision.call == "TERMINATE-SESSION":
                    #await _terminate_session(self.session_id)
                    return -1

                elif decision.call == "WEBSEARCH":
                    # result = await _websearch()
                    # add result to session context
                    pass

                elif decision.call == "SAVE-TO-MEMORY":
                    # await _save_memory(decision.content)
                    pass

                #elif some other tool
                #    pass

                self.turns += 1
                continue

            break

        response = model_respond(session)
        return response




