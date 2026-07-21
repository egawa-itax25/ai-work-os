---
date: 2026-07-21
tags: [decision, team, allocation, ui, mind-map]
project: AI Work OS
related:
  - Projects/team-allocation-view.md
  - Decisions/2026-07-13-team-allocation-view.md
---

# Decision: Team mind map and task inspector

## Context

The Whole Team / Team Allocation View should help a president or manager see
10 to 15 employees' work in one screen, understand concentration of work, and
reassign or edit tasks without leaving the view.

The previous orbit map used employee nodes with small task pills, but the
employee-task relationship was not strong enough and the map looked sparse when
the current data set had only a few people.

## Decision

Evolve the central map into a calm mind-map style operating surface:

- employee nodes are parent nodes;
- each employee's tasks appear as child nodes connected to the parent;
- the "space map" mode must visually read as a mind map, not as a grid of
  employee cards;
- keep list view and load view unchanged while improving only the space map;
- place a whole-company summary node near the center and arrange employee
  parent nodes around it;
- draw thin curved links from the center node to employee nodes and from each
  employee node to task child nodes;
- keep employee parent nodes visible by default, but expand child task nodes
  only for the active employee selected, hovered, focused, or owning the
  selected task;
- distribute the active employee's child task nodes with collision-aware
  offsets and a wider virtual canvas so the mind map does not collapse into
  overlapping labels at narrower desktop widths or when the inspector is open;
- a small sample employee/task set may supplement real data when the workspace
  has fewer than the intended 10 to 15 employees;
- task pills can still be dragged onto employee nodes to change the task owner;
- selecting a task opens a shared right-side task inspector for detail review
  and inline editing;
- assignment changes update `owner` only and do not rewrite
  `currentBallHolder`.

## Reason

Managers need to understand workload distribution and ownership at a glance.
A parent-child map communicates "who owns what" more directly than isolated
cards, while the right inspector preserves the user's context during detail
confirmation and editing.

Showing every employee's child task nodes at the same time creates unavoidable
overlap at the intended 10 to 15 person scale. A single active expansion keeps
the map calm and comparable, then reveals task detail exactly where the manager
is looking.

Update: the map should allow the manager to keep specific employees expanded
when comparing workloads. Hovering an employee previews tasks, clicking pins or
unpins that employee, and multiple pinned employees may stay open. The map
must show a compact control surface for the current pinned count, closing all
expanded employees, and restoring automatic layout. Employee parent nodes may
be dragged to a preferred position, while task child nodes remain automatically
distributed around the parent with an overflow summary when several employees
are expanded.

## Constraints

- Keep the existing Team Allocation View route and surrounding layout.
- Do not replace Portfolio, Project Task List, or Task Flow Map.
- Keep the visual language dark, simple, and restrained.
- Avoid strong per-employee color coding.
- Use status colors only for meaning: red for risk, yellow for waiting/caution,
  green for complete, blue for normal/focus.
