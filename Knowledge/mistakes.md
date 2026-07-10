---
date: 2026-07-06
tags: [mistakes, process]
project:
related: []
---

# Mistakes

Use this note only when the user gives an explicit correction and both are true:

- The mistake can reasonably recur.
- A concrete prevention rule can be written.

## Entries

### 2026-07-08 - Cockpit navigation disappeared

- Mistake: The shared side navigation was hidden on the cockpit route, so
  entering "司令室" removed the user's main movement surface.
- Prevention: Do not make immersive views trap the user. Keep a visible way to
  move between major screens, and make immersion an explicit hide/show choice.

### 2026-07-08 - Embedded map zoom fought page scroll

- Mistake: Portfolio Flow Map zoom reacted to every wheel event, so users trying
  to scroll the page also resized the map.
- Prevention: On scrollable pages, embedded canvas zoom should require
  Shift+scroll or another deliberate modifier. Plain wheel/trackpad movement
  should remain page scrolling.

### 2026-07-08 - Vercel preview tracked the wrong repository

- Mistake: The public preview domain `ai-work-os-preview.vercel.app` was backed
  by the Vercel project `ai-work-os-preview`, which was connected to
  `egawa-itax25/ai-work-os-preview`, while development commits were pushed to
  `egawa-itax25/ai-work-os`.
- Prevention: Before assuming a deploy is stale, compare the Vercel project's
  connected Git repository with the active development repository. The preferred
  source repository for this product is `egawa-itax25/ai-work-os`.

### 2026-07-09 - Japanese action labels wrapped vertically

- Mistake: Compact project card actions allowed long Japanese labels such as
  "タスクフローマップ" to wrap character-by-character when the card became narrow.
- Prevention: Keep short action labels horizontal with stable button widths,
  `white-space: nowrap`, and a layout that moves secondary actions to another
  row instead of squeezing labels into vertical text.

### 2026-07-09 - Empty task-map drag moved the whole task layer

- Mistake: After Task Flow ownership zones became fixed viewport regions,
  empty-space panning made every task move together under the fixed zones, which
  looked like the user had dragged all tasks at once.
- Prevention: On fixed-zone Task Flow Maps, reserve drag movement for task
  cards only. Empty-space drag should not pan the task layer unless a separate,
  explicit pan mode is introduced.

### 2026-07-09 - Portfolio cards were squeezed by responsive grid columns

- Mistake: Portfolio project cards used too many responsive grid columns inside
  a constrained layout, so Japanese labels and action buttons overlapped and
  became unreadable.
- Prevention: Project comparison cards need a stable minimum width. Use
  horizontal scrolling with `shrink-0` cards instead of forcing many cards into
  the visible width.

### 2026-07-09 - Resized task map hid edge tasks

- Mistake: Task nodes kept their large-screen coordinates after the map panel
  became narrower, and empty-space panning had been disabled, so tasks near the
  edge could become unreachable.
- Prevention: Fixed-zone Task Flow Maps should auto-fit the current project's
  task bounds after panel resize or project load, reducing zoom and recentering
  the task layer when needed.

### 2026-07-10 - Task map auto-fit fought user interaction

- Mistake: Task Flow Map auto-fit could run after zoom or drag state changes,
  recentering the task layer while the user was trying to operate the map.
- Prevention: Auto-fit should run only for project load and actual viewport
  resize. Manual zoom, task drag, and other map operations must remain under the
  user's control.

### 2026-07-10 - Reloaded task map shifted visual positions

- Mistake: Task Flow Map restored task coordinates but recalculated the viewport
  on reload, so cards appeared to shift even though their saved coordinates were
  unchanged.
- Prevention: Persist each project's task-map pan and zoom separately from task
  coordinates. Restore the saved viewport before auto-fit, and only auto-fit
  when no saved viewport exists.
