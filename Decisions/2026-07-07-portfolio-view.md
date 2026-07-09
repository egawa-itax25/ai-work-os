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

## Follow-up Decision: Project List Workbench Structure

Portfolio should present the project list as a top comparison strip or grid,
then show the selected project's task workspace directly below it while keeping
Project Inspector on the right.

This replaces the previous left-column project list structure. The color system
does not change: project cards continue to use the existing quiet dark surface,
pale-blue selection, and restrained status colors.

## Reason

The user wants the project list to behave like the entry point into daily work:
compare projects first, then immediately operate on the selected project's
tasks in the same context. A top project strip with a lower task workspace keeps
the view and operation areas connected without adding another management page.

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
- Wheel zoom inside the Portfolio map should require Shift+scroll so normal
  page scrolling remains predictable.

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

## Follow-up Decision: Project Task List Map Navigation

From the schedule tab's project task list, "全体マップ" should return to the
Portfolio View overview map.

It must not send the user to the task-level `/tasks` canvas, because that feels
like a different product area when the user is comparing or reviewing projects.

The single-project spatial task map remains available through explicit actions
such as "このプロジェクトをマップで見る" or each project's compact "マップ" action.

## Follow-up Decision: Task Map Handoff And Unlinking

The task-level Flow Map should keep ball handoff deliberately simple:
dragging a task shows a temporary dock with only 自分, 相手, and 完了. AI can
remain visible as task state, but it is not a drop target until AI queue
operations are implemented.

Task connections created by "つなぐ" need a nearby removal path. Existing links
should be removable from the task node context menu so users can fix the map
without leaving the canvas.

## Reason

The map is used frequently, so its primary operations must be reversible and
obvious. Three handoff destinations match the user's current mental model:
my side, the other side, or finished.
