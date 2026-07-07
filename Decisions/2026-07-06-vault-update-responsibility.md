---
date: 2026-07-06
tags: [decision, vault, process]
project: ai-task-system
related:
  - .cursor/rules/01-obsidian.mdc
  - Projects/AI-Task-System-Architecture.md
---

# Vault Update Responsibility

## Context

The project uses Obsidian Vault as the Single Source of Truth. As the system grows, changes can affect multiple categories at once: decisions, project state, knowledge, tasks, and preferences.

Without explicit update responsibility, an AI agent may update only one note type or only the code/UI, leaving the Vault incomplete.

## Decision

`01-obsidian.mdc` will define a single Vault Update Responsibility section that maps each kind of change to the required Vault folder.

When one change belongs to multiple categories, all relevant Vault notes must be updated.

Vault updates will be event-driven. Each event has fixed required update targets, and those updates cannot be skipped when the event occurs.

## Reason

The Vault must remain complete enough for humans and AI agents to reconstruct why work changed, what state the project is in, what knowledge was learned, and what task state is authoritative.

## Consequences

- Design and architecture changes require `Decisions/`.
- Project state changes require `Projects/`.
- Reusable learning requires `Knowledge/`.
- Task state changes require `Tasks/`.
- Long-term user preferences require `Preferences/`.
- Vault Report must explain why each Vault update was made.
- Event-to-target mappings are mandatory. For example, technology selection requires `Decisions/`, `Knowledge/`, and `Projects/`.

## Links

- `.cursor/rules/01-obsidian.mdc`
- `Projects/AI-Task-System-Architecture.md`
