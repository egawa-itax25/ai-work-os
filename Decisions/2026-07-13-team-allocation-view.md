---
date: 2026-07-13
tags: [decision, team, allocation, ui]
project: ai-task-system
related:
  - Projects/team-allocation-view.md
  - Projects/portfolio-view.md
---

# Team allocation view

## Decision

Add a new Team Allocation View at `/team`.

This page is an additional operating surface and does not replace Portfolio,
Project Task List, or Task Flow Map.

The view summarizes all active projects and tasks by employee so the user can
see workload, progress, overdue work, and ownership distribution at a glance.

Task assignment from this page changes the task owner only. It does not change
the current ball holder.

## Reason

The user wants to understand all employees' project/task load and allocate work
without losing the wider operating context. Owner assignment and current ball
holder are different business concepts, so drag assignment must not silently
rewrite ball ownership.

## Consequences

- The new page reads and writes the shared task data used by existing task
  surfaces.
- Updating a task owner from `/team` should be reflected in Portfolio and the
  project task list through the shared local task store.
- Future versions can add richer permission, capacity, and AI recommendation
  logic without changing the existing Portfolio workflow.
