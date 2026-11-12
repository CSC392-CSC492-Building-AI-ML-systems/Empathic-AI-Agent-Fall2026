import uuid

from fastapi import APIRouter, Request, status
from pydantic import BaseModel

from ...agent.job import Job


class Message(BaseModel): # edit
    message: str 


router = APIRouter(
    prefix="/session",
    tags=["session"],
    responses={404: {"description": "Not found"}},
)

@router.get("/", status_code=status.HTTP_201_CREATED)
async def start_conversation_state(
    request : Request
):
    #user_dao = request.app.state.user_dao
    session_dao = request.app.state.session_dao

    TEST_USER_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")
    session_id = await session_dao.create_session(TEST_USER_ID, "", "", False, "tylerholden")
    return {"session_id": str(session_id)}


@router.get("/{session_id}")
async def get_conversation_state(
    session_id: str,
):
    return None

@router.post("/{session_id}/message")
async def send_conversation_state(request: Request, session_id: str, message: Message):

    message_dao = request.app.state.message_dao
    session_dao = request.app.state.session_dao
    user_dao = request.app.state.user_dao

    job = Job(message.message, message_dao, session_dao, user_dao, session_id, 10)
    result = await job.run()

    return {"response": result}
