import asyncio
from pathlib import Path

import pytest

from backend.src.clarification import Agent, AgentReply, Kind, Turn
from backend.src.eval.agents import (
    AlwaysAnswerAgent,
    AlwaysAskAgent,
    Prompt,
    PromptedAgent,
    load_prompt,
)
from backend.src.eval.llm import LLMError, LLMResponse, Messages
from backend.src.eval.mock import MockLLMClient

PROMPT = Prompt(version="v123", text="Ask when you need to, answer when you can.")


class FakeLabeller:
    """Gives every reply the same kind, and records what it was asked"""

    def __init__(self, kind: Kind) -> None:
        self.kind = kind
        self.calls: list[tuple[list[Turn], str]] = []

    async def label(self, history: list[Turn], reply: str) -> Kind:
        self.calls.append((history, reply))
        return self.kind


class FailingLLMClient:
    """A model client that always errors, like when the provider is down"""

    async def complete(self, messages: Messages, **kwargs: object) -> LLMResponse:
        raise LLMError("HTTP 503: unavailable")


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


def test_load_prompt_reads_the_real_first_version() -> None:
    """v001 is the app's current prompt, loaded without the trailing newline"""

    prompt = load_prompt("v001")

    assert prompt.version == "v001"
    assert prompt.name == "clarifier"
    assert prompt.text.startswith("You are a helpful conversational assistant.")
    assert prompt.text == prompt.text.strip()


def test_load_prompt_reads_the_real_labeller_prompt() -> None:
    """The labeller's first prompt asks for a reason and a clarify/answer kind"""

    prompt = load_prompt("v001", name="labeller")

    assert prompt.name == "labeller"
    assert '"kind": "clarify"' in prompt.text
    assert '"kind": "answer"' in prompt.text
    assert '"reason"' in prompt.text


def test_load_prompt_from_another_folder(tmp_path: Path) -> None:
    """Prompts can be loaded from any folder, which keeps these tests simple"""

    (tmp_path / "clarifier_v002.md").write_text("  Ask one question.\n")

    assert load_prompt("v002", tmp_path).text == "Ask one question."


def test_load_prompt_missing_version_lists_what_exists(tmp_path: Path) -> None:
    """Asking for a version that isn't there says which ones are"""

    (tmp_path / "clarifier_v001.md").write_text("Hi")

    with pytest.raises(FileNotFoundError, match="Found: v001"):
        load_prompt("v009", tmp_path)


def test_load_prompt_by_name(tmp_path: Path) -> None:
    """Other kinds of prompts sit next to the clarifier ones, picked by name"""

    (tmp_path / "clarifier_v001.md").write_text("Clarify.")
    (tmp_path / "labeller_v001.md").write_text("Label.")

    prompt = load_prompt("v001", tmp_path, name="labeller")

    assert prompt.text == "Label."
    assert prompt.name == "labeller"
    assert load_prompt("v001", tmp_path).text == "Clarify."


def test_load_prompt_missing_version_lists_only_that_name(tmp_path: Path) -> None:
    """The versions listed in the error are only the ones with the same name"""

    (tmp_path / "clarifier_v001.md").write_text("Hi")
    (tmp_path / "labeller_v002.md").write_text("Hi")

    with pytest.raises(FileNotFoundError, match="Found: v002$"):
        load_prompt("v009", tmp_path, name="labeller")


def test_load_prompt_missing_name_says_none_found(tmp_path: Path) -> None:
    """A name with no files at all says so, instead of listing other names"""

    (tmp_path / "clarifier_v001.md").write_text("Hi")

    with pytest.raises(FileNotFoundError, match="Found: none"):
        load_prompt("v001", tmp_path, name="judge")


@pytest.mark.parametrize("name", ["", "Labeller", "../clarifier", "label-er", "a_"])
def test_load_prompt_rejects_badly_named_prompts(name: str) -> None:
    """Only lowercase names are allowed, so nothing outside prompts/ gets read"""

    with pytest.raises(ValueError, match="should look like clarifier"):
        load_prompt("v001", name=name)


@pytest.mark.parametrize("version", ["1", "v1", "v001.md", "../v001", "v001\n"])
def test_load_prompt_rejects_badly_named_versions(version: str) -> None:
    """Only names like v001 are allowed, so nothing outside prompts/ gets read"""

    with pytest.raises(ValueError, match="should look like v001"):
        load_prompt(version)


def test_load_prompt_rejects_an_empty_file(tmp_path: Path) -> None:
    """A blank prompt is almost certainly a mistake"""

    (tmp_path / "clarifier_v001.md").write_text("\n\n")

    with pytest.raises(ValueError, match="is empty"):
        load_prompt("v001", tmp_path)


def test_prompted_agent_sends_prompt_then_history(mock_llm: MockLLMClient) -> None:
    """The model sees the system prompt first, then the conversation in order"""

    mock_llm.add_replies("How far can you run right now?")
    agent = PromptedAgent(mock_llm, FakeLabeller("clarify"), PROMPT)

    asyncio.run(agent.respond(AFTER_A_QUESTION))

    sent = mock_llm.calls[0].messages
    assert sent[0] == {"role": "system", "content": PROMPT.text}
    assert sent[1:] == [turn.model_dump() for turn in AFTER_A_QUESTION]


def test_prompted_agent_passes_model_settings(mock_llm: MockLLMClient) -> None:
    """The model and its settings go to the client unchanged"""

    mock_llm.add_replies("Here's a plan.")
    agent = PromptedAgent(
        mock_llm,
        FakeLabeller("answer"),
        PROMPT,
        model="some/model",
        temperature=0.7,
        max_tokens=300,
    )

    asyncio.run(agent.respond(ONE_MESSAGE))

    call = mock_llm.calls[0]
    assert (call.model, call.temperature, call.max_tokens) == ("some/model", 0.7, 300)
    assert call.json_mode is False


@pytest.mark.parametrize("kind", ["clarify", "answer"])
def test_prompted_agent_takes_kind_from_labeller(
    mock_llm: MockLLMClient, kind: Kind
) -> None:
    """The labeller decides the kind, and the reply text is kept exactly"""

    text = "  Farther or faster?\n"
    mock_llm.add_replies(text)
    labeller = FakeLabeller(kind)
    agent: Agent = PromptedAgent(mock_llm, labeller, PROMPT)

    reply = asyncio.run(agent.respond(ONE_MESSAGE))

    assert reply == AgentReply(kind=kind, content=text)
    assert labeller.calls == [(ONE_MESSAGE, text)]


def test_prompted_agent_info_for_run_logs() -> None:
    """A run can record which prompt, model and temperature were used"""

    agent = PromptedAgent(
        MockLLMClient(), FakeLabeller("answer"), PROMPT, model="m", temperature=0.3
    )

    assert agent.info.name == "prompted"
    assert agent.info.prompt_version == "v123"
    assert (agent.info.model, agent.info.temperature) == ("m", 0.3)


def test_prompted_agent_lets_model_errors_through() -> None:
    """Model errors aren't hidden, so the runner can count them"""

    labeller = FakeLabeller("answer")
    agent = PromptedAgent(FailingLLMClient(), labeller, PROMPT)

    with pytest.raises(LLMError):
        asyncio.run(agent.respond(ONE_MESSAGE))
    assert labeller.calls == []


def test_prompted_agent_rejects_empty_history(mock_llm: MockLLMClient) -> None:
    """Nothing gets sent to the model when there's nothing to reply to"""

    agent = PromptedAgent(mock_llm, FakeLabeller("answer"), PROMPT)

    with pytest.raises(ValueError):
        asyncio.run(agent.respond([]))
    assert mock_llm.calls == []


def test_prompted_agent_works_with_the_real_first_prompt(
    mock_llm: MockLLMClient,
) -> None:
    """The v001 prompt file plugs straight into the agent"""

    mock_llm.add_replies("Sure, here's a plan.")
    agent = PromptedAgent(mock_llm, FakeLabeller("answer"), load_prompt("v001"))

    reply = asyncio.run(agent.respond(ONE_MESSAGE))

    assert reply.kind == "answer"
    assert agent.info.prompt_version == "v001"
    assert mock_llm.calls[0].messages[0]["content"] == load_prompt("v001").text
