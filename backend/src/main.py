import asyncio
from contextlib import asynccontextmanager
from functools import lru_cache
from typing import Annotated
from uuid import uuid4

from fastapi import Depends, FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware

from .agent.worker import Worker
from .api.config import Settings
from .api.routers import health, login, session
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
    queue = asyncio.Queue()
    workers = []
    try:
        await pool.open(wait=True)
        app.state.pool = pool
        app.state.user_dao = UserDao(pool)
        app.state.message_dao = MessageDao(pool)
        app.state.session_dao = SessionDao(pool, app.state.message_dao)
        app.state.session_hash = {}
        app.state.job_queue = queue

        for _ in range(4):
            workers.append(asyncio.create_task(Worker(app.state.job_queue).run()))
        yield
    finally:
        # Stop all workers
        for worker in workers:
            worker.cancel()
        await asyncio.gather(*workers)

        # Clear all jobs from queue
        while not app.state.job_queue.empty():
            job = await app.state.job_queue.get()
            job.owner.cancel()
            app.state.job_queue.task_done()

        await pool.close()


app = FastAPI(lifespan=lifespan, title="SAM", description="empathic ai")

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_settings().cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(session.router)
app.include_router(login.router)


@app.get("/")
async def root(
    settings: Annotated[Settings, Depends(get_settings)],
    response: Response
    ):
    uuid = str(uuid4())
    response.set_cookie(key="Cookie", value=uuid)
    return {"cookie": uuid}
