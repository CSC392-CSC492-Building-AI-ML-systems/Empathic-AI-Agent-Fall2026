"""Labels a plain text reply as asking a clarifying question or answering

The model under test just replies with text, so before it can be scored a
separate model reads each reply and labels it "clarify" or "answer". The rules
it follows are in prompts/labeller_<version>.md, and they match the mixed
replies rule in dataset/README.md.

The labeller is a fixed model that's set on purpose, never the model being
tested, so its model is always passed in and never read from MODEL in .env.
"""

import json
import re
from typing import get_args

from pydantic import BaseModel

from ..clarification import Kind, Turn
from .agents import LabellerInfo, Prompt
from .llm import LLMClient, Messages

KINDS: tuple[str, ...] = get_args(Kind)
SPEAKERS = {"user": "User", "assistant": "Assistant"}
CODE_FENCE = re.compile(r"^```(?:json)?\s*(.*?)\s*```$", re.DOTALL)


class LabelError(RuntimeError):
    """The labeller didn't give back a usable label"""


class Label(BaseModel):
    """A reply's kind, and the labeller's reason for it"""

    kind: Kind
    reason: str


def format_conversation(history: list[Turn], reply: str) -> str:
    """The conversation and the reply to label, as one block of text

    The labeller gets this as a single message instead of real chat turns, so
    it reads the conversation rather than joining in.
    """
    transcript = "\n\n".join(
        f"{SPEAKERS[turn.role]}: {turn.content}" for turn in history
    )
    return (
        f"<conversation>\n{transcript}\n</conversation>\n\n"
        f"The assistant's next reply, to label:\n\n<reply>\n{reply}\n</reply>"
    )


def parse_label(text: str) -> Label:
    """Reads the labeller's JSON, with or without a code fence around it"""
    text = text.strip()
    fenced = CODE_FENCE.match(text)
    if fenced:
        text = fenced.group(1)

    try:
        data = json.loads(text)
    except ValueError:
        raise LabelError(f"Labeller didn't reply with JSON: {text[:200]!r}") from None
    if not isinstance(data, dict):
        raise LabelError(f"Labeller should reply with a JSON object, got: {data!r}")

    kind = data.get("kind")
    if isinstance(kind, str):
        kind = kind.strip().lower()
    if kind not in KINDS:
        raise LabelError(f"kind should be clarify or answer, got {kind!r}")

    reason = data.get("reason")
    return Label.model_validate(
        {"kind": kind, "reason": reason.strip() if isinstance(reason, str) else ""}
    )


class LLMLabeller:
    """Asks a fixed model whether a reply asks or answers

    If the model's output can't be read, it tries once more and then raises
    LabelError. Errors from the model client are not caught, so the runner
    can count them.
    """

    def __init__(
        self,
        llm: LLMClient,
        model: str,
        prompt: Prompt,
        *,
        max_tokens: int = 512,
        attempts: int = 2,
    ) -> None:
        if not model.strip():
            raise ValueError("The labeller needs a model, and it can't be MODEL")
        if prompt.name != "labeller":
            raise ValueError(f"Expected a labeller prompt, got a {prompt.name} one")
        if attempts < 1:
            raise ValueError("attempts must be at least 1")

        self.llm = llm
        self.model = model
        self.prompt = prompt
        self.max_tokens = max_tokens
        self.attempts = attempts
        self.info = LabellerInfo(prompt_version=prompt.version, model=model)

    def build_messages(self, history: list[Turn], reply: str) -> Messages:
        """The labeller's prompt, then the conversation and reply as one message"""
        if not history:
            raise ValueError("history must have at least one message")
        if not reply.strip():
            raise ValueError("reply must not be empty")
        return [
            {"role": "system", "content": self.prompt.text},
            {"role": "user", "content": format_conversation(history, reply)},
        ]

    async def label_with_reason(self, history: list[Turn], reply: str) -> Label:
        """Labels the reply, and keeps the labeller's reason for looking into it"""
        messages = self.build_messages(history, reply)
        error: LabelError | None = None
        for _ in range(self.attempts):
            response = await self.llm.complete(
                messages,
                model=self.model,
                temperature=0.0,
                max_tokens=self.max_tokens,
                json_mode=True,
            )
            try:
                return parse_label(response.text)
            except LabelError as exc:
                error = exc
        raise LabelError(f"Gave up after {self.attempts} attempts: {error}")

    async def label(self, history: list[Turn], reply: str) -> Kind:
        return (await self.label_with_reason(history, reply)).kind
