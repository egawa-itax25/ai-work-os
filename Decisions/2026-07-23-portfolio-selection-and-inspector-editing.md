---
date: 2026-07-23
tags: [decision, portfolio, ui, responsive, inspector]
project: ai-task-system
related:
  - Projects/portfolio-view.md
  - Preferences/ui.md
---

# Portfolio Selection And Inspector Editing

## Context

The production Portfolio keeps comparison, task work, and editing on one page,
but project cards contain editing controls and repeated detail. At narrower
desktop widths the permanent Inspector competes with the central workspace.
Users can also confuse card selection, opening a project, editing fields, and
viewing the Priority Score breakdown.

## Decision

- Project cards are scan-and-select surfaces. They always show the project
  identity, health, progress, current ball, holding time or due date, and score.
- Project editing lives in the shared Project Inspector. Card fields are no
  longer directly editable.
- Card click selects only. `詳細` opens the Inspector, `フローマップ` opens the
  task map, and the three-dot menu contains secondary operations.
- Priority Score details open from the score itself as a click/touch popover.
- The selected card uses a restrained accent edge, stronger border, and
  `選択中` label that matches the Inspector title.
- At 1440px and wider, the Inspector is a stable 360px sticky column. Below
  1440px it becomes a right drawer with backdrop click, close button, Escape,
  focus containment, body-scroll lock, and focus restoration.
- Filters and workspace tabs stay on one row and allow horizontal scrolling
  when the available width is insufficient.
- Today’s Focus moves above the project list and its actions select the
  corresponding project.
- Existing Supabase `workspace_states` synchronization remains authoritative;
  this UI change must not introduce a second synchronization system.

## Reason

Separating selection from editing reduces accidental changes and makes project
comparison faster. A responsive drawer protects the central work area without
removing the one-screen workflow. Keeping the existing sync layer preserves the
already deployed cross-device behavior and its data-protection rules.

## Consequences

- The previous inline-edit card decision is superseded for Portfolio cards;
  Task Flow node inline editing remains unchanged.
- Search and sorting controls must perform real filtering and ordering.
- Inspector save feedback must reflect the existing cloud-aware sync result.
- The production branch must be the integration base so newer Team, Completed,
  Schedule, authentication, and sync features are not rolled back.
