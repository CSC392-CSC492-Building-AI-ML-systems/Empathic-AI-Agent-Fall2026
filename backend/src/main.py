from contextlib import asynccontextmanager
from fastapi import FastAPI
from src.database.connection import create_pool
from src.database.dao.session_dao import ConversationDao

@asynccontextmanager
async def lifespan(app: FastAPI):
    pool = create_pool()
    app.state.pool = pool
    try:
        app.state.dao = ConversationDao(pool)
        yield
    finally:
        pool.close()

app = FastAPI(lifespan=lifespan)

"""
    EXAMPLE USAGE!!!

    dao = request.app.state.dao

    session_id = dao.create_session()
    dao.add_message("USER", "Where should we go out to eat?", session_id)
    dao.add_message("AGENT", "Where do you live", session_id, "CLARIFY")
    
    session = dao.get_conversation(session_id)
    for message in session.messages:
        # do stuff
"""