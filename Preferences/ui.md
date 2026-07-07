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

Canvas drag should feel direct and fluid. When interaction performance and
visual decoration conflict, prioritize pointer response, frame pacing, and
stable transforms.

## Responsive Layout

PC is the primary operating surface. Preserve the immersive spatial canvas,
drag, pan, zoom, and inspector behavior on desktop.

Smartphone access is primarily for checking the current state and moving
between views. Do not force desktop absolute-positioned overlays into a narrow
screen. Use an automatic mobile layout with stacked panels, compact navigation,
readable Japanese text, and no overlap with browser controls.

## Review Links

When reporting completed UI changes, include the latest relevant review links
every time so the user can open the current screen quickly from phone or PC.
Prefer the Vercel URL for mobile review:

- Cockpit: `https://ai-work-os-preview.vercel.app/`
- Portfolio: `https://ai-work-os-preview.vercel.app/portfolio`
- Tasks: `https://ai-work-os-preview.vercel.app/tasks`

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

Portfolio operations should not turn the screen into a dense administration
page. Creation and editing controls should appear only when useful:

- Global "＋ 作成" is always available but compact.
- Project and task creation use centered modals that keep the current screen
  visible behind them.
- Clicking outside a creation modal closes it and returns to the previous
  screen state.
- Project editing happens in the shared Project Inspector.
- Task creation uses the current project preselected when
  possible.
- Context menus are available through right click or "…" buttons.
- Minor edits auto-save with quiet "保存中…" and "保存済み" feedback.
- Recent changes should show an undo-capable toast.
