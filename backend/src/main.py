from functools import lru_cache
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import Annotated

from .api import config
from .api.routers import health, session

app = FastAPI(
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


