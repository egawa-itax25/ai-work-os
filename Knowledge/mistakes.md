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
