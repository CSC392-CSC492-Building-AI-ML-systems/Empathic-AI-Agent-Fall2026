from fastapi import APIRouter, Depends, HTTPException, status

router = APIRouter(
    prefix="/session",
    tags=["session"],
    responses={404: {"description": "Not found"}},
)

@router.post("/", status_code=status.HTTP_201_CREATED)
async def send_conversation_state():
    return None # AI conversation logic needs to be done first