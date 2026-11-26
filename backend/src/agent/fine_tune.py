import asyncio
import json

import requests

from .context import ContextBuilder
from ..api.config import Settings
from ..database.model.session import Session

ENDPOINT_URL = "https://6ae1805fab20e518b003b166.endpoints.huggingface.cloud"

async def request_async(method: str, path: str, payload=None) -> dict:
    API_KEY = Settings().hf_token
    if not API_KEY:
        raise RuntimeError("HF_TOKEN is missing from the backend environment.")

    response = await asyncio.to_thread(
        requests.request,
        method,
        ENDPOINT_URL + path,
        headers={
            "Authorization": f"Bearer {API_KEY}",
            "Content-Type": "application/json",
        },
        json=payload,
        timeout=(10, 120),
    )

    if response.status_code in (401, 403):
        raise RuntimeError("Access denied. Check your Hugging Face sign-in or token.")

    if response.status_code == 503:
        raise RuntimeError(
            "Endpoint unavailable. Resume it if paused, then wait for Running."
        )

    response.raise_for_status()
    return response.json()


async def get_model_id() -> str:
    # Ask the server which model it actually loaded.
    data = await request_async("GET", "/v1/models")
    models = data.get("data", [])

    if not models or not models[0].get("id"):
        raise RuntimeError("The endpoint has not reported a loaded model.")

    return models[0]["id"]


async def model_reply(messages: list, model_id: str) -> str:
    data = await request_async(
        "POST",
        "/v1/chat/completions",
        {
            "model": model_id,
            "messages": messages,
            "max_tokens": 1000,
            "temperature": 0,
            "stream": False,
        },
    )

    choices = data.get("choices", [])
    answer = choices[0].get("message", {}).get("content") if choices else None

    if not isinstance(answer, str) or not answer.strip():
        raise RuntimeError("The model returned no text.")

    return answer


async def send_model(context_builder: ContextBuilder) -> str:
    model_id = await get_model_id()
    return await model_reply(await context_builder.build(), model_id)
