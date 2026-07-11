---
type: decision
date: 2026-07-12
status: accepted
---

# Codex-style sidebar navigation

## Context

The existing desktop sidebar uses large glass panels and wide menu rows. The
user wants the navigation to feel closer to the Codex sidebar: compact, calm,
sectioned, and list-based.

## Decision

Use a Codex-style sidebar for desktop navigation:

- compact brand header instead of a large card
- section labels for navigation groups
- small list rows with active highlight
- subtle drag handles for menu order
- keep the hide/show affordance
- keep Japanese UI labels

The change is visual and structural only. It should not alter routes, task
data, project data, or the existing content pages.

## Consequences

- The sidebar feels lighter and more like an operating workspace.
- More vertical room is available for future pinned projects or task shortcuts.
- Existing route behavior and menu ordering persistence remain intact.
