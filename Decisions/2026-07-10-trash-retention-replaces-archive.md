---
date: 2026-07-10
tags: [decision, trash, deletion, archive]
project: ai-work-os
related: [Projects/portfolio-view.md]
---

# Trash Retention Replaces Archive

## Context

Project and task menus had both archive and delete-like behavior. This made the
operation model harder to understand because archive and delete both meant
"remove from active work".

## Decision

Use a single deletion model:

- "削除" moves projects and tasks into a "削除済み" area.
- Deleted projects and tasks are retained for 30 days.
- The side navigation includes "削除済み".
- Items in "削除済み" can be restored while retained.
- Archive should be removed from the visible project and task menus.

## Reason

One reversible deletion model is easier to understand than separate archive and
delete concepts. A 30-day retention area keeps user work safe while keeping
active project and task surfaces clean.

## Consequences

- Project deletion should preserve the deleted project, its project tasks, and
  project connections in trash metadata.
- Task deletion should preserve the deleted task in trash metadata.
- Trash cleanup can remove items older than 30 days from the trash area.
