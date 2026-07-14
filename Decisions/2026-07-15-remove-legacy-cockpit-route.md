---
date: 2026-07-15
tags: [decision, ui, navigation]
project: ai-task-system
related:
  - Projects/portfolio-view.md
  - Preferences/ui.md
  - Decisions/2026-07-08-persistent-cockpit-navigation.md
---

# Remove Legacy Cockpit Route

## Context

The old spatial cockpit at `/` was still reachable even though the current
product direction has moved to Portfolio, Schedule, Project, Team, Settings,
Trash, and Completed as the active work surfaces.

The user explicitly pointed out that the old cockpit screen is no longer wanted.

## Decision

The root route `/` should no longer render the old cockpit screen.

It should redirect to `/portfolio`, because Portfolio View is the current
operation hub for comparing projects, editing projects, adding tasks, and
moving into project task flows.

The old cockpit component may remain in the codebase temporarily as legacy
reference material, but it should not be part of the active navigation or
default product entry path.

## Reason

Keeping the old cockpit reachable creates confusion and makes the product feel
like it has two competing home screens. Redirecting `/` to Portfolio preserves a
clear first action surface without a risky visual rewrite.

## Consequences

- Opening the product root moves users to Portfolio View.
- Existing `/portfolio` links continue to work.
- The old cockpit is no longer an active UI surface.
- Any future command-room concept should be redesigned as a deliberate new
  feature instead of reusing the legacy cockpit screen.
