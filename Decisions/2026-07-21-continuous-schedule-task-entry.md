---
date: 2026-07-21
tags: [decision, schedule, tasks, ux, keyboard]
project: ai-task-system
related:
  - Projects/portfolio-view.md
  - Decisions/2026-07-17-schedule-inline-task-editing.md
---

# Continuous schedule task entry

## Context

The project-by-project schedule list is used to quickly add many tasks to the
same project. Opening the add action repeatedly interrupts the flow, especially
when the user is entering task names one after another.

## Decision

In the schedule tab project task list, a newly created task starts with its title
field focused. When the title field is active, pressing Enter should commit the
current title and create the next task at the end of the same project, with the
new task title focused immediately.

## Interaction Rules

- Enter on a task title saves the title and creates another task in the same
  project.
- IME composition Enter must not create a task, so Japanese text conversion can
  be confirmed normally.
- Escape cancels the current title edit.
- Memo/detail fields keep the existing rule: Shift+Enter saves, normal Enter
  inserts a line break.
- Empty titles are saved as `無題のタスク` before the next input row is created.
- The task is inserted at the end of the project section, preserving the current
  project grouping and ordering behavior.

## Persistence

The committed task list continues to use the shared synced-state helper so local
storage and Supabase workspace state stay aligned.
