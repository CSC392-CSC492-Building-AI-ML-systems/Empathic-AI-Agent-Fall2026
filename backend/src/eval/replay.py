"""Plays a test case back like a chat, one message at a time

Handy for reading through cases, or labelling them without seeing the answer
first. The case's labels only show up after the last message.

    uv run python -m backend.src.eval.replay 3
    uv run python -m backend.src.eval.replay 3 --file dataset/examples.jsonl

Press Enter for the next message, or type q to stop. After a case ends, pick
the previous one (p), the next one (n), any one by number (i), or quit (q).
"""

import argparse
import shutil
import sys
import textwrap
from pathlib import Path

from .dataset import DatasetError, EvalCase, QuestionExample, load_cases

DEFAULT_FILE = Path("dataset/cases.jsonl")
SPEAKERS = {"user": "User", "assistant": "Agent"}


def _wrap(text: str, indent: str) -> str:
    width = min(shutil.get_terminal_size().columns, 100)
    return textwrap.fill(
        text, width=width, initial_indent=indent, subsequent_indent=indent
    )


def _wait() -> bool:
    """Waits for Enter, and returns False if the user typed q"""
    try:
        return input("\n[Enter for next, q to quit] ").strip().lower() != "q"
    except EOFError:  # No keyboard, like when piped, so just keep going
        return True


def _print_questions(title: str, questions: list[QuestionExample]) -> None:
    print(f"\n{title}:")
    if not questions:
        print("  (none)")
    for question in questions:
        print(_wrap(f"- {question.text}", "  "))
        print(_wrap(f"why: {question.reason}", "    "))


def _reveal(case: EvalCase) -> None:
    print("\n" + "=" * 20 + " What the agent should do next " + "=" * 20)
    print(f"\nid:        {case.id}")
    print(f"category:  {case.category}")
    print(f"gold_kind: {case.gold_kind}")
    print("\nmissing_slots:")
    for slot in case.missing_slots or ["(none)"]:
        print(f"  - {slot}")
    print("\nhidden_intent:")
    print(_wrap(case.hidden_intent, "  "))
    _print_questions("good_questions", case.good_questions)
    _print_questions("bad_questions", case.bad_questions)


def play(case: EvalCase, number: int, total: int) -> bool:
    """Shows one message per key press, then the labels. False if the user quit"""
    count = len(case.history)
    print(f"\n\nCase {number} of {total} ({count} message{'s' * (count != 1)})")
    for turn in case.history:
        if not _wait():
            return False
        print(f"\n{SPEAKERS[turn.role]}:")
        print(_wrap(turn.content, "  "))
    print("\n(The agent replies next.)")
    if not _wait():
        return False
    _reveal(case)
    return True


def _ask_number(text: str, total: int) -> int | None:
    """Turns text (or a prompt, if it's empty) into a case number, or None"""
    try:
        number = int(text or input(f"Case number (1-{total}): "))
    except EOFError:
        return None
    except ValueError:
        print("That's not a number.")
        return None
    if 1 <= number <= total:
        return number
    print(f"n must be between 1 and {total}")
    return None


def _choose_next(current: int, total: int) -> int | None:
    """Asks which case to play next, and returns its number, or None to quit"""
    prompt = "\n[p previous case, n next case, i pick a case by number, q quit] "
    while True:
        try:
            choice = input(prompt).strip().lower()
        except EOFError:
            return None

        if choice == "q":
            return None
        if choice == "n":
            if current < total:
                return current + 1
            print(f"Case {total} is the last one.")
        elif choice == "p":
            if current > 1:
                return current - 1
            print("Case 1 is the first one.")
        elif choice.startswith("i"):  # "i" on its own asks, "i 12" jumps
            number = _ask_number(choice[1:].strip(), total)
            if number is not None:
                return number
        else:
            print("Type p, n, i or q.")


def main(args: list[str]) -> int:
    parser = argparse.ArgumentParser(description="Play a test case like a chat")
    parser.add_argument("n", type=int, help="which case to play, starting at 1")
    parser.add_argument("--file", type=Path, default=DEFAULT_FILE)
    options = parser.parse_args(args)

    try:
        cases = load_cases(options.file)
    except DatasetError as error:
        print(error, file=sys.stderr)
        return 1

    if not 1 <= options.n <= len(cases):
        print(f"n must be between 1 and {len(cases)}", file=sys.stderr)
        return 2

    number: int | None = options.n
    while number is not None and play(cases[number - 1], number, len(cases)):
        number = _choose_next(number, len(cases))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
