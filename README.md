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
1. Install uv
Run this in PowerShell:
`powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"`
Fully close and reopen your terminal application. If using VS Code’s terminal, restart VS Code.

2. Check that uv is available
Enter this in Powershell:
`uv --version`
If you see “uv is not recognized,” run the following to update the current session’s command search path, then check again:
`$env:Path = "$env:USERPROFILE\.local\bin;$env:Path"`

3. Navigate to the project folder
Open PowerShell in the repository’s main folder—the one containing pyproject.toml

4. Install project dependencies
Enter this in the Powershell:
`uv sync`

5. Enable automatic checks before commits
Everyone needs to run this once per local copy of the repository.
`uv run pre-commit install`

To check all tracked files immediately:
`uv run pre-commit run --all-files`
If a hook modifies files, review and stage those changes before trying to commit again.

Reminders:
Use `uv add library-name` to add any new library. This will update pyproject.toml and uv.lock, so commit and push both pyproject.toml and uv.lock.
After a new library is added, everyone needs to run uv sync after git pull.
