---
date: 2026-07-06
tags: [preferences, ui, japanese]
project: ai-task-system
related:
  - Decisions/2026-07-06-japanese-spatial-canvas-polish.md
---

# UI Preferences

## Japanese First

Visible product UI should be Japanese-first for this project.

Apply Japanese to:

- Menus
- Buttons
- Headings
- Explanatory text
- Labels
- Dummy data
- AI messages
- Status text
- Tooltips

Source code, variable names, file names, and component names may remain English.

Development-only overlays that appear on top of the product, such as framework
route indicators or debug menus, should be hidden during visual review when they
introduce English UI or distract from the AI Work OS experience.

## Interaction Feel

When choosing between more features and better feel, prefer animation, spacing, smoothness, and intuitive operation.

The product should feel like an AI Work OS for manipulating work flow, not a conventional task dashboard.

## Portfolio View

Portfolio-level screens should be calmer than the single-project cockpit.

Use near-black navy, white, gray, and one pale blue accent as the default visual
language. Color should communicate state, not decorate projects:

- Red: stalled, overdue, or severe risk only.
- Yellow: waiting or attention only.
- Green: completed only.
- Purple: subtle AI processing only.

Do not assign unique colors per project. Avoid strong neon, large glow, and
game-like space effects in Portfolio View.

Interactions should feel precise and quiet: row hover, node selection, pan,
zoom, filter switching, and detail expansion should use short 150ms to 300ms
transitions.
