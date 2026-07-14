---
date: 2026-07-14
tags: [decision, portfolio, project-data, recurring-work]
project: ai-task-system
related:
  - Projects/portfolio-view.md
  - Projects/AI-Task-System-Architecture.md
---

# Monthly Project Deadline

## Context

Some projects represent recurring monthly work rather than a one-time delivery.
Using an arbitrary date for these projects makes the Portfolio deadline field
misleading.

## Decision

Project deadlines support a monthly cadence option shown in the UI as `毎月`.
The first implementation stores this cadence in the existing `dueDate` string
field as `monthly` so existing project records and date-based workflows keep
working.

## Reason

This keeps the creation flow simple, avoids adding a separate recurrence model
before it is needed, and gives monthly client work a clear visible label.

## Consequences

- Date-based projects continue to use the normal date picker.
- Monthly projects show `毎月` in the UI.
- Future Vault parsing can promote `monthly` into a richer recurrence field if
  monthly, weekly, and custom cycles become necessary.
