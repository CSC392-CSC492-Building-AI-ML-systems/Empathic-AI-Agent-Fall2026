import asyncio
from pathlib import Path

import pytest

from backend.src.clarification import Agent, AgentReply, Turn
from backend.src.eval.agents import AlwaysAnswerAgent, AlwaysAskAgent, load_prompt

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
    assert prompt.text.startswith("You are a helpful conversational assistant.")
    assert prompt.text == prompt.text.strip()


def test_load_prompt_from_another_folder(tmp_path: Path) -> None:
    """Prompts can be loaded from any folder, which keeps these tests simple"""

    (tmp_path / "clarifier_v002.md").write_text("  Ask one question.\n")

    assert load_prompt("v002", tmp_path).text == "Ask one question."


def test_load_prompt_missing_version_lists_what_exists(tmp_path: Path) -> None:
    """Asking for a version that isn't there says which ones are"""

    (tmp_path / "clarifier_v001.md").write_text("Hi")

    with pytest.raises(FileNotFoundError, match="Found: v001"):
        load_prompt("v009", tmp_path)


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
