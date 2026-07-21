---
date: 2026-07-13
tags: [spec, team, allocation, task-assignment]
project: ai-task-system
related:
  - Decisions/2026-07-13-team-allocation-view.md
  - Decisions/2026-07-21-team-mind-map-detail-inspector.md
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
- Center: employee mind map with a whole-team summary and employee parent
  nodes.
- Employee nodes: initials, name, department/role, project count, task count,
  average progress, workload status, overdue count, and waiting count.
- Child task nodes: task title, project, status, due date, and priority.
- Right: task inspector that opens when a task is selected and supports direct
  editing without leaving the map.
- Bottom: team summary metrics.

When the number of employees grows, the space map must still read as a mind
map, not as a grid of employee cards. Place the whole-team summary near the
center, arrange employee parent nodes around it, and draw thin curved links
from the center to each employee. Each employee then owns compact child task
nodes connected by subtler branches. The layout may use fixed anchor points and
scrollable canvas space to avoid overlap, but the visual structure must remain
node-and-branch based.

The page is additive. Do not change existing Portfolio, task list, or task map
behavior to create this view.

When the workspace has fewer than 10 to 15 visible people, sample employees and
sample tasks may be added to the Team Allocation View only so the management
experience can be evaluated at the intended scale. Real workspace tasks remain
the source of truth for saved edits.

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
- Employee map uses a calm mind-map constellation with a central whole-team
  node, employee parent nodes, and child task nodes.
- Detail inspector for selected tasks.
- Task drag-to-assign to employee nodes.
- Filters for member, status, project, and priority.
- Team summary metrics.

Next:

- Replace sample data with real employee master data when available.
- Add role/department fields to the durable data model.
- Add richer capacity and overload recommendations.
