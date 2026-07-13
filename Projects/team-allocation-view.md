---
date: 2026-07-13
tags: [spec, team, allocation, task-assignment]
project: ai-task-system
related:
  - Decisions/2026-07-13-team-allocation-view.md
  - Projects/portfolio-view.md
---

# Team Allocation View

## Purpose

Team Allocation View helps the user understand all employees' projects and
tasks in one place, then reassign tasks while keeping the same context.

The user should quickly understand:

- Who has many tasks.
- Which employee owns overdue work.
- Which projects each employee is involved in.
- Which tasks can be reassigned.
- How team-level progress is distributed.

## Route

```text
/team
```

Primary navigation label:

```text
全体プロジェクト
```

## Layout

Use the same dark, calm product UI as Portfolio.

- Left: view and filter controls.
- Center: employee orbit map with a whole-team summary in the middle.
- Employee nodes: initials, name, average progress, task count, and short task
  pills.
- Bottom: team summary metrics.

The page is additive. Do not change existing Portfolio, task list, or task map
behavior to create this view.

## Assignment Behavior

Dragging a task pill onto an employee node assigns that task's owner to the
target employee.

This operation updates:

```yaml
owner: target employee
```

It must not update:

```yaml
currentBallHolder
```

Reason: the person responsible for the task and the person/entity currently
holding the ball are separate concepts.

## Data Source

The first implementation uses the shared local task store already used by the
task surfaces.

Future implementation should replace this with Vault parsing/write-back while
keeping the same conceptual fields.

## Implementation Status

Implemented:

- New `/team` page.
- Primary navigation entry labeled `全体プロジェクト`.
- Employee workload map derived from shared task data.
- Task drag-to-assign to employee nodes.
- Filters for member, status, project, and priority.
- Team summary metrics.
