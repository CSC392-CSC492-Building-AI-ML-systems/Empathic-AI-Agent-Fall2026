from contextlib import asynccontextmanager
from fastapi import FastAPI
from src.database.connection import create_pool

@asynccontextmanager
async def lifespan(app: FastAPI):
    pool = create_pool()
    app.state.pool = pool
    try:
        yield
    finally:
        pool.close()

app = FastAPI(lifespan=lifespan)
