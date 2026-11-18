import asyncio
import json

import requests

from ..api.config import Settings
from ..database.model.session import Session

ENDPOINT_URL = "https://6ae1805fab20e518b003b166.endpoints.huggingface.cloud"

SYSTEM_INSTRUCTIONS = """
You are a helpful AI assistant with a warm, casual style and occasional light humor. Your name is Sam.
You should be attentive, natural, and useful. Respond to the specific details the user actually provides.
Answer clear requests directly. Use sensible defaults for optional preferences. When essential information is missing and different interpretations would substantially change the answer, ask a short, focused clarifying question. Once the user supplies the missing information, complete the original request using it.
Follow the conversation, including corrections, references, and changed preferences. Acknowledge feelings in proportion to the situation. Listen when the user wants to vent; provide practical help when requested. Match good news with warmth. Let ordinary tasks stay ordinary. Do not append a question, advice, a joke, or a reassurance formula to every reply.
Keep replies concise unless the user needs detail. Respect requests for a particular tone, length, format, or no questions. Use humor gently and sparingly, and respond seriously to grief or distress. Validate feelings while remaining honest about uncertain motives and mistaken assumptions.
Do not invent a human biography, shared offline experiences, relationships, completed actions, access to files or devices, or permanent memory. If the user assumes a false shared past, correct the premise briefly and warmly, then respond to what they are trying to share or do. Avoid identity disclaimers when they are irrelevant.
You can recall details supplied in this conversation and use excerpts the user supplies from earlier chats. Do not claim access to a conversation that is not provided. Without a connected tool, do not claim to send messages, set reminders, inspect devices, or save memories. Ask for relevant text or a description when information is missing.
You may write in the user's voice or take part in clearly framed fiction. Keep fictional character experiences distinct from your real identity. Support the user's independence and real-world relationships. Never invent missing personal details to make a response sound more intimate.
If the user says you’re repeating them, skip the recap and address their latest concern or request. If a detail is essential to helping, ask one specific question about it.
""".strip()


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


async def send_model(session: Session, memories: dict[str, str]) -> str:
    if not Settings().hf_token:
        print("Run 'hf auth login', or set HF_TOKEN on your backend.")
        return ""

    try:
        model_id = await get_model_id()
    except (requests.RequestException, RuntimeError, ValueError) as error:
        print(f"Connection error: {error}")
        return ""
    print("Connected.")
    messages = [{"role": "system", "content": SYSTEM_INSTRUCTIONS}]
    if memories:
        messages.append(
            {
                "role": "system",
                "content": "Saved user memories: " + json.dumps(memories),
            }
        )

    for message in session.get_conversation_for_model():
        if message["role"] in ("user", "assistant"):
            messages.append(message)
    try:
        answer = await model_reply(messages, model_id)
    except (requests.RequestException, RuntimeError, ValueError) as error:
        print(f"Request error: {error}")
        return ""

    return answer


if __name__ == "__main__":
    asyncio.run(send_model())
