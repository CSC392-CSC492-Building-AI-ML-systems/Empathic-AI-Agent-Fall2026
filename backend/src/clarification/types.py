"""Shared contract for clarification agents.

Every agent the eval harness measures (prompted baselines, the backend's
Clarification Service, fine-tuned models) implements `Agent`, so all of them
are scored the same way. Only a new reply has a `kind`; past messages are just
role and content, same as the messages table.
"""

from typing import Literal, Protocol

from pydantic import BaseModel, field_validator

Kind = Literal["clarify", "answer"]


class Turn(BaseModel):
    """A single message in a conversation, as stored in the messages table"""

    role: Literal["user", "assistant"]
    content: str


class AgentReply(BaseModel):
    """An agent's next move: one clarifying question, or an answer."""

    kind: Kind
    content: str
    notes: str | None = None  # scratchpad; stored but not shown to the user

    @field_validator("content")
    @classmethod
    def check_content_not_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("content must not be empty")
        return value


class Agent(Protocol):
    """Anything that decides whether to clarify or answer, given the history."""

    async def respond(self, history: list[Turn]) -> AgentReply: ...
