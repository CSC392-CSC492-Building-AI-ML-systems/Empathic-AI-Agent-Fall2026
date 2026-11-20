"""Agents the eval harness can run test cases through

Every agent here follows the shared `Agent` interface, so the harness scores
them all the same way. The two baselines sit at either end of the
clarify/answer range: one always answers and one always asks. A real agent
has to beat both, and if its scores ever look like one of them, something is
broken.
"""

import re
from pathlib import Path

from pydantic import BaseModel

from ..clarification import AgentReply, Turn

PROMPTS_DIR = Path(__file__).resolve().parents[3] / "prompts"
PROMPT_VERSION = re.compile(r"v\d{3}")


class Prompt(BaseModel):
    """A system prompt and the version it came from"""

    version: str
    text: str


def load_prompt(version: str, prompts_dir: Path = PROMPTS_DIR) -> Prompt:
    """Loads prompts/clarifier_<version>.md, like load_prompt("v001")

    Each change to the prompt goes in a new file with the next version number,
    and old files are never edited, so a run's prompt version always points to
    the exact text it used.
    """
    if not PROMPT_VERSION.fullmatch(version):
        raise ValueError(f"Prompt version should look like v001, not {version!r}")

    path = prompts_dir / f"clarifier_{version}.md"
    if not path.is_file():
        found = sorted(
            p.stem.removeprefix("clarifier_")
            for p in prompts_dir.glob("clarifier_v*.md")
        )
        raise FileNotFoundError(
            f"No prompt {version} at {path}. Found: {', '.join(found) or 'none'}"
        )

    text = path.read_text(encoding="utf-8").strip()
    if not text:
        raise ValueError(f"{path} is empty")
    return Prompt(version=version, text=text)


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
