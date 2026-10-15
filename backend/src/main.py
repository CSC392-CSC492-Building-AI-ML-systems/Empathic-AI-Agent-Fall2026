from contextlib import asynccontextmanager
from fastapi import FastAPI
from src.database.connection import create_pool
from src.database.dao.session_dao import ConversationDao
from functools import lru_cache
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import Annotated

from .api import config
from .api.routers import health, session

@asynccontextmanager
async def lifespan(app: FastAPI):
    pool = create_pool()
    app.state.pool = pool
    try:
        app.state.dao = ConversationDao(pool)
        yield
    finally:
        pool.close()

app = FastAPI(
    lifespan=lifespan.
    title="clarifai",
    description="empathic ai"
)

origins = [
    "http://localhost",
    "http://localhost:8080",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(session.router)

@lru_cache
async def get_settings():
    return config.Settings()

@app.get("/")
async def root(settings: Annotated[config.Settings, Depends(get_settings)]):
    return { "name": settings.app_name}


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
