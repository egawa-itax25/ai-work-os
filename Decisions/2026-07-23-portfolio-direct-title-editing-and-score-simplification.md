---
date: 2026-07-23
tags: [decision, portfolio, ui, editing, priority-score]
project: ai-task-system
related:
  - Projects/portfolio-view.md
  - Knowledge/portfolio-priority-score.md
  - Decisions/2026-07-23-portfolio-selection-and-inspector-editing.md
---

# Portfolio Direct Title Editing And Score Simplification

## Decision

- Restore direct project-title editing on Portfolio cards.
- A single click selects the project. A double-click on the title starts inline editing.
- Enter or blur saves the title. Escape cancels the edit.
- Keep the shared Project Inspector as the full editing surface.
- Remove Priority Score and its breakdown from the project cards, project switcher, and Inspector.
- Keep Priority Score calculation and stored data internally for compatibility and future AI analysis.
- Use the stored project order as the normal Portfolio order. Keep due-date sorting as an optional view.

## Rationale

Project names are frequently corrected while comparing projects, so title editing should be available where the name is read. Priority Score currently occupies prominent space without giving enough daily operational value, and it competes with project name readability.

Keeping the score internally avoids destructive data migration and preserves a future path for AI prioritization. Removing it from the visible UI makes the Portfolio quieter and easier to scan.

## Consequences

- Existing project and task data remain unchanged.
- Project selection and title editing have distinct gestures.
- Long project names retain the full-width wrapping layout.
- Portfolio ordering no longer appears to be controlled by a hidden score.
- Priority Score can be restored later without rebuilding the data model.
