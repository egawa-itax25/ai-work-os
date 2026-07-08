---
date: 2026-07-08
tags: [decision, ui, navigation, cockpit]
project: ai-task-system
related:
  - Projects/AI-Task-System-Architecture.md
  - Preferences/ui.md
  - Decisions/2026-07-06-ai-work-os-spatial-canvas.md
---

# Persistent Cockpit Navigation

## Context

The cockpit is the emotional center of the AI Work OS, but users still need a
stable way to move to Portfolio, tasks, schedule, knowledge, settings, and other
work surfaces.

When the user entered the cockpit, the shared side navigation disappeared. This
made the cockpit feel disconnected from the rest of the product and made it
hard to move between views.

## Decision

The desktop cockpit should also show the shared side navigation by default.

The navigation must be hideable so the user can return to the fully immersive
canvas when they want more space. When hidden, a small Japanese "メニュー" control
restores the side navigation.

## Reason

The product should not separate "where I understand work" from "where I move to
the next view." Persistent navigation keeps the cockpit usable as a command
surface without sacrificing the spatial canvas.

## Consequences

- The cockpit is no longer a special route that removes the main navigation.
- The side navigation state can be stored locally so users can keep their
  preferred immersive or navigational mode.
- Mobile can continue to use compact stacked navigation because phone access is
  mainly for review and light movement.

## Revisit When

- The side navigation visually competes with cockpit canvas controls.
- A future command palette or spatial navigation layer fully replaces the side
  navigation without reducing discoverability.
