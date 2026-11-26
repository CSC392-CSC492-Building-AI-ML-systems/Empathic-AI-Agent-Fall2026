"""Agents the eval harness can run test cases through

Every agent here follows the shared `Agent` interface, so the harness scores
them all the same way. The two baselines sit at either end of the
clarify/answer range: one always answers and one always asks. A real agent
has to beat both, and if its scores ever look like one of them, something is
broken.

`PromptedAgent` sends the conversation to a model with a versioned prompt.
The model replies in plain text, like the app's model does, so a separate
labeller decides whether that reply asks or answers.
"""

import re
from pathlib import Path
from typing import Protocol

from pydantic import BaseModel

from ..clarification import AgentReply, Kind, Turn
from .llm import LLMClient, Messages

PROMPTS_DIR = Path(__file__).resolve().parents[3] / "prompts"
PROMPT_VERSION = re.compile(r"v\d{3}")
PROMPT_NAME = re.compile(r"[a-z]+(_[a-z]+)*")


class Prompt(BaseModel):
    """A system prompt, which kind it is, and the version it came from"""

    version: str
    text: str
    name: str = "clarifier"


def load_prompt(
    version: str, prompts_dir: Path = PROMPTS_DIR, *, name: str = "clarifier"
) -> Prompt:
    """Loads prompts/<name>_<version>.md, like load_prompt("v001")

    Each change to a prompt goes in a new file with the next version number,
    and old files are never edited, so a run's prompt version always points to
    the exact text it used. Other kinds of prompts, like the labeller's, live
    next to the clarifier ones and are loaded with name="labeller".
    """
    if not PROMPT_NAME.fullmatch(name):
        raise ValueError(f"Prompt name should look like clarifier, not {name!r}")
    if not PROMPT_VERSION.fullmatch(version):
        raise ValueError(f"Prompt version should look like v001, not {version!r}")

    path = prompts_dir / f"{name}_{version}.md"
    if not path.is_file():
        found = sorted(
            p.stem.removeprefix(f"{name}_") for p in prompts_dir.glob(f"{name}_v*.md")
        )
        raise FileNotFoundError(
            f"No {name} prompt {version} at {path}. Found: {', '.join(found) or 'none'}"
        )

    text = path.read_text(encoding="utf-8").strip()
    if not text:
        raise ValueError(f"{path} is empty")
    return Prompt(version=version, text=text, name=name)


class LabellerInfo(BaseModel):
    """Which labeller made the labels, so a run can record it"""

    prompt_version: str
    model: str


class AgentInfo(BaseModel):
    """What an agent is and how it was set up, so a run can record it"""

    name: str
    prompt_version: str | None = None
    model: str | None = None
    temperature: float | None = None
    labeller: LabellerInfo | None = None


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


class Labeller(Protocol):
    """Decides whether a plain text reply asks a question or answers

    It gets the conversation too, since whether a reply counts as asking can
    depend on what came before. It should follow the mixed replies rule in
    dataset/README.md, and should never be the model being tested, so it says
    which model it uses in info.
    """

    info: LabellerInfo

    async def label(self, history: list[Turn], reply: str) -> Kind: ...


def build_messages(prompt: Prompt, history: list[Turn]) -> Messages:
    """The system prompt, then the conversation in order

    Anything that sends a conversation to the model under test uses this, so
    the model always sees it the same way.
    """
    _check_history(history)
    return [
        {"role": "system", "content": prompt.text},
        *(turn.model_dump() for turn in history),
    ]


def _same_model(a: str, b: str) -> bool:
    return a.strip().lower() == b.strip().lower()


def _check_labeller_model(labeller: Labeller, model: str) -> None:
    """Stops a model from labelling its own replies"""
    if _same_model(labeller.info.model, model):
        raise ValueError(
            f"The labeller can't use the model being tested ({model}). "
            "Pick a different model for one of them"
        )


class PromptedAgent:
    """Sends the conversation to a model with a versioned system prompt

    The reply's text is kept exactly as the model wrote it, and the labeller
    decides its kind. Errors from the model client are not caught, so the
    runner can count them.

    The labeller can't use the same model as the agent. That's checked when
    the agent is made, if a model is given, and again on every reply, since
    without one the client uses MODEL from .env.
    """

    def __init__(
        self,
        llm: LLMClient,
        labeller: Labeller,
        prompt: Prompt,
        *,
        model: str | None = None,
        temperature: float = 0.0,
        max_tokens: int = 1024,
    ) -> None:
        if model is not None:
            _check_labeller_model(labeller, model)

        self.llm = llm
        self.labeller = labeller
        self.prompt = prompt
        self.model = model
        self.temperature = temperature
        self.max_tokens = max_tokens
        self.info = AgentInfo(
            name="prompted",
            prompt_version=prompt.version,
            model=model,
            temperature=temperature,
            labeller=labeller.info,
        )

    def build_messages(self, history: list[Turn]) -> Messages:
        """The system prompt, then the conversation in order"""
        return build_messages(self.prompt, history)

    async def respond(self, history: list[Turn]) -> AgentReply:
        response = await self.llm.complete(
            self.build_messages(history),
            model=self.model,
            temperature=self.temperature,
            max_tokens=self.max_tokens,
        )
        _check_labeller_model(self.labeller, response.model)
        kind = await self.labeller.label(history, response.text)
        return AgentReply(kind=kind, content=response.text)
