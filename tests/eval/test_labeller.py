import asyncio

import pytest

from backend.src.clarification import Turn
from backend.src.eval.agents import Labeller, Prompt, load_prompt
from backend.src.eval.labeller import (
    Label,
    LabelError,
    LLMLabeller,
    format_conversation,
    parse_label,
)
from backend.src.eval.mock import MockLLMClient

PROMPT = Prompt(version="v123", text="Label the reply.", name="labeller")
HISTORY = [
    Turn(role="user", content="I want to get better at running."),
    Turn(role="assistant", content="What does better mean to you?"),
    Turn(role="user", content="A 10K in three months. I can already run 5K."),
]
REPLY = "Here's a 12-week plan. Want me to fit it to your schedule?"


def _label(labeller: LLMLabeller, reply: str = REPLY) -> Label:
    return asyncio.run(labeller.label_with_reason(HISTORY, reply))


def test_format_conversation_marks_the_conversation_and_reply() -> None:
    """The labeller can tell the conversation apart from the reply it labels"""

    text = format_conversation(HISTORY, REPLY)

    assert text.startswith("<conversation>\nUser: I want to get better at running.")
    assert "\n\nAssistant: What does better mean to you?\n\n" in text
    assert text.endswith(f"<reply>\n{REPLY}\n</reply>")


def test_labeller_sends_prompt_then_one_message(mock_llm: MockLLMClient) -> None:
    """The conversation goes in a single message, not as real chat turns"""

    mock_llm.add_replies('{"reason": "Gives a plan.", "kind": "answer"}')
    labeller = LLMLabeller(mock_llm, "judge-model", PROMPT)

    _label(labeller)

    assert mock_llm.calls[0].messages == [
        {"role": "system", "content": "Label the reply."},
        {"role": "user", "content": format_conversation(HISTORY, REPLY)},
    ]


def test_labeller_uses_its_own_model_and_fixed_settings(
    mock_llm: MockLLMClient,
) -> None:
    """Always the labeller's model, temperature 0, and JSON mode"""

    mock_llm.add_replies('{"reason": "r", "kind": "answer"}')
    labeller = LLMLabeller(mock_llm, "judge-model", PROMPT, max_tokens=200)

    _label(labeller)

    call = mock_llm.calls[0]
    assert call.model == "judge-model"
    assert call.temperature == 0.0
    assert call.json_mode is True
    assert call.max_tokens == 200


@pytest.mark.parametrize(
    "text",
    [
        '{"reason": "Asks about their goal.", "kind": "clarify"}',
        '```json\n{"reason": "Asks about their goal.", "kind": "clarify"}\n```',
        '```\n{"reason": "Asks about their goal.", "kind": "clarify"}\n```',
        '  {"reason": "Asks about their goal.", "kind": " Clarify "}\n',
    ],
)
def test_parse_label_reads_plain_and_fenced_json(text: str) -> None:
    """Models sometimes wrap JSON in a code fence or add spaces"""

    assert parse_label(text) == Label(kind="clarify", reason="Asks about their goal.")


def test_parse_label_without_a_reason() -> None:
    """The reason is nice to have, but the kind is what matters"""

    assert parse_label('{"kind": "answer"}') == Label(kind="answer", reason="")


@pytest.mark.parametrize(
    "text",
    [
        "clarify",
        "",
        '["clarify"]',
        '{"reason": "r"}',
        '{"reason": "r", "kind": "question"}',
        '{"reason": "r", "kind": 1}',
    ],
)
def test_parse_label_rejects_unusable_output(text: str) -> None:
    """Anything that isn't a clear clarify or answer is an error, not a guess"""

    with pytest.raises(LabelError):
        parse_label(text)


def test_labeller_tries_again_after_bad_output(mock_llm: MockLLMClient) -> None:
    """One bad reply gets a second try"""

    mock_llm.add_replies("not json", '{"reason": "r", "kind": "answer"}')
    labeller = LLMLabeller(mock_llm, "judge-model", PROMPT)

    assert _label(labeller).kind == "answer"
    assert len(mock_llm.calls) == 2


def test_labeller_gives_up_after_its_attempts(mock_llm: MockLLMClient) -> None:
    """If every try is unusable, it raises instead of guessing"""

    mock_llm.add_replies("not json", '{"kind": "maybe"}')
    labeller = LLMLabeller(mock_llm, "judge-model", PROMPT)

    with pytest.raises(LabelError, match="after 2 attempts.*'maybe'"):
        _label(labeller)


def test_label_returns_just_the_kind(mock_llm: MockLLMClient) -> None:
    """label() is what PromptedAgent uses, so it follows the Labeller protocol"""

    mock_llm.add_replies('{"reason": "Asks a question.", "kind": "clarify"}')
    labeller: Labeller = LLMLabeller(mock_llm, "judge-model", PROMPT)

    assert asyncio.run(labeller.label(HISTORY, REPLY)) == "clarify"


@pytest.mark.parametrize("model", ["", "   "])
def test_labeller_needs_a_model(mock_llm: MockLLMClient, model: str) -> None:
    """There's no fallback to MODEL in .env, since that's the model under test"""

    with pytest.raises(ValueError, match="needs a model"):
        LLMLabeller(mock_llm, model, PROMPT)


def test_labeller_needs_a_labeller_prompt(mock_llm: MockLLMClient) -> None:
    """Passing the clarifier prompt by mistake is caught early"""

    with pytest.raises(ValueError, match="got a clarifier one"):
        LLMLabeller(mock_llm, "judge-model", load_prompt("v001"))


@pytest.mark.parametrize(
    ("history", "reply"), [([], REPLY), (HISTORY, ""), (HISTORY, "  \n")]
)
def test_labeller_rejects_empty_input(
    mock_llm: MockLLMClient, history: list[Turn], reply: str
) -> None:
    """There's nothing to label without a conversation and a reply"""

    labeller = LLMLabeller(mock_llm, "judge-model", PROMPT)

    with pytest.raises(ValueError, match="must not be empty|at least one message"):
        asyncio.run(labeller.label_with_reason(history, reply))
    assert mock_llm.calls == []


def test_labeller_info_for_run_logs() -> None:
    """Runs can record which labeller made the labels"""

    labeller = LLMLabeller(
        MockLLMClient(), "judge-model", load_prompt("v001", name="labeller")
    )

    assert labeller.info.prompt_version == "v001"
    assert labeller.info.model == "judge-model"


def test_labeller_works_with_the_real_first_prompt(mock_llm: MockLLMClient) -> None:
    """The real prompt goes in as the system message"""

    mock_llm.add_replies('{"reason": "r", "kind": "answer"}')
    prompt = load_prompt("v001", name="labeller")

    _label(LLMLabeller(mock_llm, "judge-model", prompt))

    assert mock_llm.calls[0].messages[0]["content"] == prompt.text
