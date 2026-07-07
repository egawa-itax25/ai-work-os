---
date: 2026-07-07
tags: [spec, portfolio, ui, project-flow]
project: ai-task-system
related:
  - Decisions/2026-07-07-portfolio-view.md
  - Projects/AI-Task-System-Architecture.md
  - Preferences/ui.md
---

# Portfolio View

## Purpose

Portfolio View is the upper layer for comparing multiple active projects.

Within three seconds, the user should understand:

- Highest-priority project.
- Progress of each project.
- Current ball holder.
- Ball holding duration.
- Stalled or risky projects.
- Projects that need the user's action.

## Position In Product

```text
Portfolio View
Project Flow
Task Detail
Knowledge
```

Portfolio View links to the existing Project Flow screen. It does not replace
the single-project task Flow experience.

## Layout

Use four calm regions:

- Left: project comparison list.
- Center: Project Flow Map for multiple project nodes.
- Right: AI priority, Priority Score, insight, and risk.
- Bottom: today's focus, stalled projects, and weekly progress summary.

Keep the default surface quiet. Show deeper details only when selected or
expanded.

## Project List Fields

Each project row must show:

- Rank.
- Project name.
- Progress percent.
- Progress bar.
- Owner.
- Current ball holder.
- Ball holding duration.
- Priority Score.

Show only when useful:

- Stalled count.
- Deadline risk.
- Short AI suggestion.

## Ball Ownership

Owner and current ball holder are separate concepts.

Example:

```yaml
owner: 山田太郎
currentBallHolder: 顧客
ballHoldingDays: 5
```

Filtering and AI analysis must not treat these as the same value.

## Project Flow Map

Projects are compact nodes on a canvas.

Each node should show:

- Rank.
- Project name.
- Progress percent.
- Current ball holder.

State expression:

- Top priority: slightly stronger pale blue border.
- Normal: restrained border.
- Waiting: lower brightness.
- Stalled: small red warning only.
- AI processing: subtle AI mark.
- Done: semi-transparent.

The map should support pan and zoom. Clicking a project opens that project's
Project Flow screen.

## Filters

Required filters:

- すべてのプロジェクト
- 自分がボールを保持
- 相手待ち
- AI処理中
- 停滞中
- 順調
- 要注意
- 完了

The "自分がボールを保持" filter is the fastest path to projects the user can
move forward.

## Priority Score

Priority Score must show a readable breakdown.

Initial mock breakdown:

```text
期限への影響 +28
後続タスクへの影響 +25
自分がボールを保持 +20
事業重要度 +15
停滞リスク +4
```

The implementation can start with deterministic mock logic, but the scoring
function should be isolated so future AI scoring can replace it.

## AI Insight

AI messages should be short and specific.

Good examples:

- 設計書作成を完了すると後続3件が進みます。
- 顧客回答待ちが5日続いています。
- このプロジェクトは期限より3日遅れる可能性があります。
- AIの資料整理がまもなく完了します。

Do not show an AI message when there is no useful intervention.

## Interaction

Use restrained feedback:

- Row hover.
- Node selection.
- Pan and zoom.
- 150ms to 300ms transitions.
- Detail expansion for Priority Score breakdown.
- Filter switching.

Avoid decorative animation.

## Completion Criteria

- Multiple projects can be compared in one view.
- Progress, priority, current ball, and holding duration are visible.
- Stalled projects and user's actionable projects can be filtered.
- Priority Score breakdown can be inspected.
- Project nodes can be panned, zoomed, selected, and opened.
- Japanese UI is used throughout.
- Existing Project Flow is preserved.

## Implementation Status

Initial implementation is available at `/portfolio`.

Implemented:

- Multi-project comparison list.
- URL-based filters, including `filter=self` for projects where the user holds
  the current ball.
- Compact Project Flow Map with pan, zoom, and project node links.
- Priority Score ranking and visible score breakdown.
- Separate `owner` and `currentBallHolder` data fields.
- Links from Portfolio project rows and nodes into the existing Project Flow
  route.

Current mock data is deterministic and should later be replaced by Vault parsing
and AI scoring.
