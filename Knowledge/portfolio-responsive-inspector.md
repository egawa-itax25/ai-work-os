---
date: 2026-07-23
tags: [portfolio, responsive, inspector, accessibility]
project: ai-work-os
related:
  - Projects/portfolio-view.md
  - Decisions/2026-07-23-portfolio-selection-and-inspector-editing.md
---

# Portfolio Responsive Inspector

## Problem

A fixed project Inspector column competes with the Portfolio comparison surface
once the navigation rail and normal page padding are included. Breakpoints based
only on the center component’s ideal width can still leave cards, tabs, and task
lanes squeezed.

## Solution

- Keep the main column at `minmax(0, 1fr)` and apply `min-width: 0` through the
  major nested surfaces.
- Reserve the 360px Inspector column only from a 1440px viewport.
- Below 1440px, remove the Inspector from layout flow and open it as a fixed
  right drawer with backdrop, Escape handling, focus containment, body scroll
  lock, and focus restoration.
- Keep cards at a stable width in a horizontal comparison strip instead of
  shrinking their contents.
- Keep filters and workspace tabs single-line and horizontally scrollable.
- Do not use viewport-only Tailwind column breakpoints inside a center area
  narrowed by a persistent sidebar. Use a feature-level media rule when the
  available content width needs a later breakpoint.

## Save Feedback

For localStorage-backed editing, an explicit state machine still improves
trust: idle, pending, saving, saved, error, offline, and retrying. Debounce the
write, preserve entered state on failure, provide retry, and warn before unload
while a change is not safely stored.

## Verification

Check page-level overflow with both `documentElement.scrollWidth` and
`clientWidth`; horizontal card or tab scrollers are intentional and should not
be mistaken for body overflow. At each responsive breakpoint, also verify the
Inspector's computed `display`, `position`, and width, then exercise drawer
focus, Escape close, scroll lock restoration, and trigger focus restoration.
