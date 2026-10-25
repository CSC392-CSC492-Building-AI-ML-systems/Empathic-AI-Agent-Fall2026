import asyncio
import json
from collections.abc import Callable
from pathlib import Path

import httpx
import pytest

from backend.src.eval.llm import (
    PROVIDER_URLS,
    LLMClient,
    LLMError,
    LLMResponse,
    LLMSettings,
    OpenAICompatibleClient,
)
from backend.src.eval.mock import MockLLMClient

Handler = Callable[[httpx.Request], httpx.Response]
HELLO = [{"role": "user", "content": "hello"}]


def make_settings(**overrides: str) -> LLMSettings:
    # model_validate skips .env and environment lookups, so tests stay isolated
    values = {"provider": "openrouter", "model": "test-model", "llm_api_key": "sk-test"}
    return LLMSettings.model_validate({**values, **overrides})


def make_client(handler: Handler, **overrides: str) -> OpenAICompatibleClient:
    return OpenAICompatibleClient(
        make_settings(**overrides),
        transport=httpx.MockTransport(handler),
        backoff_s=0,
    )


def ok(text: str = "hi there") -> httpx.Response:
    return httpx.Response(
        200,
        json={
            "model": "test-model",
            "choices": [{"message": {"role": "assistant", "content": text}}],
            "usage": {"prompt_tokens": 5, "completion_tokens": 2},
        },
    )


def complete(client: OpenAICompatibleClient, **kwargs: object) -> LLMResponse:
    async def run() -> LLMResponse:
        async with client:
            return await client.complete(HELLO, **kwargs)  # type: ignore[arg-type]

    return asyncio.run(run())


# Settings


@pytest.mark.parametrize("provider", list(PROVIDER_URLS))
def test_each_provider_has_a_default_url(provider: str) -> None:
    """PROVIDER alone should be enough to know where to send requests"""
    assert make_settings(provider=provider).base_url() == PROVIDER_URLS[provider]


def test_base_url_override_wins() -> None:
    """LLM_BASE_URL is how we'll point at a self-hosted model later"""
    settings = make_settings(llm_base_url="http://gpu-box:8000/v1/")
    assert settings.base_url() == "http://gpu-box:8000/v1"


def test_unknown_provider_errors() -> None:
    """A typo in PROVIDER should fail loudly instead of guessing a URL"""
    with pytest.raises(LLMError, match="Unknown PROVIDER"):
        make_settings(provider="openroutr").base_url()


def test_settings_come_from_env(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    """Values set in the environment get picked up, and blank ones are ignored"""
    monkeypatch.chdir(tmp_path)  # so a real .env in the repo isn't read
    monkeypatch.setenv("PROVIDER", "")
    monkeypatch.setenv("MODEL", "some/model")
    settings = LLMSettings()
    assert settings.provider == "openrouter"
    assert settings.model == "some/model"


def test_missing_key_errors() -> None:
    """Hosted providers need a key, and it's better to find out right away"""
    with pytest.raises(LLMError, match="LLM_API_KEY"):
        OpenAICompatibleClient(make_settings(llm_api_key=""))


def test_local_provider_needs_no_key() -> None:
    """Ollama runs locally, so no key should be fine"""
    OpenAICompatibleClient(make_settings(provider="ollama", llm_api_key=""))


# Requests and responses


def test_request_shape_and_parsed_response() -> None:
    """Checks what actually gets sent, and that the reply is read back properly"""
    seen: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        seen.append(request)
        return ok()

    reply = complete(make_client(handler), temperature=0.7, json_mode=True)

    request = seen[0]
    body = json.loads(request.content)
    assert str(request.url) == "https://openrouter.ai/api/v1/chat/completions"
    assert request.headers["Authorization"] == "Bearer sk-test"
    assert body["model"] == "test-model"
    assert body["messages"] == HELLO
    assert body["temperature"] == 0.7
    assert body["response_format"] == {"type": "json_object"}

    assert reply.text == "hi there"
    assert (reply.input_tokens, reply.output_tokens) == (5, 2)


def test_model_argument_overrides_settings() -> None:
    """Passing a model per call (e.g. for a judge) beats MODEL from .env"""
    seen: list[str] = []

    def handler(request: httpx.Request) -> httpx.Response:
        seen.append(json.loads(request.content)["model"])
        return ok()

    complete(make_client(handler), model="other/model")
    assert seen == ["other/model"]


def test_missing_model_errors() -> None:
    """No model anywhere means we can't make a call at all"""
    with pytest.raises(LLMError, match="MODEL"):
        complete(make_client(lambda _: ok(), model=""))


@pytest.mark.parametrize("text", ["", "   "])
def test_empty_reply_errors(text: str) -> None:
    """An empty reply is a failure, not a valid answer"""
    with pytest.raises(LLMError, match="no text"):
        complete(make_client(lambda _: ok(text)))


def test_out_of_tokens_says_so() -> None:
    """Reasoning models can burn through max_tokens, so the error should hint at that"""
    response = httpx.Response(
        200,
        json={"choices": [{"message": {"content": None}, "finish_reason": "length"}]},
    )
    with pytest.raises(LLMError, match="max_tokens"):
        complete(make_client(lambda _: response))


def test_non_json_response_errors() -> None:
    """A proxy's HTML error page should turn into an LLMError, not a JSON crash"""
    response = httpx.Response(200, text="<html>Bad Gateway</html>")
    with pytest.raises(LLMError, match="wasn't JSON"):
        complete(make_client(lambda _: response))


def test_null_model_falls_back() -> None:
    """If the provider sends back "model": null, we still know what we asked for"""
    response = ok()
    body = json.loads(response.content)
    body["model"] = None
    reply = complete(make_client(lambda _: httpx.Response(200, json=body)))
    assert reply.model == "test-model"


def test_error_in_body_errors() -> None:
    """Some providers send errors back with a 200, so those need catching too"""
    response = httpx.Response(200, json={"error": {"message": "bad model"}})
    with pytest.raises(LLMError, match="bad model"):
        complete(make_client(lambda _: response))


# Retries


def test_retries_rate_limits_and_server_errors() -> None:
    """A 429 or any 5xx should be retried, and the eventual success returned"""
    responses = iter([httpx.Response(429), httpx.Response(529), ok()])
    calls = 0

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal calls
        calls += 1
        return next(responses)

    assert complete(make_client(handler)).text == "hi there"
    assert calls == 3


def test_retries_timeouts() -> None:
    """Timeouts are worth retrying too"""
    calls = 0

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal calls
        calls += 1
        if calls == 1:
            raise httpx.ReadTimeout("timed out", request=request)
        return ok()

    assert complete(make_client(handler)).text == "hi there"
    assert calls == 2


def test_gives_up_after_max_retries() -> None:
    """Eventually it has to stop retrying and report the failure"""
    calls = 0

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal calls
        calls += 1
        return httpx.Response(503)

    with pytest.raises(LLMError, match="Gave up after 4 attempts"):
        complete(make_client(handler))
    assert calls == 4


def test_client_errors_are_not_retried() -> None:
    """A bad key won't fix itself, so a 401 should fail on the first try"""
    calls = 0

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal calls
        calls += 1
        return httpx.Response(401, text="invalid key")

    with pytest.raises(LLMError, match="401"):
        complete(make_client(handler))
    assert calls == 1


# Mock client


def test_mock_replies_in_order_and_records_calls(mock_llm: MockLLMClient) -> None:
    """The mock hands out scripted replies one by one and remembers each call"""
    mock_llm.add_replies("first", "second")
    client: LLMClient = mock_llm

    async def run() -> list[str]:
        a = await client.complete(HELLO)
        b = await client.complete(HELLO, model="judge", json_mode=True)
        return [a.text, b.text]

    assert asyncio.run(run()) == ["first", "second"]
    assert len(mock_llm.calls) == 2
    assert mock_llm.calls[1].model == "judge"
    assert mock_llm.calls[1].json_mode is True


def test_mock_runs_out_of_replies(mock_llm: MockLLMClient) -> None:
    """Running out of replies should be a clear error, not a silent default"""
    with pytest.raises(RuntimeError, match="ran out"):
        asyncio.run(mock_llm.complete(HELLO))


def test_mock_rejects_single_string() -> None:
    """MockLLMClient("hi") would otherwise reply "h" then "i", which is never what you want"""
    with pytest.raises(TypeError):
        MockLLMClient("hi")


def test_mock_with_reply_function() -> None:
    """A function can build replies from the messages, handy for longer chats"""
    mock = MockLLMClient(lambda messages: messages[-1]["content"].upper())
    assert asyncio.run(mock.complete(HELLO)).text == "HELLO"


def test_real_client_matches_protocol() -> None:
    """The real client has to fit LLMClient too (mypy checks this line)"""
    client: LLMClient = make_client(lambda _: ok())
    assert client is not None
