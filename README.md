# Empathic-AI-Agent-Fall2026

## Project Background
LLMs answer, but rarely ask. Empathic AI should ask clarifying questions—key to understanding user intent and building steerable agents.

## Project Description
Build an AI Coach prototype that asks helpful questions before responding. The project focuses on multi-turn interactions, data collection, and model behavior tuning.

## How It Would Work / Project Outcome
- [ ] Build agent that detects vague prompts and asks clarifying questions
- [ ] Create a dataset using synthetic flows, human review, or RLHF-style feedback
- [ ] Implement logic for context tracking (scratchpad)
- [ ] Evaluate impact of clarification on final output quality

## Stretch goals / optional:
- [ ] Add empathetic phrasing techniques
- [ ] Explore integration into open-source instruction-tuning pipelines

## Status

PostgreSQL and schema migrations have been added. 

## Getting Started

Create `.env` from `.env.example` if you do not already have one, and set your own PostgreSQL password.
```powershell
Copy-Item .env.example .env
```

After setting the password, run:

```powershell
docker compose up -d --build
```

Compose waits for PostgreSQL, then applies SQL migrations.
The database code has two parts:

- `backend/src/database/connection.py` builds connections from environment variables.
- `backend/src/database/migrations/` contains numbered SQL files. When you want to change the schema, add a new file. DO NOT modify an existing migration.

Migrations run as a separate Compose service. To apply a new migration without rebuilding the backend, run `docker compose run --rm --build migrate`.
