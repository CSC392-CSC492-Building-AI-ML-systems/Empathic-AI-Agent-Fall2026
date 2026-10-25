import asyncio

import pytest
from pydantic import ValidationError

from backend.src.clarification import Agent, AgentReply, Turn


class EchoAgent:
    """A minimalistic agent: clarifies once no matter what, and then answers"""

    async def respond(self, history: list[Turn]) -> AgentReply:
        if len(history) == 1:
            return AgentReply(kind="clarify", content="What do you mean?")
        return AgentReply(kind="answer", content=history[-1].content)


@pytest.mark.parametrize("kind", ["clarify", "answer"])
def test_reply_accepts_valid_kinds(kind: str) -> None:
    """Both clarify and answer should be accepted, and notes is optional"""

    reply = AgentReply.model_validate({"kind": kind, "content": "hi"})
    assert reply.kind == kind
    assert reply.notes is None


def test_reply_rejects_unknown_kind() -> None:
    """Anything other than clarify/answer should fail validation"""

    with pytest.raises(ValidationError):
        AgentReply.model_validate({"kind": "guess", "content": "hi"})


@pytest.mark.parametrize("content", ["", "   \n"])
def test_reply_rejects_blank_content(content: str) -> None:
    """Empty or whitespace-only replies don't count as a reply"""

    with pytest.raises(ValidationError):
        AgentReply(kind="answer", content=content)


def test_assistant_turn_requires_kind() -> None:
    """Every assistant message has to say whether it was a question or an answer"""

    with pytest.raises(ValidationError):
        Turn(role="assistant", content="hi")


def test_user_turn_rejects_kind() -> None:
    """User messages shouldn't have a kind, only the assistant's do"""

    with pytest.raises(ValidationError):
        Turn(role="user", kind="answer", content="hi")


def test_agent_protocol_round_trip() -> None:
    """Runs a toy agent through a short conversation: it should ask first, then answer once the user replies"""

    agent: Agent = EchoAgent()
    history = [Turn(role="user", content="I want to get better at running.")]

    first = asyncio.run(agent.respond(history))
    assert first.kind == "clarify"

    history += [
        Turn(role="assistant", kind=first.kind, content=first.content),
        Turn(role="user", content="Training for a 10K."),
    ]
    second = asyncio.run(agent.respond(history))
    assert second.kind == "answer"


def test_reply_serialization_round_trip() -> None:
    """Dumping a reply and loading it back should give the same reply (this is how runs get logged)"""

    reply = AgentReply(
        kind="clarify", content="Farther or faster?", notes="goal unclear"
    )
    assert AgentReply.model_validate(reply.model_dump()) == reply
