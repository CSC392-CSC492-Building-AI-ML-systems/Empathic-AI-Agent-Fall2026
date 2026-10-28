from fastapi import APIRouter, Depends, HTTPException, status, Request
from pydantic import BaseModel
from ...agent import AIevalutate_answer as model
from uuid import UUID, uuid4

class Message(BaseModel): # edit
    message: str 

router = APIRouter(
    prefix="/session",
    tags=["session"],
    responses={404: {"description": "Not found"}},
)

@router.post("/", status_code=status.HTTP_201_CREATED)
async def start_conversation_state(
    request : Request
):
    user_dao = request.app.state.user_dao
    session_dao = request.app.state.session_dao

    user_id = await user_dao.create_user("tyler", "holden", "fake", "password", "tylerholden", "goat")
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
    session_dao = request.app.state.session_dao

    # give message to max

    #assume session_dao.get_session.get_conversation_as_json gets the conversation history (obvious?)
    convo_history = session_dao.get_session(session_id).get_conversation_as_json # list of dictionaries

    response = edwardsfunction(convo_history)
    
    # give message + response + specifications to max

    return None