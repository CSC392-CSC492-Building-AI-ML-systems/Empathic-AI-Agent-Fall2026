"""Swappable LLM access for the eval harness.

Which model and provider get called is set in `.env` (PROVIDER, MODEL,
LLM_API_KEY, optional LLM_BASE_URL), so moving from a hosted model to a
self-hosted fine-tuned one is a config change, not a code change. Anything
that speaks the OpenAI-style `/chat/completions` API works.

Manual smoke test (uses your real .env, never run in CI):
    uv run python -m backend.src.eval.llm "hello"
"""

import asyncio
import sys
import time
from types import TracebackType
from typing import Protocol, Self

import httpx
from pydantic import BaseModel
from pydantic_settings import BaseSettings, SettingsConfigDict

PROVIDER_URLS = {
    "openrouter": "https://openrouter.ai/api/v1",
    "openai": "https://api.openai.com/v1",
    "ollama": "http://localhost:11434/v1",
}
LOCAL_PROVIDERS = {"ollama"}
RETRYABLE_STATUS = {408, 409, 429}  # plus every 5xx

Messages = list[dict[str, str]]


class LLMError(RuntimeError):
    """Something went wrong talking to the model"""


class LLMSettings(BaseSettings):
    """Model/provider config, read from .env or the environment"""

    provider: str = "openrouter"
    model: str | None = None
    llm_api_key: str | None = None
    llm_base_url: str | None = None  # overrides the provider's default URL

    model_config = SettingsConfigDict(
        env_file=".env", extra="ignore", env_ignore_empty=True
    )

    def base_url(self) -> str:
        if self.llm_base_url:
            return self.llm_base_url.rstrip("/")
        try:
            return PROVIDER_URLS[self.provider.lower()]
        except KeyError:
            known = ", ".join(PROVIDER_URLS)
            raise LLMError(
                f"Unknown PROVIDER {self.provider!r}. Use one of {known}, "
                "or set LLM_BASE_URL"
            ) from None

    def needs_api_key(self) -> bool:
        # A custom URL is usually a self-hosted server, which may not use keys
        return (
            self.llm_base_url is None and self.provider.lower() not in LOCAL_PROVIDERS
        )


class LLMResponse(BaseModel):
    """What the model said, plus the details run logs care about"""

    text: str
    model: str
    input_tokens: int | None = None
    output_tokens: int | None = None
    latency_s: float


class LLMClient(Protocol):
    """Anything the harness can send a chat to"""

    async def complete(
        self,
        messages: Messages,
        *,
        model: str | None = None,
        temperature: float = 0.0,
        max_tokens: int = 1024,
        json_mode: bool = False,
    ) -> LLMResponse: ...


class OpenAICompatibleClient:
    """Talks to any OpenAI-style chat completions endpoint"""

    def __init__(
        self,
        settings: LLMSettings | None = None,
        *,
        max_retries: int = 3,
        backoff_s: float = 1.0,
        timeout_s: float = 60.0,
        transport: httpx.AsyncBaseTransport | None = None,
    ) -> None:
        self.settings = settings or LLMSettings()
        self.max_retries = max_retries
        self.backoff_s = backoff_s

        headers = {}
        if self.settings.llm_api_key:
            headers["Authorization"] = f"Bearer {self.settings.llm_api_key}"
        elif self.settings.needs_api_key():
            raise LLMError(
                f"LLM_API_KEY is not set (needed for PROVIDER={self.settings.provider})"
            )

        self._http = httpx.AsyncClient(
            base_url=self.settings.base_url(),
            headers=headers,
            timeout=timeout_s,
            transport=transport,
        )

    async def complete(
        self,
        messages: Messages,
        *,
        model: str | None = None,
        temperature: float = 0.0,
        max_tokens: int = 1024,
        json_mode: bool = False,
    ) -> LLMResponse:
        model = model or self.settings.model
        if not model:
            raise LLMError("No model given and MODEL is not set in .env")

        payload: dict[str, object] = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        if json_mode:
            payload["response_format"] = {"type": "json_object"}

        response, latency_s = await self._post(payload)
        try:
            data = response.json()
        except ValueError:
            raise LLMError(
                f"Response wasn't JSON (HTTP {response.status_code}): "
                f"{response.text[:200]}"
            ) from None
        if not isinstance(data, dict):
            raise LLMError(f"Unexpected response shape: {data}")
        if data.get("error"):
            raise LLMError(f"Provider returned an error: {data['error']}")

        try:
            choice = data["choices"][0]
            text = choice["message"].get("content")
        except (KeyError, IndexError, TypeError):
            raise LLMError(f"Unexpected response shape: {data}") from None
        if not isinstance(text, str) or not text.strip():
            # Reasoning models can spend the whole max_tokens budget thinking
            reason = choice.get("finish_reason")
            hint = " (hit max_tokens, try raising it)" if reason == "length" else ""
            raise LLMError(f"Model returned no text{hint}")

        usage = data.get("usage") or {}
        return LLMResponse(
            text=text,
            model=data.get("model") or model,
            input_tokens=usage.get("prompt_tokens"),
            output_tokens=usage.get("completion_tokens"),
            latency_s=latency_s,
        )

    async def _post(self, payload: dict[str, object]) -> tuple[httpx.Response, float]:
        """POST with retries on rate limits, server errors and timeouts

        Also returns how long the successful attempt took, so retries and
        backoff waits don't make a model look slower than it is.
        """
        last_error: Exception | None = None
        for attempt in range(self.max_retries + 1):
            start = time.perf_counter()
            try:
                response = await self._http.post("/chat/completions", json=payload)
            except httpx.TransportError as exc:  # includes timeouts
                last_error = exc
            else:
                status = response.status_code
                if status not in RETRYABLE_STATUS and status < 500:
                    if response.is_error:
                        raise LLMError(f"HTTP {status}: {response.text[:500]}")
                    return response, time.perf_counter() - start
                last_error = LLMError(
                    f"HTTP {response.status_code}: {response.text[:200]}"
                )
            if attempt < self.max_retries:
                await asyncio.sleep(self.backoff_s * 2**attempt)
        raise LLMError(
            f"Gave up after {self.max_retries + 1} attempts: {last_error}"
        ) from last_error

    async def aclose(self) -> None:
        await self._http.aclose()

    async def __aenter__(self) -> Self:
        return self

    async def __aexit__(
        self,
        exc_type: type[BaseException] | None,
        exc: BaseException | None,
        tb: TracebackType | None,
    ) -> None:
        await self.aclose()


async def _smoke_test(prompt: str) -> None:
    async with OpenAICompatibleClient() as client:
        reply = await client.complete([{"role": "user", "content": prompt}])
    print(reply.text)
    print(
        f"\n[{reply.model} | {reply.latency_s:.1f}s | "
        f"in={reply.input_tokens} out={reply.output_tokens}]"
    )


if __name__ == "__main__":
    asyncio.run(_smoke_test(" ".join(sys.argv[1:]) or "Say hello."))
