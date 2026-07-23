---
date: 2026-07-23
tags: [portfolio, tasks, persistence, sample-data]
project: AI Work OS
---

# Prevent sample projects from reappearing

## Decision

Production workspace loading must never inject development sample projects or
tasks when local or cloud state is missing, temporarily unavailable, or invalid.

- Empty persisted state is a valid user state and remains empty.
- Initial sample records are fixtures only; they are not fallback user data.
- Legacy sample task IDs are removed during normalization before local/cloud
  merge so they cannot recreate projects through task-derived synchronization.
- User-created projects and tasks are preserved unchanged.

## Reason

The legacy tasks `sample-1` and `sample-2` used the project name
`営業改善`. When a task store fell back to initial sample data, Portfolio's
task-to-project synchronization created an unsolicited `営業改善` project.
This also allowed deleted sample content to return after reload or sync.

## Verification

- Missing task storage resolves to an empty task list, not sample tasks.
- Legacy sample task IDs do not survive normalization from local or cloud data.
- A user-created project or task named `営業改善` remains when its ID is not a
  retired sample ID.
- Portfolio, Schedule, Task Flow Map, and Team views use empty production
  fallbacks.
- A reload does not recreate `営業改善` unless the user has a real project or
  non-sample task with that name.
