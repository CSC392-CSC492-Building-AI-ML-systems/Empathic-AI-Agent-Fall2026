from contextlib import asynccontextmanager
from fastapi import FastAPI

from database.connection import create_pool
from database.dao.message_dao import MessageDao
from database.dao.session_dao import SessionDao
from database.dao.user_dao import UserDao


@asynccontextmanager
async def lifespan(app: FastAPI):
    pool = create_pool()
    app.state.pool = pool
    try:
        app.state.user_dao = UserDao(pool)
        app.state.message_dao = MessageDao(pool)
        app.state.session_dao = SessionDao(pool, app.state.message_dao)
        yield
    finally:
        pool.close()

app = FastAPI(lifespan=lifespan)

"""
    > session_dao = app.state.session_dao
    > message_dao = app.state.message_dao
    > user_dao = app.state.user_dao

    # User uses the website the first time and creates an account
    > user_id = user_dao.create_user("Muyao", "Yang", "muyao.yang@mail.utoronto.ca", "123456789", "", "Max")
    
    # User deletes their account
    > user_dao.del_user(user_id)
    
    # User creates named session (explicitly creating a named session)
    > session_dao.create_session(user_id, name)
    
    # User creates unnamed session (typing in welcome chat?)
    > session_id = session_dao.create_session(user_id, "New chat")
    > message_dao.add_message("USER", "yap yap yap", session_id)
    
    # User opens website and requests a list of past chats
    > session_ids = session_dao.get_session_ids(user_id)
    
    # User clicks on one of the past chats in the sidebar and website requests chat history
    > messages = message_dao.get_messages(session_id)
    
    # User deletes session and website forwards to backend
    > session_dao.del_session(session_id)
    
    
    # Backend wants to pack up conversation to send to llm
    > session = session_dao.get_session(session_id)
    > session.get_conversation_as_json()
"""

