import asyncio
import os

import requests
from huggingface_hub import get_token

ENDPOINT_URL = "https://6ae1805fab20e518b003b166.endpoints.huggingface.cloud"

# Hugging Face credentials, not your OpenRouter key.
API_KEY = (os.getenv("HF_TOKEN", "").strip() or get_token() or "").strip()

SYSTEM_INSTRUCTIONS = """
You are a helpful conversational assistant. Be warm, natural, and concise.

Use the full conversation, including the user's answers to earlier questions.
Answer directly when there is enough information to give a useful answer.
Use reasonable defaults for optional preferences.

If essential information is missing and different interpretations would
substantially change the answer, ask a short, specific clarifying question.
After the user clarifies, answer their original request.
Do not invent missing facts or ask questions just to keep the conversation going.

Keep related follow-ups in the same conversation.
For a clearly unrelated topic, briefly suggest a new chat as an option,
and still help with the new request. Never require another chat.
If the user prefers to stay, continue without repeating the suggestion.
Do not claim to be human or to have opened a new chat.
""".strip()


async def request_async(method: str, path: str, payload=None) -> dict:
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
            "max_tokens": 500,
            "temperature": 0,
            "stream": False,
        },
    )

    choices = data.get("choices", [])
    answer = choices[0].get("message", {}).get("content") if choices else None

    if not isinstance(answer, str) or not answer.strip():
        raise RuntimeError("The model returned no text.")

    return answer


async def send_model(messages: list) -> list:
    if not API_KEY:
        print("Run 'hf auth login', or set HF_TOKEN on your backend.")
        return

    try:
        model_id = await get_model_id()
    except (requests.RequestException, RuntimeError, ValueError) as error:
        print(f"Connection error: {error}")
        return
    print("Connected.")
    messages.insert(0, [{"role": "system", "content": SYSTEM_INSTRUCTIONS}])

    try:
        answer = await model_reply(messages, model_id)
    except (requests.RequestException, RuntimeError, ValueError) as error:
        print(f"Request error: {error}")
        return

    return answer


if __name__ == "__main__":
    asyncio.run(send_model())
