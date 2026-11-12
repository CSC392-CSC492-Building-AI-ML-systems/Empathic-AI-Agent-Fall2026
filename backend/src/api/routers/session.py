from fastapi import APIRouter, Request, status
from pydantic import BaseModel
import os
from openrouter import OpenRouter


from ...agent import fine_tune as model


class Message(BaseModel): 
    message: str 

class Session_Id(BaseModel):
    id: str


router = APIRouter(
    prefix="/session",
    tags=["session"],
    responses={404: {"description": "Not found"}},
)

@router.post("/", status_code=status.HTTP_201_CREATED)
async def start_conversation_state(
    request : Request,
    message : Message
):
    session_dao = request.app.state.session_dao
    message_dao = request.app.state.message_dao
    hash = request.app.state.session_hash

    cookie = request.cookies.get("Cookie")
    if (cookie):
        user_id = hash[cookie]
    else:
        return {"session_id": "unverified cookie"}

    # make session name
    session_name = get_session_name()

    # TEST_USER_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")
    session_id = await session_dao.create_session(user_id, session_name)

    await message_dao.add_message("user", message.message, session_id)

    response = await model.send_model([{"role": "user", "content": message.message}])
    await message_dao.add_message("assistant", response, session_id)

    return {"session_id": session_id, "response": response}


@router.post("/{session_id}")
async def get_conversation_state(
    session_id: str,
    request: Request
):
    session_dao = request.app.state.session_dao
    session = await session_dao.get_session(session_id.id)
    return session.get_conversation_for_frontend(session_id.id)

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

    # send session state to model and get response
    response = await model.send_model(convo_history)
    if (response == None):
        response = ""

    # add assistant response to db
    await message_dao.add_message("assistant", response, session_id)

    # respond
    return {"response": response}

async def get_session_name() -> str:
    # return "temp"
    # Ensure you have set your OPENROUTER_API_KEY environment variable
    api_key = os.getenv("OPENROUTER_API_KEY", "your_api_key_here")

    with OpenRouter(api_key=api_key) as open_router:
    # Send a prompt and handle a streaming response
        event_stream = open_router.chat.send(
            model="anthropic/claude-3.5-sonnet", # Replace with your choice of model
            messages=[
                {"role": "user", "content": "Explain quantum computing in one sentence."}
            ],
            stream=True
    )
    
    for event in event_stream:
        # Process and print each chunk as it arrives
        print(event, end="", flush=True)