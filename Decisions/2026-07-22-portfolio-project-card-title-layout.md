---
date: 2026-07-22
tags:
  - ui
  - portfolio
  - project-card
project: AI Work OS
related:
  - "[[portfolio-view]]"
---

# Portfolio Project Card Title Layout

## Decision

Portfolio project cards reserve the first compact row for the project number
and Priority Score. The project name is displayed on its own full-width row
below that metadata.

Project names must use the available card width and wrap naturally across
multiple lines. They must not be truncated, ellipsized, or compressed by the
Priority Score.

## Reason

Japanese project names are often longer than the compact card header permits.
Separating metadata from the name preserves scanability while making the full
project identity readable without opening the Inspector.

## Constraints

- Keep the existing card size, colors, controls, and information hierarchy
  outside the header.
- The editable name field grows vertically when the name wraps.
- Long unbroken text must still wrap inside the card.
- The layout must remain stable across responsive card widths.
