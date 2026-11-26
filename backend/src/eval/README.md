# Eval harness

Measures how well a clarification agent decides between **asking a clarifying
question** and **answering**, and whether asking improves the final answer.
The same harness is used to iterate on prompts and, later, to compare
fine-tuned models against prompted ones.

## The contract

Every agent under test implements `Agent` from
[`../clarification/types.py`](../clarification/types.py):

```python
reply = await agent.respond(history)
reply.kind  # "clarify" or "answer"
reply.content  # the clarifying question, or the answer
```

The interface lives in `clarification/` rather than here so the backend's
Clarification Service can use it too.

## Layout

- `llm.py`: LLM access. Which model and provider get called is set in `.env`
  (see `.env.example`), so switching models never needs a code change
- `mock.py`: fake LLM client for tests, so nothing hits the network
- `dataset.py`: test case format, and a checker for dataset files. The format
  and labelling guide are in [`dataset/README.md`](../../../dataset/README.md),
  and the test cases are in [`dataset/cases.jsonl`](../../../dataset/cases.jsonl)
- `replay.py`: plays a test case back like a chat, one message per key press,
  then shows its labels (`uv run python -m backend.src.eval.replay 3`)
- `agents.py`: the agents under test. `AlwaysAnswerAgent` and `AlwaysAskAgent`
  are baselines at either end of the clarify/answer range, and a real agent
  has to beat both. `PromptedAgent` sends the conversation to a model with a
  versioned prompt, and a labeller decides whether its plain text reply asks
  or answers. Each agent has an `info` with what a run should record about it

Still to come as the eval issues land:

- The real labeller, a separate fixed model checked against hand labels (#45)
- Runner and run logs
- Metrics and reports (over-/under-clarification, question quality, end-to-end)

Tests live in [`tests/eval/`](../../../tests/eval/).

## Prompts

System prompts live in [`prompts/`](../../../prompts/), one file per version
(`clarifier_v001.md`, `clarifier_v002.md`, ...). To change a prompt, add a new
file with the next number instead of editing an old one, so a run's prompt
version always points to the exact text it used. `load_prompt("v001")` reads
one.

Other kinds of prompts follow the same rules, named `<name>_v001.md`, and are
loaded with `load_prompt("v001", name="labeller")`.

`clarifier_v001.md` is a copy of the system prompt the app uses today, so the
first runs measure what the app ships.

## Running against a real model

Fill in `PROVIDER`, `MODEL` and `LLM_API_KEY` in `.env`, then:

```bash
uv run python -m backend.src.eval.llm "hello"
```

This is a manual check only. Tests use the mock client and never call a real
model.

## Dependencies

The running app never imports this package. Eval-only dependencies go in the
`eval` dependency group in the root `pyproject.toml`
(`uv add --group eval <package>`), not in `backend/requirements.txt`, so they
stay out of the backend Docker image.
