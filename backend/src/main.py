from contextlib import asynccontextmanager
from functools import lru_cache
from typing import Annotated

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api.config import Settings
from .api.routers import health, session
from .database.connection import create_pool
from .database.dao.message_dao import MessageDao
from .database.dao.session_dao import SessionDao
from .database.dao.user_dao import UserDao


@lru_cache
def get_settings() -> Settings:
    return Settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    pool = create_pool()
    try:
        await pool.open(wait=True)
        app.state.pool = pool
        app.state.user_dao = UserDao(pool)
        app.state.message_dao = MessageDao(pool)
        app.state.session_dao = SessionDao(pool, app.state.message_dao)
        yield
    finally:
        await pool.close()


app = FastAPI(lifespan=lifespan, title="SAM", description="empathic ai")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        str(origin).strip().rstrip("/")
        for origin in get_settings().cors_origins
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(session.router)


@app.get("/")
async def root(settings: Annotated[Settings, Depends(get_settings)]):
    return {"name": settings.app_name}
