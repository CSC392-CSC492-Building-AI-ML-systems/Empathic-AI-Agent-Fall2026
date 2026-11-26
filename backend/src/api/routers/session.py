import asyncio
import os
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from openrouter import OpenRouter
from pydantic import BaseModel

from ...agent.jobs import GenericJob
from ..dependencies.auth import get_current_user


class Message(BaseModel):
    message: str


router = APIRouter(
    prefix="/session",
    tags=["session"],
    responses={404: {"description": "Not found"}},
)


@router.post("/", status_code=status.HTTP_201_CREATED)
async def start_conversation_state(
        request: Request,
        message: Message,
        user_id: Annotated[UUID, Depends(get_current_user)]
):
    """starts a conversation with a message. Returns the agent's response and session id."""
    session_dao = request.app.state.session_dao

    # make session name
    session_name = await get_session_name(message.message)

    async with request.app.state.pool.connection() as conn, conn.cursor() as cursor:
        await cursor.execute("""
                                 SELECT id, email
                                 FROM public.users
                                 WHERE id = %s
                                 """, (user_id,))

    # create new session for user with generated name
    session_id = await session_dao.create_session(user_id,
                                                  name=session_name,
                                                  context="",
                                                  tool_context="",
                                                  terminated=False)

    response_future = asyncio.get_running_loop().create_future()
    job = GenericJob(
        message_dao=request.app.state.message_dao,
        session_dao=request.app.state.session_dao,
        user_dao=request.app.state.user_dao,
        response_future=response_future,
        queue=request.app.state.job_queue,
        session_id=UUID(str(session_id)),
        message=message.message,
    )
    await request.app.state.job_queue.put(job)
    #todo: Catch job RuntimeError
    response = await response_future

    return {"session_id": session_id, "response": response}


@router.post("/{session_id}")
async def get_conversation_state(
        session_id: UUID,
        request: Request,
        user_id: Annotated[UUID, Depends(get_current_user)]
):
    """ returns the session formatted for the frontend."""
    session_dao = request.app.state.session_dao
    session = await session_dao.get_session(session_id, include_full_history=True)

    # checks if session belongs to user
    if session is None or session.user_id != user_id:
        raise HTTPException(status_code=404, detail="Session not found")

    return session.get_conversation_for_frontend()


@router.post("/{session_id}/message")
async def send_conversation_state(
        request: Request,
        session_id: UUID,
        message: Message,
        user_id: Annotated[UUID, Depends(get_current_user)]
):
    """sends a message to session with {session_id}. Returns the agent's response."""
    session_dao = request.app.state.session_dao

    # checks if session belongs to user
    session = await session_dao.get_session(session_id)
    if session is None or session.user_id != user_id:
        raise HTTPException(status_code=404, detail="Session not found")

    response_future = asyncio.get_running_loop().create_future()
    job = GenericJob(
        message_dao=request.app.state.message_dao,
        session_dao=request.app.state.session_dao,
        user_dao=request.app.state.user_dao,
        response_future=response_future,
        queue=request.app.state.job_queue,
        session_id=UUID(str(session_id)),
        message=message.message,
    )
    await request.app.state.job_queue.put(job)
    #todo: Catch job RuntimeError
    response = await response_future

    # respond
    return {"response": response}


@router.post("/{session_id}/delete")
async def delete_session(
        request: Request,
        session_id: UUID,
        user_id: Annotated[UUID, Depends(get_current_user)]
):
    """ deletes the session with the given session id. """
    session_dao = request.app.state.session_dao

    # checks if session belongs to user
    session = await session_dao.get_session(session_id)
    if session is None or session.user_id != user_id:
        raise HTTPException(status_code=404, detail="Session not found")

    await session_dao.del_session(session_id)


@router.get("/get_sessions")
async def get_session(
        request: Request,
        user_id: Annotated[UUID, Depends(get_current_user)]
):
    """returns a list of session id and names according to the cookie of a logged in user.
       raises error if theres no valid user login."""
    session_dao = request.app.state.session_dao

    # gets session id and names
    session_ids = await session_dao.get_session_ids(user_id)
    sessions = []
    for sid in session_ids:
        sessions.append({"session_id": sid[0], "session_name": sid[1]})

    return {"sessions": sessions}


@router.get("/test-auth")
async def test_auth(
        user_id: Annotated[UUID, Depends(get_current_user)]
):
    return {"authenticated": True, "user_id": str(user_id)}


async def get_session_name(msg: str) -> str:
    """returns a session name given an initial prompt."""
    # return "temp"

    async with OpenRouter(api_key=os.getenv("OPENROUTER_API_KEY")) as client:
        response = client.responses.send(
            model="google/gemini-3.8-flash",  # Replace with any OpenRouter model ID
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
