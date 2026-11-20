import json
from collections import Counter
from pathlib import Path
from typing import Any, get_args

import pytest
from pydantic import ValidationError

from backend.src.eval.dataset import (
    CATEGORY_RULES,
    Category,
    DatasetError,
    EvalCase,
    load_cases,
    main,
)

DATASET_DIR = Path(__file__).parents[2] / "dataset"

ONE_USER_MESSAGE = [{"role": "user", "content": "I want to get better at running."}]
USER_REPLIED = [
    *ONE_USER_MESSAGE,
    {"role": "assistant", "content": "Farther or faster?"},
    {"role": "user", "content": "Farther."},
]
GOOD = {"text": "Farther or faster?", "reason": "Targets the goal."}
BAD = {"text": "Can you tell me more?", "reason": "Too general."}


def make_case(**overrides: Any) -> dict[str, Any]:
    """A valid vague case, with any fields swapped out"""
    case = {
        "id": "vague-running",
        "category": "vague",
        "history": ONE_USER_MESSAGE,
        "gold_kind": "clarify",
        "missing_slots": ["what better means to them"],
        "hidden_intent": "Wants to run a 10K in three months.",
        "good_questions": [GOOD],
        "bad_questions": [BAD],
    }
    return {**case, **overrides}


def write_lines(path: Path, *lines: object) -> Path:
    """Writes one line per item, with strings written as they are"""
    text = "\n".join(
        line if isinstance(line, str) else json.dumps(line) for line in lines
    )
    path.write_text(text + "\n", encoding="utf-8")
    return path


def test_valid_case_is_accepted() -> None:
    """The baseline case the other tests change should itself be valid"""

    case = EvalCase.model_validate(make_case())
    assert case.gold_kind == "clarify"
    assert case.good_questions[0].reason == "Targets the goal."


@pytest.mark.parametrize(
    ("overrides", "message"),
    [
        ({"history": []}, "at least one message"),
        (
            {"history": [{"role": "assistant", "content": "Hi"}, *ONE_USER_MESSAGE]},
            "start with a user message",
        ),
        (
            {"history": [*ONE_USER_MESSAGE, {"role": "assistant", "content": "Hi"}]},
            "end with a user message",
        ),
        ({"history": ONE_USER_MESSAGE * 2}, "alternate"),
        ({"history": [{"role": "user", "content": "  "}]}, "empty messages"),
        ({"history": [{"role": "robot", "content": "Hi"}]}, "history.0.role"),
        ({"gold_kind": "answer"}, "gold_kind must be 'clarify'"),
        ({"gold_kind": "guess"}, "gold_kind"),
        ({"category": "confusing"}, "category"),
        ({"missing_slots": []}, "needs at least one missing slot"),
        ({"missing_slots": ["  "]}, "missing_slots.0"),
        ({"hidden_intent": "  "}, "hidden_intent"),
        ({"good_questions": []}, "at least one good question"),
        ({"bad_questions": []}, "at least one bad question"),
        (
            {"good_questions": [{"text": "How old? How far?", "reason": "No."}]},
            "exactly one thing",
        ),
        ({"good_questions": [{"text": "Farther?", "reason": " "}]}, "reason"),
        ({"bad_questions": [{"text": "Why?"}]}, "reason"),
        ({"id": "Has Spaces"}, "id"),
        ({"mispelled_field": "hi"}, "mispelled_field"),
    ],
)
def test_bad_case_is_rejected_with_a_clear_message(
    overrides: dict[str, Any], message: str
) -> None:
    """Each kind of bad case should fail, and the error should point at the problem"""

    with pytest.raises(ValidationError) as error:
        EvalCase.model_validate(make_case(**overrides))

    errors = error.value.errors()
    assert any(
        message in e["msg"] or message in ".".join(map(str, e["loc"])) for e in errors
    )


@pytest.mark.parametrize("field", ["id", "category", "history", "gold_kind"])
def test_missing_required_field_is_rejected(field: str) -> None:
    """Required fields can't be left out"""

    case = make_case()
    del case[field]
    with pytest.raises(ValidationError):
        EvalCase.model_validate(case)


def test_case_reports_all_of_its_rule_problems_at_once() -> None:
    """You shouldn't have to fix a case one problem at a time"""

    with pytest.raises(ValidationError) as error:
        EvalCase.model_validate(make_case(gold_kind="answer", missing_slots=[]))

    assert "gold_kind must be 'clarify'" in str(error.value)
    assert "needs at least one missing slot" in str(error.value)


@pytest.mark.parametrize(
    ("category", "history"),
    [
        ("clear", ONE_USER_MESSAGE),
        ("reply_fills_gaps", USER_REPLIED),
    ],
)
def test_case_with_nothing_missing_rejects_slots(
    category: str, history: list[dict[str, str]]
) -> None:
    """If the agent has what it needs, nothing should be listed as missing"""

    case = make_case(
        category=category,
        history=history,
        gold_kind="answer",
        good_questions=[],
        bad_questions=[],
    )
    with pytest.raises(ValidationError, match="can't have missing slots"):
        EvalCase.model_validate(case)
    assert EvalCase.model_validate({**case, "missing_slots": []}).category == category


@pytest.mark.parametrize("category", ["low_stakes", "just_answer"])
def test_answering_despite_gaps_needs_slots(category: str) -> None:
    """These cases answer with assumptions, so the case has to say what's unknown"""

    case = make_case(category=category, gold_kind="answer", good_questions=[])
    assert EvalCase.model_validate(case).missing_slots

    with pytest.raises(ValidationError, match="needs at least one missing slot"):
        EvalCase.model_validate({**case, "missing_slots": []})


def test_answer_case_rejects_good_questions() -> None:
    """A good question would mean the right move is to ask"""

    case = make_case(category="low_stakes", gold_kind="answer")
    with pytest.raises(ValidationError, match="can't have good questions"):
        EvalCase.model_validate(case)


def test_answer_case_can_leave_out_bad_questions() -> None:
    """Bad questions are optional when the agent should answer"""

    case = make_case(
        category="low_stakes", gold_kind="answer", good_questions=[], bad_questions=[]
    )
    assert EvalCase.model_validate(case).bad_questions == []


@pytest.mark.parametrize(
    ("category", "gold_kind", "slots"),
    [
        ("reply_fills_gaps", "answer", []),
        ("reply_partly_fills_gaps", "clarify", ["goal"]),
    ],
)
def test_reply_categories_need_an_earlier_question(
    category: str, gold_kind: str, slots: list[str]
) -> None:
    """A reply can't fill the gaps if nothing was asked"""

    questions = (
        {"good_questions": [GOOD], "bad_questions": [BAD]}
        if gold_kind == "clarify"
        else {"good_questions": []}
    )
    case = make_case(
        category=category, gold_kind=gold_kind, missing_slots=slots, **questions
    )
    with pytest.raises(ValidationError, match="earlier assistant message"):
        EvalCase.model_validate(case)
    assert EvalCase.model_validate({**case, "history": USER_REPLIED})


def test_every_category_has_a_rule() -> None:
    """A category with no rule would crash the checker"""

    assert set(CATEGORY_RULES) == set(get_args(Category))


def test_examples_file_is_valid_and_covers_every_category() -> None:
    """The guide points people to this file, so it has to stay correct"""

    cases = load_cases(DATASET_DIR / "examples.jsonl")
    assert {case.category for case in cases} == set(get_args(Category))


def test_cases_file_is_valid_and_covers_every_category() -> None:
    """The harness runs on this file, so every category needs enough cases"""

    cases = load_cases(DATASET_DIR / "cases.jsonl")
    counts = Counter(case.category for case in cases)
    for category in get_args(Category):
        assert counts[category] >= 5, f"only {counts[category]} '{category}' cases"
    assert {case.gold_kind for case in cases} == {"clarify", "answer"}


def test_guide_mentions_every_category() -> None:
    """If a category gets added, the guide has to explain it"""

    guide = (DATASET_DIR / "README.md").read_text(encoding="utf-8")
    for category in get_args(Category):
        assert f"`{category}`" in guide


def test_load_cases_skips_blank_lines(tmp_path: Path) -> None:
    """A blank line isn't a problem, and the cases should come back in order"""

    path = write_lines(
        tmp_path / "cases.jsonl", make_case(id="first"), "", make_case(id="second")
    )
    assert [case.id for case in load_cases(path)] == ["first", "second"]


def test_load_cases_keeps_line_separators_inside_a_message(tmp_path: Path) -> None:
    """Only a real newline ends a case, not unusual unicode line breaks in the text"""

    history = [{"role": "user", "content": "first\u2028second"}]
    path = tmp_path / "cases.jsonl"
    path.write_text(
        json.dumps(make_case(history=history), ensure_ascii=False), encoding="utf-8"
    )
    assert load_cases(path)[0].history[0].content == "first\u2028second"


def test_load_cases_lists_every_problem_with_line_and_id(tmp_path: Path) -> None:
    """Errors should say where the problem is, and one bad case shouldn't hide the rest"""

    path = write_lines(
        tmp_path / "cases.jsonl",
        make_case(id="fine"),
        "{not json",
        make_case(id="wrong-kind", gold_kind="answer"),
        "[1, 2]",
    )

    with pytest.raises(DatasetError) as error:
        load_cases(path)

    problems = error.value.problems
    assert len(problems) == 3
    assert problems[0].startswith(f"{path}:2: not valid JSON")
    assert problems[1].startswith(f"{path}:3 (wrong-kind): gold_kind must be 'clarify'")
    assert problems[2].startswith(f"{path}:4: ")


def test_load_cases_rejects_duplicate_ids(tmp_path: Path) -> None:
    """Results get matched back to cases by id, so ids have to be unique"""

    path = write_lines(tmp_path / "cases.jsonl", make_case(), "", make_case())

    with pytest.raises(DatasetError, match="id is already used on line 1"):
        load_cases(path)


@pytest.mark.parametrize("text", ["", "\n  \n"])
def test_load_cases_rejects_a_file_with_no_cases(tmp_path: Path, text: str) -> None:
    """An empty dataset would give a meaningless score"""

    path = tmp_path / "cases.jsonl"
    path.write_text(text, encoding="utf-8")

    with pytest.raises(DatasetError, match="no test cases"):
        load_cases(path)


def test_load_cases_reports_a_missing_file(tmp_path: Path) -> None:
    """A wrong path should give the same kind of error, not a traceback"""

    with pytest.raises(DatasetError, match="can't read file"):
        load_cases(tmp_path / "nope.jsonl")


def test_main_passes_a_valid_file(
    tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    """A good file exits with 0 and says how many cases it checked"""

    path = write_lines(tmp_path / "cases.jsonl", make_case())

    assert main([str(path)]) == 0
    assert "1 test case(s), all valid" in capsys.readouterr().out


def test_main_fails_a_bad_file(
    tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    """A bad file exits with 1 and prints the problems"""

    path = write_lines(tmp_path / "cases.jsonl", make_case(gold_kind="answer"))

    assert main([str(path)]) == 1
    assert "gold_kind must be 'clarify'" in capsys.readouterr().err


def test_main_needs_a_file_argument(capsys: pytest.CaptureFixture[str]) -> None:
    """Running it with no file should show how to use it"""

    assert main([]) == 2
    assert "Usage" in capsys.readouterr().err
