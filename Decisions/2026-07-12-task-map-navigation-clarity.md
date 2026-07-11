---
date: 2026-07-12
tags: [ui, navigation, task-flow-map]
project: ai-work-os
related: [Projects/portfolio-view.md]
---

# Task Map Navigation Clarity

## Context

The Task Flow Map screen had two equal-weight navigation buttons:
"Portfolio" and "Project list". The visual treatment made it hard to
understand which action returns to the wider portfolio and which action opens
the selected project's task list context.

## Decision

Replace the equal two-button strip with clearer navigation cards:

- A quieter back action to return to Portfolio.
- A stronger action that explains it opens the project's schedule/task list.

Each action should include a short supporting label so the user can understand
the destination before clicking.

## Consequences

The Task Flow Map becomes easier to navigate without changing its core map
behavior. The UI keeps the dark, simple product tone while making the next
action more self-explanatory.
