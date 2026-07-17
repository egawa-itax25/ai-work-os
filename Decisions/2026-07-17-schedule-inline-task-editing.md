---
date: 2026-07-17
tags: [decision, schedule, tasks, inline-editing, ux]
project: ai-task-system
related:
  - Projects/portfolio-view.md
  - Decisions/2026-07-13-project-task-ordering.md
  - Decisions/2026-07-14-supabase-workspace-sync.md
---

# Schedule task list inline editing

## Context

The project-by-project task list is now a daily operating surface. The user
does not want to hunt for a small right-side edit button before changing a task.
Editing should happen where the user is already looking.

## Decision

The first implementation focuses only on the schedule tab's project task list.
Portfolio cards and Task Flow Map nodes can adopt the same behavior later.

- A single click selects a task row.
- Task title and memo/detail fields become editable on double click.
- Hover only hints that a field is editable.
- Title edit saves on Enter or outside click, cancels on Escape, and respects
  IME composition.
- Memo edit saves on Shift+Enter or outside click, cancels on Escape, and keeps
  normal Enter for line breaks.
- Ball, status, priority, owner, and deadline use compact inline controls.
- Ball choices are `自分`, `相手`, and `完了`; `AI` is not a primary handoff choice.
- Owner choices include existing owners and `未設定`, with free text allowed.
- Deadline supports `なし`, date, and `毎月`. `毎月` is stored distinctly from a
  normal date.
- The right-side `編集` button is removed. `削除` stays visible.
- Delete key removes the currently selected task when the focus is not inside
  an input, textarea, select, or button.
- Reordering still uses the visible drag handle only.

## Completion coupling

- Setting ball to `完了` sets status to `完了`.
- Setting status to `完了` sets ball to `完了`.
- When a task is moved back from completed work, restore the immediately
  previous non-complete status when available.

## Persistence

Inline edits commit on save, not on every keystroke. The committed task list is
written through the shared synced-state helper so local cache and Supabase state
stay aligned.

## Data loss note

The schedule list must not introduce a path where an empty remote state
overwrites a non-empty local task list. The Supabase workspace-sync decision
continues to be the guardrail: local non-empty state should seed the remote
workspace if the remote value is empty.
