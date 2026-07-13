---
date: 2026-07-13
tags: [decision, ordering, tasks, projects, ui]
project: ai-task-system
related:
  - Projects/portfolio-view.md
---

# Project and task ordering

The schedule project list should use user-controlled ordering.

## Decision

- Adding a task from a project section appends the task to the end of that project.
- The project task list no longer reorders tasks automatically by priority or due date.
- Users can reorder project sections with a drag handle.
- Users can reorder tasks with a drag handle.
- Reordering changes only display/order state in the shared task data. It does not change task status, ball holder, due date, priority, or progress.
- Portfolio synchronization should preserve the first-seen project order from task data when deriving projects.

## Rationale

The user expects the list to behave like an operating surface. If the app inserts a newly created task in the middle because of hidden sorting rules, the action feels broken. Manual ordering makes the list predictable and keeps the user's mental model intact.

