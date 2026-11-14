import os

from fastapi import APIRouter, HTTPException, Request, status
from openrouter import OpenRouter
from pydantic import BaseModel

from ...agent import fine_tune as model
from ...agent.job import Job


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
    user_dao = request.app.state.user_dao
    s_hash = request.app.state.session_hash

    # ensures valid user login before usage
    cookie = request.cookies.get("Cookie")
    if cookie in s_hash:
        user_id = s_hash[cookie]
    else:
        raise HTTPException(status_code=401, detail="Invalid or missing authentication cookie")

    # make session name
    session_name = await get_session_name(message.message)

    # create new session for user with generated name
    session_id = await session_dao.create_session(user_id=user_id,
                                                  name=session_name,
                                                  context="",
                                                  tool_context="",
                                                  terminated=False)

    job = Job(message.message, message_dao, session_dao, user_dao, session_id, 20)
    response = await job.run()

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
        raise HTTPException(status_code=401, detail="Invalid or missing authentication cookie")
    
    session = await session_dao.get_session(session_id)
    return session.get_conversation_for_frontend()

@router.post("/{session_id}/message")
async def send_conversation_state(
    request : Request,
    session_id: str,
    message: Message
):
    """sends a message to session with {session_id}. Returns the agent's response."""
    message_dao = request.app.state.message_dao
    session_dao = request.app.state.session_dao
    user_dao = request.app.state.user_dao
    s_hash = request.app.state.session_hash

    # ensures valid user login before usage
    cookie = request.cookies.get("Cookie")
    if cookie not in s_hash:
        raise HTTPException(status_code=401, detail="Invalid or missing authentication cookie")

    job = Job(message.message, message_dao, session_dao, user_dao, session_id, 20)
    response = await job.run()

    # respond
    return {"response": response}

@router.post("/{session_id}/delete")
async def delete_session(
    request: Request,
    session_id: str
):
    """ deletes the session with the given session id. """
    session_dao = request.app.state.session_dao
    hash = request.app.state.session_hash

    # ensures valid user login before usage
    cookie = request.cookies.get("Cookie")
    if cookie not in hash: 
        raise HTTPException(status_code=401, detail="Invalid or missing authentication cookie")

    # deletes session from sessions
    await session_dao.del_session(session_id)

@router.get("/get_sessions")
async def get_session(
    request: Request
):
    """returns a list of session id and names according to the cookie of a logged in user.
       raises error if theres no valid user login."""
    session_dao = request.app.state.session_dao
    hash = request.app.state.session_hash
    
    # ensures valid user login before usage
    cookie = request.cookies.get("Cookie")
    if cookie not in hash: 
        raise HTTPException(status_code=401, detail="Invalid or missing authentication cookie")
    uuid = hash[cookie]

    # gets session id and names
    session_ids = await session_dao.get_session_ids(uuid)
    sessions = []
    for sid in session_ids:
        sessions.append({"session_id": sid[0], "session_name": sid[1]})
    
    return {"sessions": sessions}
    
async def get_session_name(msg: str) -> str:
    """returns a session name given an initial prompt."""
    # return "temp"

    async with OpenRouter(api_key=os.getenv("OPENROUTER_API_KEY")) as client:
        response = client.responses.send(
            model="google/gemini-3.8-flash", # Replace with any OpenRouter model ID
            input="Generate a short and simple chat title according to the request:" + msg
        )
        
        # Extract the text response
        for item in response.output:
            if item.type == "message":
                for part in item.content:
                    if part.type == "output_text":
                        print(part.text)
                        return part.text
        return "temp"