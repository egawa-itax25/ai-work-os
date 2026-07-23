---
date: 2026-07-23
tags: [knowledge, portfolio, responsive, overflow]
project: ai-task-system
related:
  - Projects/portfolio-view.md
  - Decisions/2026-07-23-portfolio-selection-and-inspector-editing.md
---

# Portfolio Responsive Overflow

## Symptom

At 1024px and 768px the page could become wider than the viewport even though
the filter and mobile navigation rows used horizontal scrolling.

## Cause

The scrollable filter was a grid item whose intrinsic width could expand the
header track. The mobile navigation also needed an explicit zero-minimum-width
boundary so its content remained inside its own scroll area.

## Fix

- Constrain the Portfolio header children and filter surface with `min-w-0`.
- Keep the filter row itself horizontally scrollable.
- Give the mobile navigation a flexible, zero-minimum-width container.

## Verification

Browser checks at 1920, 1440, 1280, 1100, 1024, and 768px reported no
document-level horizontal overflow. At 1440px the Inspector remains visible;
below 1440px it stays hidden until opened as a drawer.
