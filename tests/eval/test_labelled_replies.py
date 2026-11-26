import asyncio
import json
from pathlib import Path
from typing import Any, Self

import pytest

from backend.src.eval import labelled_replies
from backend.src.eval.agents import Prompt, build_messages
from backend.src.eval.dataset import DatasetError, load_cases
from backend.src.eval.labelled_replies import (
    CASES_FILE,
    LabelledReply,
    collect_replies,
    load_labelled_replies,
    main,
    model_slug,
)
from backend.src.eval.llm import LLMError, LLMResponse, Messages
from backend.src.eval.mock import MockLLMClient

CASES = load_cases(CASES_FILE)[:2]
PROMPT = Prompt(version="v123", text="Ask when you need to, answer when you can.")


def make_row(**overrides: Any) -> dict[str, Any]:
    row = {
        "id": "first-reply",
        "case_id": CASES[0].id,
        "model": "some/model",
        "prompt_version": "v001",
        "temperature": 0.7,
        "reply": "What does better mean to you?",
        "kind": "clarify",
    }
    return {**row, **overrides}


def write_rows(path: Path, *rows: dict[str, Any]) -> Path:
    path.write_text("".join(json.dumps(row) + "\n" for row in rows))
    return path


def test_loads_a_valid_file(tmp_path: Path) -> None:
    path = write_rows(
        tmp_path / "replies.jsonl",
        make_row(),
        make_row(id="second-reply", kind="answer", note="Plan plus a follow-up"),
    )

    rows = load_labelled_replies(path)

    assert [row.kind for row in rows] == ["clarify", "answer"]
    assert rows[1].note == "Plan plus a follow-up"


def test_keeps_the_reply_exactly(tmp_path: Path) -> None:
    """Spaces aren't stripped, since the labeller should see the real reply"""

    path = write_rows(tmp_path / "replies.jsonl", make_row(reply="  Hi?\n"))

    assert load_labelled_replies(path)[0].reply == "  Hi?\n"


def test_needs_a_kind_unless_told_otherwise(tmp_path: Path) -> None:
    """Collected rows have no kind yet, but the labelled file must"""

    path = write_rows(tmp_path / "replies.jsonl", make_row(kind=None))

    with pytest.raises(DatasetError, match=r"\(first-reply\): kind is missing"):
        load_labelled_replies(path)
    assert load_labelled_replies(path, need_kind=False)[0].kind is None


def test_reply_must_point_at_a_real_case(tmp_path: Path) -> None:
    path = write_rows(tmp_path / "replies.jsonl", make_row(case_id="no-such-case"))

    with pytest.raises(DatasetError, match="no test case 'no-such-case'"):
        load_labelled_replies(path)


@pytest.mark.parametrize(
    ("overrides", "message"),
    [
        ({"reply": "  \n"}, "reply must not be empty"),
        ({"kind": "question"}, "kind"),
        ({"id": "Bad Id"}, "id"),
        ({"source": "x"}, "source"),
    ],
)
def test_rejects_bad_rows_with_line_and_id(
    tmp_path: Path, overrides: dict[str, Any], message: str
) -> None:
    path = write_rows(tmp_path / "replies.jsonl", make_row(**overrides))

    with pytest.raises(DatasetError, match=message) as error:
        load_labelled_replies(path)
    assert f"{path}:1" in str(error.value)


def test_rejects_duplicate_ids(tmp_path: Path) -> None:
    path = write_rows(tmp_path / "replies.jsonl", make_row(), make_row())

    with pytest.raises(DatasetError, match="id is already used on line 1"):
        load_labelled_replies(path)


def test_empty_file_says_it_has_no_replies(tmp_path: Path) -> None:
    path = tmp_path / "replies.jsonl"
    path.write_text("\n")

    with pytest.raises(DatasetError, match="file has no replies"):
        load_labelled_replies(path)


@pytest.mark.parametrize(
    ("model", "slug"),
    [
        ("openai/gpt-oss-20b", "openai-gpt-oss-20b"),
        ("Meta/Llama-3.1-8B:free", "meta-llama-3-1-8b-free"),
    ],
)
def test_model_slug_fits_in_an_id(model: str, slug: str) -> None:
    assert model_slug(model) == slug


def test_collect_sends_what_the_agent_would(mock_llm: MockLLMClient) -> None:
    """Each case goes to each model with the same messages PromptedAgent sends"""

    mock_llm.add_replies("reply 1", "reply 2", "reply 3", "reply 4")

    replies, failures = asyncio.run(
        collect_replies(mock_llm, CASES, ["a/one", "b/two"], PROMPT, temperature=0.5)
    )

    assert failures == []
    assert [call.model for call in mock_llm.calls] == ["a/one", "b/two"] * 2
    assert {call.temperature for call in mock_llm.calls} == {0.5}
    assert mock_llm.calls[0].messages == build_messages(PROMPT, CASES[0].history)
    assert [r.id for r in replies] == [
        f"{CASES[0].id}-a-one",
        f"{CASES[0].id}-b-two",
        f"{CASES[1].id}-a-one",
        f"{CASES[1].id}-b-two",
    ]
    assert replies[0] == LabelledReply(
        id=f"{CASES[0].id}-a-one",
        case_id=CASES[0].id,
        model="a/one",
        prompt_version="v123",
        temperature=0.5,
        reply="reply 1",
    )


def test_collect_skips_repeated_models(mock_llm: MockLLMClient) -> None:
    mock_llm.add_replies("reply 1", "reply 2")

    replies, _ = asyncio.run(collect_replies(mock_llm, CASES, ["a", "a"], PROMPT))

    assert len(replies) == 2


class FlakyClient:
    """Fails for one model, so one bad model doesn't lose the others' replies"""

    async def complete(
        self, messages: Messages, *, model: str | None = None, **kwargs: object
    ) -> LLMResponse:
        if model == "broken":
            raise LLMError("HTTP 404: no such model")
        return LLMResponse(text="A reply.", model=model or "", latency_s=0.0)


def test_collect_keeps_going_after_a_failed_call() -> None:
    replies, failures = asyncio.run(
        collect_replies(FlakyClient(), CASES, ["works", "broken"], PROMPT)
    )

    assert [r.model for r in replies] == ["works", "works"]
    assert failures == [
        f"{case.id} on broken: HTTP 404: no such model" for case in CASES
    ]


@pytest.fixture
def fake_client(monkeypatch: pytest.MonkeyPatch) -> None:
    """The collect command gets a mock instead of a real client"""

    class Client(MockLLMClient):
        def __init__(self) -> None:
            super().__init__(lambda messages: "What does better mean to you?")

        async def __aenter__(self) -> Self:
            return self

        async def __aexit__(self, *args: object) -> None:
            pass

    monkeypatch.setattr(labelled_replies, "OpenAICompatibleClient", Client)


def write_cases(tmp_path: Path) -> Path:
    path = tmp_path / "cases.jsonl"
    path.write_text("".join(case.model_dump_json() + "\n" for case in CASES))
    return path


@pytest.mark.usefixtures("fake_client")
def test_collect_command_writes_unlabelled_rows(tmp_path: Path) -> None:
    out = tmp_path / "collected.jsonl"
    cases = write_cases(tmp_path)

    code = main(
        ["collect", "--models", "m/1", "--cases", str(cases), "--out", str(out)]
    )

    assert code == 0
    rows = load_labelled_replies(out, cases, need_kind=False)
    assert [row.case_id for row in rows] == [case.id for case in CASES]
    assert {row.kind for row in rows} == {None}
    assert {row.prompt_version for row in rows} == {"v001"}


@pytest.mark.usefixtures("fake_client")
def test_collect_command_wont_overwrite_by_accident(tmp_path: Path) -> None:
    """Pointing --out at a labelled file shouldn't wipe the labels"""

    out = tmp_path / "labelled.jsonl"
    out.write_text("keep me\n")
    args = ["collect", "--models", "m/1", "--cases", str(write_cases(tmp_path))]

    assert main([*args, "--out", str(out)]) == 2
    assert out.read_text() == "keep me\n"

    assert main([*args, "--out", str(out), "--overwrite"]) == 0
    assert out.read_text() != "keep me\n"


def test_collect_command_without_an_api_key(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    """A missing key is a clear error, not a traceback"""

    def no_key() -> None:
        raise LLMError("LLM_API_KEY is not set")

    # Not the real client, since it would read a real key from .env
    monkeypatch.setattr(labelled_replies, "OpenAICompatibleClient", no_key)
    out = tmp_path / "collected.jsonl"

    assert main(["collect", "--models", "m/1", "--out", str(out)]) == 1
    assert not out.exists()
