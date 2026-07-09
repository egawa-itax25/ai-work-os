---
date: 2026-07-06
tags: [preferences, ui, japanese]
project: ai-task-system
related:
  - Decisions/2026-07-06-japanese-spatial-canvas-polish.md
---

# UI Preferences

## Japanese First

Visible product UI should be Japanese-first for this project.

Apply Japanese to:

- Menus
- Buttons
- Headings
- Explanatory text
- Labels
- Dummy data
- AI messages
- Status text
- Tooltips

Source code, variable names, file names, and component names may remain English.

Development-only overlays that appear on top of the product, such as framework
route indicators or debug menus, should be hidden during visual review when they
introduce English UI or distract from the AI Work OS experience.

## Interaction Feel

When choosing between more features and better feel, prefer animation, spacing, smoothness, and intuitive operation.

The product should feel like an AI Work OS for manipulating work flow, not a conventional task dashboard.

Canvas drag should feel direct and fluid. When interaction performance and
visual decoration conflict, prioritize pointer response, frame pacing, and
stable transforms.

While a canvas is actively being panned, remove transform transitions that make
the surface trail behind the pointer. Transitions can return after the drag
ends.

For split views that pair a list with a canvas, the list and canvas should use
the same viewport-aware height so their scroll ranges feel connected to the
current display size. Avoid fixed maximum heights that leave unused space below
the main working surface on desktop.

Canvas zoom inside scrollable pages should require an intentional modifier such
as Shift+scroll. Plain wheel or trackpad scrolling should keep moving the page
instead of resizing an embedded map.

Project-level and task-level flow maps should share the same basic interaction
model so the user does not have to relearn pan, zoom, node drag, and map framing
between layers.

Frequently used map actions should have a comfortable hit target and clear
label. Ball ownership should be readable at a glance on nodes; use state color
and subtle accents before adding new controls.

Short Japanese labels inside node controls should not wrap character-by-character.
When a compact node has too many controls, split state and actions into separate
rows rather than squeezing text until it folds.

Connection creation and removal should be paired in the same task-map context:
if a user can create a task link with "つなぐ" from a node, they should also be
able to remove that link from the node menu without leaving the map.

Temporary handoff surfaces should stay focused. The first ball-transfer dock
should show only 自分, 相手, and 完了 while dragging a task; other destinations can
be added later when they represent a concrete workflow.

Task Flow Maps can use persistent drop regions when they make ownership more
obvious than a temporary dock. The regions should be calm and functional:
自分ボール, 相手ボール, and 完了, with automatic status updates on drop.
These regions should use the full visible board area so the drop targets feel
easy to hit. Completion should preserve the previous progress value so moving a
task out of 完了 can restore its pre-completion progress.

Desktop navigation should remain available in the cockpit by default so the
user can move between major views without losing context. It should also be
hideable when the user wants the spatial canvas to take the full visual field.

## Responsive Layout

PC is the primary operating surface. Preserve the immersive spatial canvas,
drag, pan, zoom, and inspector behavior on desktop.

Smartphone access is primarily for checking the current state and moving
between views. Do not force desktop absolute-positioned overlays into a narrow
screen. Use an automatic mobile layout with stacked panels, compact navigation,
readable Japanese text, and no overlap with browser controls.

## Review Links

When reporting completed UI changes, include the latest relevant review links
every time so the user can open the current screen quickly from phone or PC.
Prefer the Vercel URL for mobile review:

- Cockpit: `https://ai-work-os-preview.vercel.app/`
- Portfolio: `https://ai-work-os-preview.vercel.app/portfolio`
- Tasks: `https://ai-work-os-preview.vercel.app/tasks`

## Primary Navigation

Every item in the left navigation should move to a distinct, predictable
product area. Do not map multiple labels to the same placeholder route unless
the labels clearly represent the same area.

Current intended routes:

- ポートフォリオ: `/portfolio`
- 司令室: `/`
- 自分の仕事: `/tasks`
- 受信箱: `/inbox`
- プロジェクト: `/projects`
- 知識: `/knowledge`
- 予定: `/tasks/projects`
- 分析: `/analytics`
- AI頭脳: `/ai`
- 設定: `/settings`

Placeholder or early pages should still make the destination clear in Japanese
and provide a useful next action, so the user can tell that navigation worked.

The desktop left navigation order should be user-adjustable by drag and drop.
The order is a personal UI preference and should be persisted in localStorage,
not treated as project data or Vault content. Reordering the navigation must not
change the destination route of each item.

## Portfolio View

Portfolio-level screens should be calmer than the single-project cockpit.

Use near-black navy, white, gray, and one pale blue accent as the default visual
language. Color should communicate state, not decorate projects:

- Red: stalled, overdue, or severe risk only.
- Yellow: waiting or attention only.
- Green: completed only.
- Purple: subtle AI processing only.

Do not assign unique colors per project. Avoid strong neon, large glow, and
game-like space effects in Portfolio View.

Interactions should feel precise and quiet: row hover, node selection, pan,
zoom, filter switching, and detail expansion should use short 150ms to 300ms
transitions.

Portfolio operations should not turn the screen into a dense administration
page. Creation and editing controls should appear only when useful:

- Global "＋ 作成" is always available but compact.
- Project and task creation use centered modals that keep the current screen
  visible behind them.
- Clicking outside a creation modal closes it and returns to the previous
  screen state.
- Project editing happens in the shared Project Inspector.
- Task creation uses the current project preselected when
  possible.
- Context menus are available through right click or "…" buttons.
- Minor edits auto-save with quiet "保存中…" and "保存済み" feedback.
- Recent changes should show an undo-capable toast.
