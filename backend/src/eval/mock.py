"""Fake LLM client for tests, so the harness never needs the network"""

from collections import deque
from collections.abc import Callable, Iterable
from dataclasses import dataclass

from .llm import LLMResponse, Messages


@dataclass
class RecordedCall:
    """One call the mock received, so tests can check what was sent"""

    messages: Messages
    model: str | None
    temperature: float
    max_tokens: int
    json_mode: bool


class MockLLMClient:
    """Returns scripted replies in order, or builds them with a function

    Pass a list of strings to reply with them one by one, or a function that
    takes the messages and returns the reply text.
    """

    def __init__(self, replies: Iterable[str] | Callable[[Messages], str] = ()) -> None:
        if isinstance(replies, str):
            raise TypeError("Pass a list of replies, not a single string")
        self.calls: list[RecordedCall] = []
        self._reply_fn = replies if callable(replies) else None
        self._replies: deque[str] = deque() if callable(replies) else deque(replies)

    def add_replies(self, *replies: str) -> None:
        self._replies.extend(replies)

    async def complete(
        self,
        messages: Messages,
        *,
        model: str | None = None,
        temperature: float = 0.0,
        max_tokens: int = 1024,
        json_mode: bool = False,
    ) -> LLMResponse:
        self.calls.append(
            RecordedCall(messages, model, temperature, max_tokens, json_mode)
        )
        if self._reply_fn is not None:
            text = self._reply_fn(messages)
        elif self._replies:
            text = self._replies.popleft()
        else:
            raise RuntimeError(
                f"MockLLMClient ran out of scripted replies (call #{len(self.calls)})"
            )
        return LLMResponse(text=text, model=model or "mock", latency_s=0.0)
