---
date: 2026-07-16
tags: [decision, ui, task-inspector, links]
project: ai-task-system
related:
  - Projects/portfolio-view.md
  - Preferences/ui.md
---

# Clickable Task Inspector Links

## Context

Users paste reference URLs into Task Inspector text fields while working. A
plain textarea preserves the note, but URLs inside it cannot be opened directly,
which forces copy-and-paste and breaks the flow.

## Decision

Detect `http://` and `https://` URLs in Task Inspector next-action/detail text
and render a compact "検出したリンク" preview below the editable field. Each URL
opens in a new tab.

## Reason

The Task Inspector should remain the place where a task is understood and acted
on. Turning pasted URLs into usable references keeps the user in context without
replacing the editable note field with a separate read-only mode.

## Consequences

- The textarea remains editable and continues to auto-save the task text.
- URLs are clickable from a nearby preview area.
- Future note fields can reuse the same URL extraction behavior.
