from fastapi import APIRouter, Request, status
from pydantic import BaseModel
import os
from openrouter import OpenRouter


from ...agent import fine_tune as model


class Message(BaseModel): 
    message: str 


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
    """starts a conversation with a message. Returns the agent's response and session id."""
    session_dao = request.app.state.session_dao
    message_dao = request.app.state.message_dao
    hash = request.app.state.session_hash

    # ensures valid user login before usage
    cookie = request.cookies.get("Cookie")
    if cookie in hash:
        user_id = hash[cookie]
    else:
        return {"session_id": "ERROR: unverified cookie", "response": None}

    # make session name
    session_name = await get_session_name()

    # create new session for user with generated name
    session_id = await session_dao.create_session(user_id, session_name)

    # add message to session
    await message_dao.add_message("user", message.message, session_id)

    # get response from agent and add message to session
    response = await model.send_model([{"role": "user", "content": message.message}])
    await message_dao.add_message("assistant", response, session_id)

    return {"session_id": session_id, "response": response}


@router.post("/{session_id}")
async def get_conversation_state(
    session_id: str,
    request: Request
):
    """ returns the session formatted for the frontend."""
    session_dao = request.app.state.session_dao
    hash = request.app.state.session_hash

    # ensures valid user login before usage
    cookie = request.cookies.get("Cookie")
    if cookie not in hash:
        return {"conversation": "ERROR: unverified cookie"}
    
    session = await session_dao.get_session(session_id)
    return session.get_conversation_for_frontend(session_id)

@router.post("/{session_id}/message")
async def send_conversation_state(
    request : Request,
    session_id: str,
    message: Message
):
    """sends a message to session with {session_id}. Returns the agent's response."""
    message_dao = request.app.state.message_dao
    session_dao = request.app.state.session_dao
    hash = request.app.state.session_hash

    # ensures valid user login before usage
    cookie = request.cookies.get("Cookie")
    if cookie not in hash:
        return {"conversation": "ERROR: unverified cookie"}
    

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

@router.post("/{session_id}/delete")
async def delete_session(
    request: Request,
    session_id: str
):
    session_dao = request.app.state.session_dao
    hash = request.app.state.session_hash

    # ensures valid user login before usage
    cookie = request.cookies.get("Cookie")
    if cookie not in hash:
        return {"conversation": "ERROR: unverified cookie"}

    # deletes session from sessions
    await session_dao.del_session(session_id)
    
async def get_session_name(msg: str) -> str:
    """returns a session name given an initial prompt."""
    return "temp"
    api_key = os.getenv("OPENROUTER_API_KEY", "your_api_key_here")

    with OpenRouter(api_key=api_key) as open_router:
    # Send a prompt and handle a streaming response
        event_stream = open_router.chat.send(
            model="openai/gpt-4.1-mini",
            messages=[
                {"role": "user", "content": msg}
            ],
            stream=True
    )
    
    for event in event_stream:
        # Process and print each chunk as it arrives
        print(event, end="", flush=True)