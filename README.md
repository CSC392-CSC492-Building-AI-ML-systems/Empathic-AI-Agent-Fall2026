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

## Getting Started

Create a `.env` from `.env.example` if you do not already have one.

```powershell
Copy-Item .env.example .env
```

The application tables are defined in
[`backend/src/database/schema.sql`](backend/src/database/schema.sql) and managed
in the hosted database.

### Start the backend

Run from the repository root.

```powershell
docker compose up -d --build
```

The backend listens at `http://127.0.0.1:8000` and connects to hosted Supabase.

### Start the frontend

```powershell
cd frontend
npm install
npm run dev
```