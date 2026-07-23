---
date: 2026-07-23
tags: [decision, ui, portfolio, responsive, editing]
project: ai-work-os
related:
  - Projects/portfolio-view.md
  - Decisions/2026-07-10-inline-title-priority-progress-editing.md
  - Preferences/ui.md
---

# Portfolio Selection And Inspector Editing

## Context

Portfolio cards had accumulated title, priority, progress, navigation, score,
and menu controls. In constrained widths this increased overlap risk and made
it unclear whether clicking a card selected, edited, or opened a project.

## Decision

- Portfolio cards are scanning and selection surfaces.
- Card click selects the project; a labeled detail action opens the Project
  Inspector when it is presented as a drawer.
- Project editing is concentrated in the Project Inspector. The earlier
  Portfolio-card inline title, priority, and progress editing decision is
  superseded for project cards only; Task Flow node editing is unchanged.
- Cards always show only project name, health/status, progress, current ball,
  holding duration or due date, and Priority Score.
- Priority Score breakdown opens from the score by click and does not consume
  permanent card height.
- At wide desktop widths the Inspector remains a stable right column. At
  narrower widths it becomes an accessible right drawer so central work is not
  compressed.
- Filters and workspace tabs stay on one row and may scroll horizontally.
- Today’s focus appears before the project list and selects the relevant
  project in the current view.

## Reason

Separating selection from editing reduces accidental changes, makes card width
predictable, and preserves the Portfolio screen’s main job: comparing priority,
health, and who should act next.

## Consequences

- Inspector headers must identify the selected project and expose real save
  state.
- Drawer mode needs close, backdrop, Escape, focus containment, and focus
  restoration behavior.
- Long labels and titles must truncate or clamp without expanding their parent.
- Existing project and task data shapes and routes remain unchanged.
