from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

class Message(BaseModel): # edit
    message: str 

router = APIRouter(
    prefix="/session",
    tags=["session"],
    responses={404: {"description": "Not found"}},
)

@router.post("/", status_code=status.HTTP_201_CREATED)
async def start_conversation_state():
    # return None # AI conversation logic needs to be done first
    # giving a temp session id to check everything works
    return {"session_id": 12345}

@router.get("/{session_id}")
async def get_conversation_state(
    session_id: str,
):
    return None

@router.post("/{session_id}/message")
async def send_conversation_state(
    session_id: str,
    message: Message
):
    # print msg received from frontend
    print(f"received from frontend: {message.message}")
    return {"status": "success", "received_message": message.message}