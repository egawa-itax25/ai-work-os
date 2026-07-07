---
date: 2026-07-07
tags: [decision, ui, portfolio, project-flow]
project: ai-task-system
related:
  - Projects/portfolio-view.md
  - Projects/AI-Task-System-Architecture.md
  - Preferences/ui.md
---

# Portfolio View

## Context

The existing cockpit focuses on the flow inside one project. Users also need a
higher-level view for comparing multiple active projects before they enter a
single Project Flow.

This view must answer quickly:

- Which project has the highest priority?
- How far has each project progressed?
- Who has the current ball?
- Which project is stalled or at risk?
- Which project moves forward if the user acts now?

## Decision

Add a Portfolio View above the existing Project Flow layer.

The hierarchy should be:

```text
Portfolio View
Project Flow
Task Detail
Knowledge
```

The existing Project Flow screen remains in place. Portfolio View links into it
instead of replacing it.

Portfolio View should use a calmer business interface than the single-project
spatial cockpit:

- Near-black navy background.
- White, gray, and one pale blue accent.
- Red only for stalled, overdue, or severe risk.
- Yellow only for waiting or attention states.
- Green only for completed work.
- Purple only for subtle AI processing states.
- Do not assign decorative colors per project.
- Avoid strong neon, game-like glow, and giant planet nodes.

## Reason

Portfolio-level work is a comparison problem. It needs fast scanning, stable
ranking, and restrained status color more than spectacle. Keeping Project Flow
as the next layer preserves the spatial work-flow concept without overloading
the portfolio screen.

## Consequences

- Project data must distinguish `owner` from `currentBallHolder`.
- Priority Score must expose its breakdown and should be replaceable by future
  AI scoring.
- Filters must make "projects that move if I act" immediately visible.
- Project nodes should be compact, calm, clickable, and pan/zoom capable.

## Follow-up Decision: Node Drag And Explicit Open

Portfolio project nodes should be draggable on the map.

Dragging a node changes only the user's map layout. It does not change project
priority, owner, current ball holder, progress, or Vault task state.

Because drag and navigation conflict, opening a single Project Flow should be an
explicit action from the project list, the node, or the right detail panel.
Clicking or dragging a node selects and positions it; the "フローを見る" action
opens the project-specific map.

## Reason

The Portfolio map is a planning surface. Users need to arrange projects
spatially while comparing them, without accidentally leaving the view. Explicit
open actions keep navigation predictable and make the drag interaction feel
safe.
