# AGENTS.md

This repository is an AI task management system that treats an Obsidian Vault as an external brain.

## Philosophy

The Vault is the durable memory of the project. Chat is useful for momentum, but Markdown is the source of truth for knowledge, decisions, tasks, preferences, and product direction.

The system should feel like a near-future operating layer for work: spatial, calm, dark, glassy, draggable, and node-based. It should help humans and AI agents reason together without hiding important context in temporary conversation.

## Mission

- Build a long-lived AI task management system.
- Use Obsidian-compatible Markdown as the knowledge and specification layer.
- Keep human-readable notes useful for AI agents.
- Let decisions, tasks, and preferences accumulate as durable project memory.
- Improve the product through small, safe, reversible steps.

## Working Mindset

- Read the Vault before changing the product.
- Capture durable context in notes instead of relying on chat memory.
- Keep the system understandable to the next human or AI agent.
- Preserve user work and make changes with care.
- Prefer clarity, continuity, and steady progress over large speculative rewrites.

## Rule Location

Implementation and operational rules live in `.cursor/rules/`.

Start with:

- `.cursor/rules/00-project.mdc`
- `.cursor/rules/project-rules.mdc`

Specialized rules cover Obsidian, TypeScript, React, UI, task-system behavior, documentation, git, and quality.
