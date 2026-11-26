"""Real model replies, labelled by hand, for checking the labeller

Each line of dataset/labelled_replies.jsonl is one reply a model gave to a
test case, plus our own label for it. The labeller gets checked against these
labels before we trust it to label runs.

To get replies to label, run the clarifier prompt over the test cases on a
few models:

    uv run python -m backend.src.eval.labelled_replies collect \\
        --models some/model other/model

This uses PROVIDER and LLM_API_KEY from .env, and writes unlabelled rows to
dataset/collected_replies.jsonl. Pick the ones worth keeping, fill in their
kind, and add them to dataset/labelled_replies.jsonl.
"""

import argparse
import asyncio
import json
import re
import sys
from collections.abc import Sequence
from pathlib import Path

from pydantic import BaseModel, ConfigDict, field_validator

from ..clarification import Kind
from .agents import Prompt, build_messages, load_prompt
from .dataset import CaseId, DatasetError, EvalCase, load_cases, load_rows
from .llm import LLMClient, LLMError, OpenAICompatibleClient

DATASET_DIR = Path(__file__).resolve().parents[3] / "dataset"
CASES_FILE = DATASET_DIR / "cases.jsonl"
LABELLED_FILE = DATASET_DIR / "labelled_replies.jsonl"
COLLECTED_FILE = DATASET_DIR / "collected_replies.jsonl"


class LabelledReply(BaseModel):
    """A reply a model gave to a test case, and our label for it

    kind is empty in freshly collected rows, until someone labels them.
    """

    model_config = ConfigDict(extra="forbid")

    id: CaseId
    case_id: CaseId
    model: str
    prompt_version: str
    temperature: float
    reply: str
    kind: Kind | None = None
    note: str | None = None

    @field_validator("reply")
    @classmethod
    def check_reply_not_blank(cls, value: str) -> str:
        # Not stripped, since the labeller should see the reply exactly
        if not value.strip():
            raise ValueError("reply must not be empty")
        return value


def load_labelled_replies(
    path: Path = LABELLED_FILE,
    cases_path: Path = CASES_FILE,
    *,
    need_kind: bool = True,
) -> list[LabelledReply]:
    """Reads a replies file, and raises DatasetError listing everything wrong

    Every reply has to point at a real test case, and every reply needs a kind
    unless need_kind is False, like for freshly collected rows.
    """
    rows = load_rows(path, LabelledReply, "replies")
    case_ids = {case.id for case in load_cases(cases_path)}

    problems = []
    for row in rows:
        if row.case_id not in case_ids:
            problems.append(f"{path} ({row.id}): no test case {row.case_id!r}")
        if need_kind and row.kind is None:
            problems.append(f"{path} ({row.id}): kind is missing")
    if problems:
        raise DatasetError(problems)
    return rows


def model_slug(model: str) -> str:
    """A model name that fits in an id, like some/model-7b -> some-model-7b"""
    return re.sub(r"[^a-z0-9]+", "-", model.lower()).strip("-")


async def collect_replies(
    llm: LLMClient,
    cases: Sequence[EvalCase],
    models: Sequence[str],
    prompt: Prompt,
    *,
    temperature: float = 0.7,
    concurrency: int = 8,
) -> tuple[list[LabelledReply], list[str]]:
    """Gets one reply from each model for each test case, without labels

    Returns the replies in case order, and a message for each call that
    failed, so one bad call doesn't lose the rest.
    """
    limit = asyncio.Semaphore(concurrency)

    async def one(case: EvalCase, model: str) -> LabelledReply | str:
        async with limit:
            try:
                response = await llm.complete(
                    build_messages(prompt, case.history),
                    model=model,
                    temperature=temperature,
                )
            except LLMError as error:
                return f"{case.id} on {model}: {error}"
        return LabelledReply(
            id=f"{case.id}-{model_slug(model)}",
            case_id=case.id,
            model=model,
            prompt_version=prompt.version,
            temperature=temperature,
            reply=response.text,
        )

    models = list(dict.fromkeys(models))  # Same model twice would repeat ids
    results = await asyncio.gather(
        *(one(case, model) for case in cases for model in models)
    )
    replies = [r for r in results if isinstance(r, LabelledReply)]
    failures = [r for r in results if isinstance(r, str)]
    return replies, failures


def write_replies(path: Path, replies: Sequence[LabelledReply]) -> None:
    lines = (json.dumps(r.model_dump(), ensure_ascii=False) for r in replies)
    path.write_text("".join(f"{line}\n" for line in lines), encoding="utf-8")


async def _collect(options: argparse.Namespace) -> int:
    if options.out.exists() and not options.overwrite:
        print(
            f"{options.out} already exists. Pass --overwrite to replace it",
            file=sys.stderr,
        )
        return 2

    try:
        cases = load_cases(options.cases)
        prompt = load_prompt(options.prompt)
    except (DatasetError, OSError, ValueError) as error:
        print(error, file=sys.stderr)
        return 1

    try:
        llm = OpenAICompatibleClient()
    except LLMError as error:
        print(error, file=sys.stderr)
        return 1

    async with llm:
        replies, failures = await collect_replies(
            llm,
            cases,
            options.models,
            prompt,
            temperature=options.temperature,
            concurrency=options.concurrency,
        )

    for failure in failures:
        print(f"failed: {failure}", file=sys.stderr)
    write_replies(options.out, replies)
    print(f"Wrote {len(replies)} replies to {options.out} ({len(failures)} failed)")
    return 1 if failures and not replies else 0


def main(args: list[str]) -> int:
    parser = argparse.ArgumentParser(
        description="Real model replies, labelled by hand, for checking the labeller"
    )
    commands = parser.add_subparsers(dest="command", required=True)

    collect = commands.add_parser(
        "collect", help="get unlabelled replies from real models"
    )
    collect.add_argument("--models", nargs="+", required=True)
    collect.add_argument("--cases", type=Path, default=CASES_FILE)
    collect.add_argument("--prompt", default="v001", help="clarifier prompt version")
    collect.add_argument("--temperature", type=float, default=0.7)
    collect.add_argument("--concurrency", type=int, default=8)
    collect.add_argument("--out", type=Path, default=COLLECTED_FILE)
    collect.add_argument("--overwrite", action="store_true")

    options = parser.parse_args(args)
    return asyncio.run(_collect(options))


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
