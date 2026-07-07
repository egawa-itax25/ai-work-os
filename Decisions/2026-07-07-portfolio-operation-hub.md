---
date: 2026-07-07
tags: [decision, ui, portfolio, interaction, creation]
project: ai-task-system
related:
  - Projects/portfolio-view.md
  - Projects/AI-Task-System-Architecture.md
  - Preferences/ui.md
---

# Portfolio Operation Hub

## Context

Portfolio View already lets users compare multiple projects by progress,
priority, current ball holder, and stalled state.

The next step is not to add another management screen. Users should be able to
act from the same context where they understand the work.

## Decision

Evolve Portfolio View into the main operation hub for creating and editing
projects and tasks.

The interaction model is:

```text
Portfolio View
Project Inspector
Create Project Modal
Create Task Modal
Project Flow
Task Inspector
Knowledge
```

Creation and editing should happen in centered modals, inspectors, inline fields, or
context menus that preserve the user's current spatial and comparison context.

Do not force users into separate project or task administration pages for
ordinary creation and editing.

## UX Rules

- Keep "viewing" and "acting" in the same place.
- Use one shared Project Inspector for list selection and map node selection.
- Keep the default Portfolio surface calm and scannable.
- Reveal editing controls only on selection, hover, context menu, drawer, or
  inspector action.
- Use centered creation modals so the action feels connected to the current
  canvas instead of becoming a separate side administration screen.
- Clicking outside a creation modal should close it and return to the previous
  Portfolio context without changing state.
- Use inline editing for small project and task changes.
- Auto-save minor edits and show a quiet saved state.
- Show undo-capable feedback after changes.
- Confirm destructive or dependency-changing operations before applying them.

## Global Creation

The app should expose a global "＋ 作成" action.

Initial actions:

- プロジェクトを作成
- タスクを作成

Future actions:

- メモを作成
- AIへの自然言語指示

The action should be callable from the UI and designed for keyboard shortcut
activation.

## Data Consequences

Project data must support:

- Project objective.
- Due date.
- Owner.
- Progress.
- Current ball holder and holding duration.
- Next milestone.
- AI insight.
- Risk text.
- Local creation and editing before Vault parsing is implemented.

Task data must support:

- Current ball holder, separate from owner.
- Ball holding start date.
- Progress.
- Next action.
- Dependencies.

The first implementation can persist editable mock data in localStorage, but
the field names should remain compatible with future Vault frontmatter and
Dataview-style parsing.

## Reason

An AI Work OS should let users move work at the moment they notice what matters.
Splitting overview and editing into separate screens breaks flow and makes the
product feel like a conventional admin tool.
