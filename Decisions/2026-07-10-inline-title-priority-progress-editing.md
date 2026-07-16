---
date: 2026-07-10
tags: [ui, portfolio, task-flow, editing]
project: ai-work-os
related: [Projects/portfolio-view.md]
---

# Inline Title, Priority, And Progress Editing

## Context

Users compare projects and tasks directly from Portfolio View and Task Flow Map.
Opening a separate inspector for every small edit breaks the sense of operating
work in place.

## Decision

Project cards and Task Flow nodes should allow direct editing of the most common
fields in context:

- Project card: project title, progress, and priority score driver.
- Task Flow node: task title and priority.

When a new task is created on the Task Flow Map, the new node should immediately
focus its title field and select the default title. The user should be able to
type the real task name without first clicking into the node.

Project progress should be editable with a bar-style range control, not only a
number field.

When a project's progress is changed to `100%`, all tasks belonging to that
project should also become `100%`. When project progress is changed to any value
below `100%`, task progress should not be automatically changed.

## Reason

Small edits are frequent and should stay close to the user's current visual
context. The 100% project-progress rule expresses project completion as a strong
intent, while avoiding accidental task rewrites for partial project progress.

## Consequences

- Inline inputs must stop propagation so editing does not accidentally select or
  drag nodes.
- Newly created Task Flow nodes need a one-shot autofocus target so focus does
  not keep returning after the user starts moving around the map.
- Project progress changes need to update both portfolio project state and task
  storage only when the new value is exactly `100`.
- Partial project progress remains independent from task progress.
