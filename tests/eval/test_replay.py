from pathlib import Path

import pytest

from backend.src.eval.replay import main

EXAMPLES = str(Path(__file__).parents[2] / "dataset" / "examples.jsonl")


def press(monkeypatch: pytest.MonkeyPatch, *keys: str) -> None:
    """Feeds these key presses to input(), then acts like the input ran out"""
    queue = list(keys)

    def fake_input(_: str = "") -> str:
        if not queue:
            raise EOFError
        return queue.pop(0)

    monkeypatch.setattr("builtins.input", fake_input)


def test_plays_every_message_then_reveals_the_labels(
    monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
) -> None:
    """Case 4 has three messages, so both speakers show up before the labels"""

    press(monkeypatch)
    assert main(["4", "--file", EXAMPLES]) == 0
    out = capsys.readouterr().out

    assert out.index("User:") < out.index("Agent:") < out.index("gold_kind: answer")
    assert "reply-fills-running-goal" in out
    assert "bad_questions:" in out


def test_labels_stay_hidden_until_the_end(
    monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
) -> None:
    """Quitting early shouldn't give the answer away"""

    press(monkeypatch, "", "q")
    assert main(["2", "--file", EXAMPLES]) == 0
    out = capsys.readouterr().out

    assert "I want to get better at running." in out
    assert "gold_kind" not in out
    assert "vague-get-better-at-running" not in out


def test_n_and_p_move_between_cases(
    monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
) -> None:
    """Case 1 has one message, so two presses finish it"""

    press(monkeypatch, "", "", "n", "", "", "p", "", "", "q")
    assert main(["1", "--file", EXAMPLES]) == 0
    out = capsys.readouterr().out

    assert out.index("Case 1 of 7") < out.index("Case 2 of 7")
    assert out.index("Case 2 of 7") < out.rindex("Case 1 of 7")


def test_cant_go_past_either_end(
    monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
) -> None:
    press(monkeypatch, "", "", "p", "i 7", "", "", "n", "q")
    assert main(["1", "--file", EXAMPLES]) == 0
    out = capsys.readouterr().out

    assert "Case 1 is the first one." in out
    assert "Case 7 is the last one." in out


@pytest.mark.parametrize("keys", [("i", "3"), ("i 3",)])
def test_i_jumps_to_a_case_by_number(
    keys: tuple[str, ...],
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    press(monkeypatch, "", "", *keys, "", "q")
    assert main(["1", "--file", EXAMPLES]) == 0
    assert "Case 3 of 7" in capsys.readouterr().out


def test_bad_menu_input_asks_again(
    monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
) -> None:
    press(monkeypatch, "", "", "x", "i 99", "i abc", "q")
    assert main(["1", "--file", EXAMPLES]) == 0
    out = capsys.readouterr().out

    assert "Type p, n, i or q." in out
    assert "between 1 and 7" in out
    assert "That's not a number." in out
    assert "Case 2 of 7" not in out


@pytest.mark.parametrize("n", ["0", "8"])
def test_rejects_a_case_number_out_of_range(
    n: str, capsys: pytest.CaptureFixture[str]
) -> None:
    assert main([n, "--file", EXAMPLES]) == 2
    assert "between 1 and 7" in capsys.readouterr().err
