# Decision: Manual Portfolio Projects Persist Without Tasks

Date: 2026-07-14

## Context

Portfolio View synchronizes with the Schedule task list so project metrics and
task-derived projects stay aligned. However, users also create project shells
from Portfolio before adding tasks. Treating task data as the only visible
project source made newly created projects disappear when they had zero tasks.

## Decision

Projects created directly from Portfolio are durable manual records. They stay
visible and editable even when no active tasks belong to them. Projects derived
only from task data still follow the Schedule task list.

## Reason

Creating a project is an explicit user action. The product should preserve that
intent and let the user add tasks later without losing the project context.

## Consequences

- Portfolio project records need an origin marker such as `manual` or `task`.
- Synchronization must merge task-derived projects with manual projects that
  currently have no tasks.
- Deleting a manual project remains the explicit way to remove it from the
  active Portfolio surface.
