"""Agents the eval harness can run test cases through

Every agent here follows the shared `Agent` interface, so the harness scores
them all the same way. The two baselines sit at either end of the
clarify/answer range: one always answers and one always asks. A real agent
has to beat both, and if its scores ever look like one of them, something is
broken.
"""

from pydantic import BaseModel

from ..clarification import AgentReply, Turn


class AgentInfo(BaseModel):
    """What an agent is and how it was set up, so a run can record it"""

    name: str
    prompt_version: str | None = None
    model: str | None = None
    temperature: float | None = None


def _check_history(history: list[Turn]) -> None:
    if not history:
        raise ValueError("history must have at least one message")


class AlwaysAnswerAgent:
    """Baseline that answers every time and never asks a question"""

    REPLY = "Here is my best answer based on what you've told me."

    def __init__(self) -> None:
        self.info = AgentInfo(name="always-answer")

    async def respond(self, history: list[Turn]) -> AgentReply:
        _check_history(history)
        return AgentReply(kind="answer", content=self.REPLY)


class AlwaysAskAgent:
    """Baseline that asks a clarifying question every time and never answers"""

    REPLY = "Could you tell me a bit more about what you're looking for?"

    def __init__(self) -> None:
        self.info = AgentInfo(name="always-ask")

    async def respond(self, history: list[Turn]) -> AgentReply:
        _check_history(history)
        return AgentReply(kind="clarify", content=self.REPLY)
