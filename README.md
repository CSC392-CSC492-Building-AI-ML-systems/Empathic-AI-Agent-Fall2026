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

Project setup is still in progress. This README will be updated as the architecture takes shape.

## Getting Started

Before starting, git clone the repository.
### 1. Install uv
**macOS/Linux:** Run this in your terminal:
`curl -LsSf https://astral.sh/uv/install.sh | sh`

**Windows:** Run this in PowerShell:
`powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"`.

Fully close and reopen your terminal application. If using VS Code’s terminal, restart VS Code.

### 2. Check that uv is available
Enter this in your terminal:
`uv --version`.

If you see “uv: command not found” (macOS/Linux) or “uv is not recognized” (Windows), run the following to update the current session’s command search path, then check again:
- **macOS/Linux:** `export PATH="$HOME/.local/bin:$PATH"`
- **Windows (PowerShell):** `$env:Path = "$env:USERPROFILE\.local\bin;$env:Path"`

### 3. Navigate to the project folder
Open your terminal in the repository’s main folder—the one containing pyproject.toml.

### 4. Install project dependencies
Enter this in your terminal:
`uv sync`.

### 5. Enable automatic checks before commits
Everyone needs to run this once per local copy of the repository.
`uv run pre-commit install`.
To check all tracked files immediately:
`uv run pre-commit run --all-files`.
If a hook modifies files, review and stage those changes before trying to commit again.

### Reminders:
Use `uv add library-name` to add any new library. This will update pyproject.toml and uv.lock, so commit and push both pyproject.toml and uv.lock after adding the library.
After a new library is added, everyone needs to run `uv sync` after git pull.

## Run with Docker

This is so that the same environment (api, postgres, redis, etc.) is run for every contributor

1. Make an `.env` file using the `.env.example` file as a template. Add actual values to your `.env` and do not commit it (it is gitignored but just keep in mind)
2. Run the docker compose using the file in the `infra/` folder:
   
   ```cd infra && docker compose up --build```
3. The api container listens on `http://localhost:8000` once it's up.

Postgres and redis are included now so they're ready for later sprints, even though they're not connected to anything in the app yet.
