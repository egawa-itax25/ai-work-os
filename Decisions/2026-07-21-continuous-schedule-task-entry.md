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

In the schedule tab project task list, a newly created task starts with an empty
title field focused. The UI must not prefill `新しいタスク`, so the user can type
immediately without deleting placeholder content. When the title field is
active, pressing Enter should commit the current title and create the next task
at the end of the same project, with another empty title field focused
immediately.

## Interaction Rules

- Enter on a task title saves the title and creates another task in the same
  project.
- IME composition Enter must not create a task, so Japanese text conversion can
  be confirmed normally.
- Escape cancels the current title edit.
- A newly created task keeps an empty title only while the title field is being
  edited. If the user commits or leaves the field while it is still empty, save
  it as `無題のタスク`.
- Quick task creation from Task Flow Map follows the same empty-title rule and
  focuses the new task title immediately.
- Memo/detail fields keep the existing rule: Shift+Enter saves, normal Enter
  inserts a line break.
- Empty titles are saved as `無題のタスク` before the next input row is created.
- The task is inserted at the end of the project section, preserving the current
  project grouping and ordering behavior.

## Persistence

The committed task list continues to use the shared synced-state helper so local
storage and Supabase workspace state stay aligned.
