from fastapi import APIRouter, Depends, HTTPException, status, Request
from pydantic import BaseModel
from ...agent import fine_tune as model
import uuid

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
    user_dao = request.app.state.user_dao
    session_dao = request.app.state.session_dao

    user_id = await user_dao.create_user("tyler", "holden", "fake2", "password", "tylerholden", "goat")
    session_id = await session_dao.create_session(user_id, "tylerholden")

    return {"session_id": str(session_id)}


@router.get("/{session_id}")
async def get_conversation_state(
    session_id: str,
):
    return None

@router.post("/{session_id}/message")
async def send_conversation_state(
    request : Request,
    session_id: str,
    message: Message
):
    message_dao = request.app.state.message_dao
    session_dao = request.app.state.session_dao

    # add user message to db
    await message_dao.add_message("user", message.message, session_id)

    # get session state
    conversation = await session_dao.get_session(session_id)
    convo_history = conversation.get_conversation_for_model()
    print(convo_history)

    # send session state to model and get response
    response = await model.send_model(convo_history)

    # add assistant response to db
    await message_dao.add_message("assistant", response, session_id)

    # respond
    return {"response": response}
