# Eval dataset

The test conversations we use to judge the model. This page explains what a
test case looks like and how to label one, so that two people labelling the same
conversation end up with the same result.

[`cases.jsonl`](cases.jsonl) holds the test cases the model gets scored on.
[`examples.jsonl`](examples.jsonl) has one example for each category. It shows
the format and isn't part of the scored dataset.

## What a test case is

A test case is a conversation so far, plus what the agent should do next. It's
not just a single prompt, because the agent decides again after every reply. So
the same conversation can become more than one test case, one at each point
where we want to check the decision.

Dataset files are JSONL, so each test case is one line of JSON. Here's one case
spread out so it's easier to read:

```json
{
  "id": "vague-get-better-at-running",
  "category": "vague",
  "history": [
    {"role": "user", "content": "I want to get better at running."}
  ],
  "gold_kind": "clarify",
  "missing_slots": ["what better means to them"],
  "hidden_intent": "They can already run 5K and want to finish a 10K race in three months. They can train three days a week.",
  "good_questions": [
    {
      "text": "What does getting better look like for you: going farther, going faster, or training for a race?",
      "reason": "Targets the one thing that changes the plan the most, and gives easy options to pick from."
    }
  ],
  "bad_questions": [
    {
      "text": "How old are you? How often do you run? Do you have any injuries?",
      "reason": "Asks three things at once, and none of them get at the goal."
    }
  ]
}
```

## Fields

| Field | What it holds | Rules |
| --- | --- | --- |
| `id` | A short name for the case | Unique in the file; lowercase letters, numbers and dashes |
| `category` | Which situation this is (see below) | One of the seven categories |
| `history` | The conversation so far | Starts and ends with the user, and takes turns between user and assistant |
| `gold_kind` | The right next move: `clarify` or `answer` | Has to match the category |
| `missing_slots` | What the agent still doesn't know that would change its reply | Depends on the category |
| `hidden_intent` | What the user actually wants, including details they haven't said yet | Required |
| `good_questions` | Good questions to ask next, each with a `text` and a `reason` | At least one when clarifying; none when answering. Each one asks one thing |
| `bad_questions` | Questions the agent shouldn't ask, each with a `text` and a `reason` | At least one when clarifying; optional when answering, but worth adding |

## How to label a case

Read only the `history`, and go through these in order. Stop at the first one
that fits.

1. **Did the user tell the agent to stop asking?** Use `just_answer`.
2. **Does the agent have what it needs for a useful reply?** Use `clear`. If the
   user just gave that information in reply to a question, use
   `reply_fills_gaps`.
3. **Is the message mostly about how the user feels, with no clear request?** Use
   `emotional`.
4. **Would a wrong guess cost the user very little?** Use `low_stakes`.
5. **Otherwise something important is missing.** Use `vague`. If the user already
   answered an earlier question but something is still missing, use
   `reply_partly_fills_gaps`.

Some things that make these easier to decide:

- **Would the reply really change?** Only count something as missing if knowing
  it would change the reply in a way the user cares about. Nice-to-have details
  don't count, because the agent can pick a sensible default.
- **What does a wrong guess cost?** If a bad guess takes a few seconds to correct,
  like a book recommendation, it's low stakes. If the user would act on it or
  lose real time, like a training plan or a career decision, it isn't.
- **Emotional language alone doesn't make a case `emotional`.** "I'm so stressed,
  write me a reminder to pay rent on Friday" has a clear request, so it's `clear`.
- **Leave out crisis or self-harm messages.** The right response there is about
  safety and getting help, which isn't what these scores measure.

## Categories

The first three should ask and the last four should answer. We need both, so
that we catch the agent asking too little as well as asking too much.

| Category | Situation | `gold_kind` | `missing_slots` | Example last message |
| --- | --- | --- | --- | --- |
| `vague` | The request could mean several different things | `clarify` | At least one | "I want to get better at running." |
| `reply_partly_fills_gaps` | The user replied, but something important is still missing | `clarify` | At least one | "I'm burnt out, so I think I want to leave." |
| `emotional` | The user is upset and hasn't made a clear request | `clarify` | At least one | "I bombed another interview. I don't think I'm good enough." |
| `clear` | The agent has what it needs | `answer` | None | "Write me a 3-item agenda for a check-in with my manager..." |
| `reply_fills_gaps` | The user's reply gave the agent what it needs, so it should stop asking | `answer` | None | "A 10K in three months. I can already run 5K." |
| `low_stakes` | Details are missing, but a wrong guess costs little, so answer and state the assumption | `answer` | At least one | "Can you recommend a good book for my flight?" |
| `just_answer` | The user told the agent to stop asking, so answer with stated assumptions | `answer` | At least one | "I don't have time for questions, just give me something." |

`reply_fills_gaps` and `reply_partly_fills_gaps` also need an earlier assistant
message in the `history`.

## Clarify or answer: mixed replies

The model's replies won't always be just a question or just an answer, so here's
how to label those:

- A usable answer with a follow-up question at the end counts as **`answer`**. The
  user got something they can use. For example: "Here's a three-day plan... Want me
  to adjust it for your schedule?"
- A question with some friendly text around it counts as **`clarify`**. For example:
  "Sorry to hear that. What part of the interview felt worst?"

## Writing the other fields

**`missing_slots`** are short descriptions, like `"subject"` or `"what better means
to them"`. On `low_stakes` and `just_answer` cases they're the things the agent
should state its assumptions about.

**`hidden_intent`** is what a simulated user will use to reply to the agent later
on, and what the final answer gets compared to. Write it with enough detail to
answer a question about every missing slot. It shouldn't contradict anything in
the `history`.

**`good_questions`** should target a missing slot, ask one thing, and not repeat
something the user already said. On `emotional` cases they should acknowledge how
the user feels first.

**`bad_questions`** are most useful when they're mistakes a model would really make:
asking several things at once, asking something the user already answered, asking
something that wouldn't change the reply, or being too general ("can you tell me
more?"). The `reason` should say what's wrong with the question, since these can
become training data later on.

## Checking a file

```bash
uv run python -m backend.src.eval.dataset dataset/examples.jsonl
```

This lists every problem in the file with its line number and case id:

```text
dataset/cases.jsonl:12 (vague-new-laptop): gold_kind must be 'clarify' for category 'vague'
dataset/cases.jsonl:30 (clear-email): an answer case can't have good questions, since it shouldn't ask
```

A file that passes can still be mislabelled, since the checker can't judge whether
a conversation really is vague. That's what cross-checking between teammates is
for. If two people disagree on a label, settle it and update this guide if it
didn't help decide.
