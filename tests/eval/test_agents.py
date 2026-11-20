import asyncio

import pytest

from backend.src.clarification import Agent, AgentReply, Turn
from backend.src.eval.agents import AlwaysAnswerAgent, AlwaysAskAgent

ONE_MESSAGE = [Turn(role="user", content="I want to get better at running.")]
AFTER_A_QUESTION = [
    *ONE_MESSAGE,
    Turn(role="assistant", content="Do you want to run farther or faster?"),
    Turn(role="user", content="Farther. A 10K in three months, I can run 5K now."),
]


@pytest.mark.parametrize("history", [ONE_MESSAGE, AFTER_A_QUESTION])
@pytest.mark.parametrize(
    ("agent", "kind"), [(AlwaysAnswerAgent(), "answer"), (AlwaysAskAgent(), "clarify")]
)
def test_baseline_always_gives_the_same_kind(
    agent: Agent, kind: str, history: list[Turn]
) -> None:
    """Baselines ignore the conversation and always reply the same way"""

    reply = asyncio.run(agent.respond(history))

    assert isinstance(reply, AgentReply)
    assert reply.kind == kind
    assert reply.content.strip()


@pytest.mark.parametrize("agent", [AlwaysAnswerAgent(), AlwaysAskAgent()])
def test_baseline_rejects_empty_history(agent: Agent) -> None:
    """There's nothing to reply to without at least one message"""

    with pytest.raises(ValueError):
        asyncio.run(agent.respond([]))


def test_baselines_have_names_for_run_logs() -> None:
    """Each baseline says what it is, and has no prompt or model behind it"""

    assert AlwaysAnswerAgent().info.name == "always-answer"
    assert AlwaysAskAgent().info.name == "always-ask"
    assert AlwaysAnswerAgent().info.model is None
