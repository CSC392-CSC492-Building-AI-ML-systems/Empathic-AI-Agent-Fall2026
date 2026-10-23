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

This package is empty for now; it grows as the eval issues land:

- LLM access (swappable model/provider, plus a mock for tests)
- Agents under test (prompted stub agent, baselines)
- Runner and run logs
- Metrics and reports (over-/under-clarification, question quality, end-to-end)

Tests live in [`tests/eval/`](../../../tests/eval/).

## Dependencies

The running app never imports this package. Eval-only dependencies go in the
`eval` dependency group in the root `pyproject.toml`
(`uv add --group eval <package>`), not in `backend/requirements.txt`, so they
stay out of the backend Docker image.
