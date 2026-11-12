"""Test case format for the eval dataset, and a checker for dataset files

Each line of a dataset file is one test case. Refer to dataset/README.md
for more information about the fields and how to label them.

To check a file:

    uv run python -m backend.src.eval.dataset dataset/examples.jsonl
"""

import json
import sys
from pathlib import Path
from typing import Annotated, Literal, NamedTuple

from pydantic import (
    BaseModel,
    ConfigDict,
    StringConstraints,
    ValidationError,
    model_validator,
)
from pydantic_core import ErrorDetails

from ..clarification import Kind, Turn

# Basically an enum for categories
Category = Literal[
    "clear",
    "vague",
    "low_stakes",
    "reply_fills_gaps",
    "reply_partly_fills_gaps",
    "just_answer",
    "emotional",
]

NonBlank = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]
CaseId = Annotated[str, StringConstraints(pattern=r"^[a-z0-9]+(-[a-z0-9]+)*$")]


class CategoryRule(NamedTuple):
    """What a category says about the rest of the case"""

    gold_kind: Kind
    has_missing_slots: bool
    follows_a_question: bool = False


CATEGORY_RULES: dict[str, CategoryRule] = {
    "clear": CategoryRule("answer", has_missing_slots=False),
    "vague": CategoryRule("clarify", has_missing_slots=True),
    "low_stakes": CategoryRule("answer", has_missing_slots=True),
    "reply_fills_gaps": CategoryRule(
        "answer", has_missing_slots=False, follows_a_question=True
    ),
    "reply_partly_fills_gaps": CategoryRule(
        "clarify", has_missing_slots=True, follows_a_question=True
    ),
    "just_answer": CategoryRule("answer", has_missing_slots=True),
    "emotional": CategoryRule("clarify", has_missing_slots=True),
}


class QuestionExample(BaseModel):
    """An example question, and why it's good or bad for this case"""

    model_config = ConfigDict(extra="forbid")

    text: NonBlank
    reason: NonBlank


class EvalCase(BaseModel):
    """A conversation so far, and what the agent should do next"""

    # A typo in an optional field would otherwise just lose that field
    model_config = ConfigDict(extra="forbid")

    id: CaseId
    category: Category
    history: list[Turn]
    gold_kind: Kind
    missing_slots: list[NonBlank] = []
    hidden_intent: NonBlank
    good_questions: list[QuestionExample] = []
    bad_questions: list[QuestionExample] = []

    # A bunch of validations that enforce uniformity in the testing infrastructure
    @model_validator(mode="after")
    def check_rules(self) -> "EvalCase":
        problems = [
            *_history_problems(self),
            *_category_problems(self),
            *_question_problems(self),
        ]
        if problems:
            raise ValueError("; ".join(problems))
        return self


def _history_problems(case: EvalCase) -> list[str]:
    if not case.history:
        return ["history must have at least one message"]

    problems = []
    if case.history[0].role != "user":
        problems.append("history must start with a user message")
    if case.history[-1].role != "user":
        problems.append("history must end with a user message, since the agent is next")
    if any(a.role == b.role for a, b in zip(case.history, case.history[1:])):
        problems.append("history must alternate between user and assistant")
    if any(not turn.content.strip() for turn in case.history):
        problems.append("history must not have empty messages")
    return problems


def _category_problems(case: EvalCase) -> list[str]:
    rule = CATEGORY_RULES[case.category]

    problems = []
    if case.gold_kind != rule.gold_kind:
        problems.append(
            f"gold_kind must be '{rule.gold_kind}' for category '{case.category}'"
        )
    if rule.has_missing_slots and not case.missing_slots:
        problems.append(f"category '{case.category}' needs at least one missing slot")
    if not rule.has_missing_slots and case.missing_slots:
        problems.append(f"category '{case.category}' can't have missing slots")
    if rule.follows_a_question and not any(
        turn.role == "assistant" for turn in case.history
    ):
        problems.append(
            f"category '{case.category}' needs an earlier assistant message in history"
        )
    return problems


def _question_problems(case: EvalCase) -> list[str]:
    problems = []
    if case.gold_kind == "clarify":
        if not case.good_questions:
            problems.append("a clarify case needs at least one good question")
        if not case.bad_questions:
            problems.append("a clarify case needs at least one bad question")
    elif case.good_questions:
        problems.append(
            "an answer case can't have good questions, since it shouldn't ask"
        )

    for example in case.good_questions:
        if example.text.count("?") != 1:  # Count the number of questions
            problems.append(
                f"good question must ask exactly one thing: {example.text!r}"
            )
    return problems


class DatasetError(Exception):
    """A dataset file has problems, with one message for each"""

    def __init__(self, problems: list[str]) -> None:
        super().__init__("\n".join(problems))
        self.problems = problems


def load_cases(path: Path) -> list[EvalCase]:
    """Reads a dataset file, and raises DatasetError listing everything wrong with it"""
    try:
        lines = path.read_text(encoding="utf-8").split("\n")
    except (OSError, UnicodeDecodeError) as error:
        raise DatasetError([f"{path}: can't read file: {error}"]) from error

    cases: list[EvalCase] = []
    problems: list[str] = []
    first_seen: dict[str, int] = {}
    saw_a_case = False

    for number, line in enumerate(lines, start=1):
        if not line.strip():
            continue
        saw_a_case = True
        where = f"{path}:{number}"

        try:
            data = json.loads(line)
        except json.JSONDecodeError as error:
            problems.append(f"{where}: not valid JSON: {error}")
            continue

        case_id = data.get("id") if isinstance(data, dict) else None
        if isinstance(case_id, str):
            where = f"{where} ({case_id})"
            if case_id in first_seen:
                problems.append(
                    f"{where}: id is already used on line {first_seen[case_id]}"
                )
            first_seen.setdefault(case_id, number)

        try:
            cases.append(EvalCase.model_validate(data))
        except ValidationError as error:
            problems.extend(_format_error(where, e) for e in error.errors())

    if not saw_a_case:
        problems.append(f"{path}: file has no test cases")
    if problems:
        raise DatasetError(problems)
    return cases


def _format_error(where: str, error: ErrorDetails) -> str:
    field = ".".join(str(part) for part in error["loc"])
    message = error["msg"].removeprefix("Value error, ")
    return f"{where}: {field}: {message}" if field else f"{where}: {message}"


def main(args: list[str]) -> int:
    if len(args) != 1:
        print("Usage: python -m backend.src.eval.dataset <file.jsonl>", file=sys.stderr)
        return 2

    try:
        cases = load_cases(Path(args[0]))
    except DatasetError as error:
        print(error, file=sys.stderr)
        return 1

    print(f"{args[0]}: {len(cases)} test case(s), all valid")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
