---
date: 2026-07-06
tags: [decision, ui, japanese, spatial-canvas]
project: ai-task-system
related:
  - Projects/AI-Task-System-Architecture.md
  - Decisions/2026-07-06-ai-work-os-spatial-canvas.md
---

# Japanese Spatial Canvas Polish

## Context

The product is intended for Japanese users. The cockpit should not feel like an English dashboard translated into Japanese; it should be designed around Japanese text rhythm, spacing, and interaction expectations.

## Decision

The visible UI must use Japanese for menus, headings, labels, status, dummy data, AI messages, and task-facing text.

The cockpit should move further away from dashboard layout and toward a single spatial canvas:

- The main work surface should feel like one continuous canvas.
- The home cockpit should use the whole viewport as a product operating surface, not sit inside the standard app shell.
- Side panels, command controls, minimap, AI insight, and timeline can float over the canvas as glass layers.
- Tasks should remain planets, spheres, or nodes rather than cards.
- Flow should be visually dominant with animated light moving from start to end.
- UI chrome should be reduced and glass surfaces should feel calm, precise, and product-grade.
- Japanese typography should use Inter plus Noto Sans JP, with more generous spacing and stable line heights.
- Interactions should prioritize smooth pan, zoom, drag, hover, pulse, and right-panel reveal over adding static feature density.

## Reason

Japanese UI requires different spacing and copy rhythm from English. The product concept also depends on the feeling that work is flowing through a spatial operating layer, not being summarized in dashboard cards.

## Consequences

- English should not appear in the visible product UI except where future domain data explicitly requires it.
- Dummy data should represent Japanese work and knowledge contexts.
- Future Vault parsing should preserve Japanese display labels while keeping code, file names, and internal identifiers in English.
