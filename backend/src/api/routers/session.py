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
    return None # AI conversation logic needs to be done first

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
    return None