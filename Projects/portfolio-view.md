---
date: 2026-07-07
tags: [spec, portfolio, ui, project-flow]
project: ai-task-system
related:
  - Decisions/2026-07-07-portfolio-view.md
  - Decisions/2026-07-07-portfolio-operation-hub.md
  - Decisions/2026-07-14-manual-project-persistence.md
  - Decisions/2026-07-16-clickable-task-inspector-links.md
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

Portfolio View is the default product entry surface. The legacy cockpit route
at `/` should redirect here instead of rendering the old spatial command-room
screen.

```text
Portfolio View
Project Flow
Task Detail
Knowledge
```

Portfolio View links to the existing Project Flow screen. It does not replace
the single-project task Flow experience.

## Layout

Use three calm regions:

- Top: project comparison cards with a new-project entry point, compact search/sort
  controls, progress, current ball, and Priority Score.
- Center: the selected project's work area. It should open with a task-oriented
  workspace that includes tabs such as Flow Map, task list, documents, memo, and
  history.
- Right: Project Inspector, AI priority, Priority Score, insight, and risk.
- Bottom or secondary region: today's focus, stalled projects, and weekly
  progress summary when space allows.

The Portfolio View no longer includes a project-level Flow Map. Spatial flow
mapping belongs to the task-level Flow Map for a selected project.

Keep the default surface quiet. Show deeper details only when selected or
expanded.

The project comparison area should follow the same structure as a calm product
workspace rather than a dashboard: select a project at the top, then operate on
that project's tasks directly below while the Inspector remains visible on the
right. Preserve the existing dark navy, pale-blue, gray, and state-color palette;
this change is structural, not a new visual theme.

## Operation Hub

Portfolio View is also the main operation hub for moving work forward.

The user should be able to create and edit projects and tasks without leaving
the context of the portfolio comparison view.

Supported operation surfaces:

- Global "＋ 作成" action.
- Portfolio header "＋ プロジェクトを追加" action.
- Shared Project Inspector.
- Create Project Modal.
- Create Task Modal.
- Context menus for project rows and project nodes.
- Project Flow Task Inspector.

Ordinary project and task creation should not require navigation to a separate
administration screen.

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

Project rows should expose secondary actions through a compact "…" menu rather
than permanent large buttons. The row selection opens the shared Project
Inspector.

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

Deprecated: the project-level Flow Map has been removed from the active product
surface. Portfolio should compare projects through list ranking and Inspector
details, then open the selected project's task-level Flow Map when spatial work
is needed.

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

The task-level Flow Map keeps pan, zoom, drag, and spatial ownership behavior.

Any older requirements in this note that mention Portfolio project nodes,
project-node drag, or a Portfolio Project Flow Map are legacy notes and are no
longer active requirements. Current Portfolio operations should use project
rows, filters, and the Project Inspector, with explicit links into each
project's task list or task-level Flow Map.

The Portfolio project list and Project Flow Map should share a viewport-aware
height. They should not use a fixed maximum height that creates a large empty
region on tall screens or stops the user before the visible bottom of the
workspace. The visible map area should stretch toward the bottom of the current
viewport while keeping a minimum working height on smaller screens.

### Drag And Drop Layout

Portfolio project nodes can be moved by drag and drop.

Initial node coordinates come from the project data model. User-adjusted
coordinates are stored as local UI layout state so the comparison map can be
rearranged without changing the project owner, current ball holder, progress,
or priority score.

Dragging a project node must:

- Select the project immediately.
- Move only that project node, not the whole canvas.
- Keep the node within the visible board bounds.
- Preserve the new position across reloads when possible.
- Avoid changing task state or project state in the Vault.

Dragging the empty canvas should continue to pan the Portfolio map.
Empty-canvas panning should feel immediate. The board transform should not keep
a decorative transition while the pointer is moving, because that makes the map
feel like it is lagging behind the hand.

Project-to-project connections are editable from the shared Project Inspector.
The Portfolio map draws the saved connections rather than implying that list
order is the only relationship. Connection editing is portfolio UI state in the
first implementation and should later map to Vault project dependencies.

Opening a project should be explicit and always available from:

- Project list row action.
- Project node action.
- Right priority/detail panel.

This prevents accidental navigation while the user is arranging the map.

The explicit "開く" / "タスクを見る" action must move to the schedule tab's
project task list for the selected project. The user should first see the
project and its tasks as a list, then choose "マップ" when they want the spatial
Task Flow Map. On touch devices, tapping the open action must not be captured
as node drag or selection.

Because the project-internal Task Flow Map is often the user's real target,
Portfolio rows, project nodes, and the Project Inspector should also expose a
direct "タスクフローマップ" action. This does not remove the schedule list; it
reduces friction when the user wants the spatial task map first.

Direct access to `/tasks/projects/[project]/map` without an explicit map intent
must also redirect to the schedule tab's project task list. Explicit map actions
use `view=map` so old or stale project open links cannot strand the user on the
map when they expected the task list.

Inside the schedule tab's project task list, "全体マップ" must return to the
Portfolio View overview map. It should not route to the task-level `/tasks`
canvas, because that breaks the project comparison context. The project-specific
spatial map remains available only through explicit map actions such as
"このプロジェクトをマップで見る".

Project nodes should also expose a compact context menu with:

- 開く
- 編集
- タスクを追加
- 複製
- アーカイブ

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
- Center modal opening and closing.
- Inline edit focus and saved state.
- Undo-capable toast after create or edit.
- Outside-click close behavior that returns to the previous view.

Avoid decorative animation.

## Creation And Editing

### Global Create

The global "＋ 作成" menu starts either project or task creation.

The initial structure must be extensible for:

- メモを作成
- AIへの自然言語指示

### Create Project Modal

The modal appears in the center of the screen and starts with only:

- プロジェクト名
- 詳細
- 期限
- 責任者

期限は特定の日付だけでなく、毎月業務向けの `毎月` も選択できる。
毎月の顧問業務や月次作業では、仮の日付を入れずに期限欄から
`毎月` を選べるようにする。

After saving, the new project appears immediately in:

- Project list.
- Project Flow Map.
- AI priority ranking.
- Project Inspector.

The created project should be selected and highlighted briefly.

Clicking outside the modal closes it and returns to the same Portfolio context.

### Project Inspector

Project list selection and map node selection use the same Project Inspector.

The Inspector supports viewing and inline editing for:

- プロジェクト名
- 詳細
- 責任者
- 期限
- 進捗
- Priority Score
- 現在のボール
- ボール保持時間
- 次のマイルストーン
- AIインサイト
- リスク情報

The Inspector also provides:

- フローを見る
- ＋ タスクを追加

Project editing must be visually obvious. The right Inspector should label the
editable area as project editing, show a short hint that fields can be edited
directly, and render editable fields with visible borders/backgrounds instead
of transparent read-only-looking text.

### Create Task Modal

The modal appears in the center of the screen and starts with:

- タスク名
- 所属プロジェクト
- 担当者
- 現在のボール
- 期限
- 優先順位
- 次のアクション

When launched from a project, the project is preselected.

Clicking outside the modal closes it and returns to the same Portfolio context.

### Task Inspector

Task Nodes in Project Flow open a Task Inspector in the same view.

The inspector supports viewing and editing:

- タスク名
- 進捗
- 担当者
- 現在のボール
- ボール保持開始日時
- 期限
- 優先順位
- 次のアクション
- 依存関係

Task node context menu:

- 開く
- 編集
- 複製
- ボールを渡す
- 完了
- アーカイブ

Task Flow also supports drag-to-transfer. When a Task Node is dragged, a
temporary "ボールを渡す" dock appears with these initial destinations:

- 自分
- 相手
- 完了

Dropping a task onto a destination updates the task's current ball holder and
shows undo-capable feedback. The dock appears only while dragging so the map
does not become visually crowded.

AI processing can still exist as task data, but it should not be a primary
handoff target until the AI work queue is a real operation surface. Keeping the
transfer dock to 自分, 相手, and 完了 makes the handoff operation easier to
understand while dragging.

Task links created by "つなぐ" must have a matching unlink path in the same map
context. A user should not need to discover the Task Inspector to remove a
connection. The task node context menu should list existing outgoing links and
provide "解除" for each linked task.

The compact "解除" button should open a small dedicated menu with only:
解除 and 元に戻す. It must be clickable without being clipped by the task node.

Task node menus must not trap the user. A menu should close when the user
clicks outside it, presses Escape, selects another task, starts dragging a task,
or chooses a menu action.

Task Inspector text fields may contain pasted reference URLs. When a user
pastes an `http://` or `https://` URL into the next-action/detail text, the
Inspector should detect it and show it as a clickable Japanese "検出したリンク"
preview near the field. Keep the editable text area as the source of the note,
but make the link usable without requiring the user to copy and paste it into a
browser manually.

Task Flow Map UI should use the same canvas language as Portfolio Project Flow
Map: quiet dark surface, compact nodes, pan by dragging empty space, zoom
buttons, and Shift+scroll zoom. The Task Inspector is already useful and should
remain the detailed editing surface during this map UI polish.

Because users open Task Flow Maps frequently, project task list rows should make
the map action large enough to tap confidently and easy to scan near the
project count. Task Flow nodes should make "相手のボール" visible through a
non-interactive visual signal such as an amber accent rail and waiting tint,
without changing map operations.

Compact Task Flow nodes should not wrap short operation labels such as
"自分のボール", "つなぐ", or "解除". If the node needs both state and actions, use
separate rows so the label remains readable instead of folding characters into
multiple lines.

Task Flow Map should visually group task nodes into three large drop regions:
自分ボール, 相手ボール, and 完了. Dragging a task into one of these regions updates
the task's current ball/status automatically. The regions should be visible but
quiet, using blue for self, amber for waiting on others, and green only for
completed work.

The ownership regions should fill the visible map board instead of appearing as
small islands in the middle of the canvas. Moving a task into 完了 sets progress
to 100%. When that task is moved back from 完了 into 自分ボール or 相手ボール, restore
the progress value it had immediately before completion.

Ownership regions are fixed viewport layers inside the Flow Map panel. They do
not move when the user pans the task canvas; only task nodes and link paths move.

### Persistence

Minor edits auto-save.

The first implementation persisted editable mock state in localStorage. Current
direction is Supabase-backed workspace state for logged-in users, with
localStorage kept as a fast cache and unauthenticated fallback. Project and task
edits should be visible from another browser, PC, or phone after the same user
signs in.

After edits, show:

```text
保存中…
保存済み
```

Also show an undo-capable toast for recent create/edit actions.

### State Restoration

Portfolio should restore as much as possible when returning from Project Flow:

- Scroll position.
- Canvas pan.
- Zoom.
- Selected project.
- Filter state.
- Project node layout.

## Completion Criteria

- Multiple projects can be compared in one view.
- Progress, priority, current ball, and holding duration are visible.
- Stalled projects and user's actionable projects can be filtered.
- Priority Score breakdown can be inspected.
- Project nodes can be panned, zoomed, selected, and opened.
- Project Flow Map mouse-wheel zoom responds only to Shift+scroll.
- Project nodes can be repositioned with drag and drop.
- The schedule tab's project task list for a single project is reachable from
  the Portfolio list, map node, and selected project panel.
- The "開く" action on a project node opens the selected project's task list
  directly, without being swallowed by drag handling on mobile.
- In the schedule tab's project task list, "全体マップ" returns to Portfolio
  View's project-level overview map, while "このプロジェクトをマップで見る" opens the
  selected project's Task Flow Map.
- Direct project map URLs without `view=map` redirect to the selected project's
  schedule task list.
- Projects can be created from Portfolio View.
- Projects can be edited from the shared Project Inspector.
- Tasks can be created from Portfolio View with a preselected project.
- Tasks can be created and edited from Project Flow.
- Task Nodes can be dragged onto a transfer dock to move the ball to 自分,
  相手, AI, or 完了.
- Minor edits auto-save and show quiet saved feedback.
- Recent edits provide undo-capable feedback.
- Portfolio state is restored as much as possible after returning from Project Flow.
- Japanese UI is used throughout.
- Existing Project Flow is preserved.
- Project and task sync feedback distinguishes local save from cloud sync.
  Users should see whether edits are saved only on this device, synced to
  Supabase, or blocked by an auth/server error.
- Portfolio, Schedule, Task Flow Map, trash, and completed-work state must use
  the same signed-in Supabase workspace state. Local browser state is only a
  cache/fallback. First sync should upload non-empty local work when the remote
  value is empty, compare timestamps when both sides exist, and keep a recovery
  snapshot before replacing local data.

## Implementation Status

Initial implementation is available at `/portfolio`.

Implemented:

- Multi-project comparison list.
- Portfolio project list is moving from a left vertical list to a top project
  card strip/grid with a selected-project workspace below it and Project
  Inspector on the right.
- Compact project card actions keep labels such as "タスクフローマップ"
  horizontal by giving the primary map action its own stable button width and
  moving secondary score details to a second row.
- Portfolio project cards use stable fixed widths with horizontal scrolling
  instead of being squeezed into too many responsive columns.
- Task Flow Map fixed ownership zones no longer pan the entire task layer when
  the user drags empty space. Only task cards move when directly dragged.
- Task Flow Map automatically fits the selected project's task bounds after the
  panel is resized or the project is opened, so tasks placed near an edge on a
  wide screen remain visible on narrower screens.
- Task Flow Map auto-fit must not fight user operation. It should run only on
  actual viewport resize or project open, not after manual zoom or task drag.
- Task Flow Map top ownership regions should be generous enough for comfortable
  dropping. The upper self/other regions should use a larger share of the
  visible board than the lower done region.
- The top self/other regions should feel clearly dominant in the visible map,
  roughly three quarters of the board height, so users can drop active work
  without aiming at a narrow band.
- Task card drag should be handled by the card itself after pointer capture,
  not only by the parent board. Dragging a task must visibly move the task card
  under the pointer and must not fall back to the browser's native text/image
  drag ghost.
- Task drop classification should be based on the task card center, not only on
  the pointer position. After a drop, the card should be clamped into the target
  region so the visual location and the ball/status state agree.
- Because ownership regions are fixed viewport layers, drop classification and
  snap correction must use the visible viewport bounds of those regions. Do not
  compare against only the internal board coordinate system, because pan, zoom,
  and screen size can make those coordinates diverge from what the user sees.
- Task dragging itself must also use visible viewport bounds. Do not clamp
  moving task cards to the internal board size while fixed ownership regions
  are viewport-based; otherwise small screens can prevent cards from reaching
  the top of the visible map.
- Task Flow Map uses a stable internal coordinate space for task cards. Moving
  the browser between monitors or resizing the window must not rewrite task
  `x/y` coordinates.
- Viewport resize may adjust the visible ownership-zone backgrounds and may
  provide the first auto-fit for a project without saved view state. Once a
  project has saved pan/zoom, resize must not override that view state.
- Only explicit user actions, such as task drag/drop, new task placement,
  manual pan, or manual zoom, may change task coordinates or map viewport state.
- Task Inspector detects URLs in the task's next-action/detail text and renders
  them as clickable "検出したリンク" anchors that open in a new tab.
- In the schedule project task list, the Task Flow Map action is placed near the
  project title as a large horizontal primary button, because users open this
  map frequently from the project summary.
- Portfolio project card actions must never overflow the card when the project
  list wraps into multiple rows. Secondary controls should wrap into a compact
  two-line action area instead of forcing horizontal overflow.
- The schedule project task list uses fixed table column widths so ball,
  status, priority, owner, due date, and related counts align vertically across
  project sections. It also shows the current ball as a dedicated column before
  status.
- Project cards support inline editing for title and progress so users can
  update common project fields without leaving Portfolio View.
- Project progress uses a bar-style range control. Setting project progress to
  100% also sets all tasks in that project to 100%; setting project progress
  below 100% does not rewrite task progress.
- Portfolio View must stay synchronized with the project list shown in the
  schedule tab. Projects that exist in task data must appear in Portfolio even
  when the separate portfolio storage is empty or stale. Portfolio should keep
  editable project metadata, but derive operational fields such as progress,
  current ball, status, deadline risk, and counts from the task data.
- The schedule tab's project task list is also an editing surface. Users can
  edit task title, description, ball holder, status, priority, owner, and due
  date directly from the list. Users can rename or delete a project from the
  same project section. These edits must write to the shared task data and stay
  reflected in Portfolio. Project renames and deletes should also update the
  Portfolio metadata store so editable project details do not drift.
- The schedule tab's project task list must also support adding a task directly
  inside each project section. The new task should inherit the project name,
  appear immediately in that section, and sync back to Portfolio through the
  shared task data.
- Quick-created tasks start with an empty, focused title field instead of a
  prefilled `新しいタスク` value. If the field is committed while empty, it is
  normalized to `無題のタスク`. Schedule list and Task Flow Map use the same
  behavior so users can start typing immediately in either surface.
- The schedule tab's project task list uses user-controlled ordering. A newly
  added task is appended to the end of the selected project section, and hidden
  priority/due-date sorting must not move it unexpectedly.
- Project sections and task rows can be reordered directly by dragging the
  visible row/header surface. Dedicated text-heavy reorder buttons should not be
  the primary interaction because they are hard to discover and hard to touch.
  Editing controls, links, buttons, inputs, and selects must not start drag.
  Reordering updates only the shared task ordering; it must not change status,
  ball holder, due date, priority, or progress.
- Task Flow nodes support inline editing for title and priority so users can
  adjust the task without opening a separate screen.
- The schedule tab's project-by-project task list is also a direct editing
  surface. Users should be able to double-click task title or memo/detail cells
  to edit in place, click compact field controls for ball/status/priority/owner
  and deadline, and remove tasks with the Delete key after selecting a row.
- In the schedule task list, the primary ball choices are `自分`, `相手`, and
  `完了`. `AI` can remain in older data, but it is not shown as a primary
  handoff option in this list.
- Schedule task list edits save on commit rather than on every keystroke:
  title uses Enter or outside click, memo/detail uses Shift+Enter or outside
  click, and Escape cancels the edit.
- Completion is coupled in the schedule task list: setting status to `完了` also
  moves the ball to `完了`; setting the ball to `完了` also sets status to
  `完了`. Returning from completed work restores the immediately previous
  non-complete status when available.
- Inline editing controls stop pointer and click propagation so typing,
  selecting priority, or dragging the progress bar does not trigger node drag,
  card selection, or navigation.
- Task node context menus should stay minimal. Remove redundant "開く" because
  clicking the node already selects it, and remove "ボールを渡す" because ball
  transfer is handled by dragging tasks between the visible ball regions.
- Compact Task Flow node titles should prioritize readability. The priority
  control belongs in the upper-right corner, while the task title should use the
  available node width and wrap onto multiple lines instead of being truncated.
- Project and task context menus should close when the user clicks outside the
  menu or presses Escape.
- Project and task context menus should expose an explicit "削除" action.
  Deletion should be undo-capable where possible, while archive remains a
  separate non-destructive action.
- "削除" should move projects and tasks to a "削除済み" area instead of
  immediately discarding them. Deleted items are retained for 30 days and can be
  restored from that area.
- The visible archive action should be removed from project and task menus
  because the 30-day trash area now covers the reversible removal use case.
- The sidebar management group includes "完了済み" as a separate completed-work
  store. This is different from "削除済み": completed tasks are preserved as
  finished work, not as removal candidates. The Task Flow Map done zone exposes
  "完了済みに追加" so users can move finished tasks out of the active map while
  still being able to review or restore them later.
- On mobile widths, Task Flow Map should keep the desktop behavior but use a
  wider horizontal touch canvas and smaller zone labels/spacing so ownership
  zones and task nodes do not overlap in the visible phone viewport.
- Desktop navigation should use a compact Codex-style sidebar: brand header,
  grouped list rows, subtle active highlight, and route behavior unchanged.
- Desktop navigation should keep a narrower sidebar width so the workspace has
  more horizontal room. Navigation icons must be compact single-symbol markers
  that do not wrap or split Japanese labels.
- Task Inspector next-action notes should remain editable while reading as a
  calm dark note surface with better contrast, padding, and line height.
- Project Inspector should not show the project-connection editing block. Keep
  existing connection data available for future map-level relationship work.
- Project Inspector should also hide the always-visible AI insight and risk
  editing blocks. Keep those data fields available for future summary or
  contextual views, but do not show them in the current inspector.
- Project list cards should wrap into responsive rows instead of requiring
  horizontal scrolling. The list should adapt to the visible window width and
  become two or three rows when needed.
- Project sections and task rows in the project-task list should reorder through
  a dedicated visible drag handle. The full project frame or row remains the
  drop target, while buttons, inputs, selects, links, and editable fields do not
  start drag operations. This keeps reordering reliable while preserving normal
  edit/delete/add controls.
- Reordering should show a clear insertion affordance while dragging. When a
  project section or task row is dragged over another item, a subtle horizontal
  blue line should appear at the drop position so users understand where the
  item will land before releasing.
- Project task list creation should support continuous entry. After adding a
  task, the title input receives focus; pressing Enter on the title commits that
  task and appends the next task to the same project, while IME composition
  Enter is ignored so Japanese conversion is not interrupted.
- Compact Task Flow node title fields should use the priority control's lower
  dead space. Only the status row reserves room for the upper-right priority
  control; the title input should expand to the full node width and wrap across
  more lines.
- When a task is created directly on the Task Flow Map, the new node's title
  field should receive focus immediately and select the default title so the
  user can start typing without an extra click.
- Portfolio project visibility should follow the Schedule task list for
  task-derived projects, but user-created projects are durable Portfolio
  records. A project created from Portfolio must remain visible even when it
  has zero tasks, until the user deletes it or moves it to the trash. This
  prevents newly created project shells from disappearing before tasks are
  added.
- The Schedule tab must also read Portfolio project records. A project created
  in Portfolio appears in the Schedule project list immediately, even before it
  has tasks, so users can add the first task from the schedule context. The
  empty schedule project shell should respect the current project filter and
  search query, and it should disappear only when the project is deleted.
- Create Project and Create Task modals should be large enough for Japanese
  input. Use a wider modal surface and more generous vertical spacing so
  project names, objectives, owners, and dates feel easier to edit.
- Project creation and editing support a monthly deadline option for recurring
  monthly work. The UI shows this as `毎月`, while date-based projects continue
  to use a normal date picker.
- Task Flow Map navigation should be self-explanatory. The back action should
  read as returning to the Portfolio, while the stronger action should clearly
  open the selected project's schedule/task list context.
- Task Flow Map navigation should live in the unused right side of the project
  header instead of occupying a separate row. This keeps the map closer to the
  title and reduces dead space.
- Task Flow Map header navigation cards should expand to use the horizontal
  space beside the project title. Their width should respond to the visible
  window while keeping summary tiles compact on the far right.
- Task Flow Map header summary tiles must reserve space for the global
  "＋ 作成" action. At narrower desktop widths, navigation cards and summary
  tiles should wrap or shrink before they overlap the fixed create action.
- Portfolio filters and project-task view tabs should follow the same header
  pattern: use the horizontal space beside the page title, grow with the visible
  window, and avoid occupying a separate full-width row when there is available
  header space.
- Header filters and tabs must not rely on inner horizontal scrolling after
  being moved beside the title. They should wrap or expand inside the available
  header area so the control width visibly follows the window size.
- Portfolio header filters should remain a compact segmented control. Wrapping
  is acceptable, but each filter keeps its natural label width; filters must not
  stretch into tall vertical columns or card-like blocks.
- Task Flow Map should use the vertical room created by the compact header.
  Keep the 自分ボール / 相手ボール / 完了 zone ratio unchanged, but stretch the
  board height so the area under 完了 is filled according to the visible window.
- The 完了 zone helper text must remain fully visible inside the zone at 100%
  browser zoom. Prefer compact spacing over increasing page height.
- On desktop, the Task Flow Map page should fit inside the browser viewport at
  100% browser zoom without page-level vertical scrolling. The map and inspector
  should share the remaining height below the header, with any inspector
  overflow contained inside the inspector panel.
- URL-based filters, including `filter=self` for projects where the user holds
  the current ball.
- Compact Project Flow Map with pan, zoom, and project node links.
- Project node drag and drop with persisted local layout state.
- Priority Score ranking and visible score breakdown.
- Separate `owner` and `currentBallHolder` data fields.
- Links from Portfolio project rows and nodes into the existing Project Flow
  route.
- Return path from single Project Flow back to Portfolio View.
- Portfolio operation hub behavior is planned for in-context project and task
  creation/editing.
- Verified after stale dev-server restart that `/portfolio` serves successfully
  on `http://127.0.0.1:3030/portfolio`.
- Verified LAN access from the PC using
  `http://172.16.1.157:3030/portfolio` for mobile review on the same Wi-Fi.
- Login and signup should use clear Japanese UI because workspace sync depends
  on users understanding that they need the same app account on PC and mobile.
  Successful authentication should return users to Portfolio, the current
  operation hub, not to older customer pages.
- Cloud sync status is visible on key editing surfaces. "保存済み" alone is not
  enough because localStorage can succeed while Supabase sync fails. Empty
  remote state should not overwrite non-empty local work; the app should push
  the local state to Supabase first when the remote key has no value.

Current mock data is deterministic and should later be replaced by Vault parsing
and AI scoring.

## Project Card Title Readability

- Project card metadata uses a compact first row: project number on the left
  and Priority Score on the right.
- The project name occupies a dedicated full-width row below the metadata.
- Long names wrap to additional lines inside the card instead of being
  truncated or compressed by the score.
- Portfolio card inline editing is superseded by the selection-first rule in
  [[2026-07-23-portfolio-selection-and-inspector-editing]]. Full project names
  remain readable, while editing moves to the shared Inspector.

## 2026-07-23 Production UI Stabilization

In progress on the latest production base:

- Preserve the existing `workspace_states` cross-device sync implementation.
- Make project cards compact scan-and-select surfaces.
- Move Priority Score details to a click/touch popover.
- Make search and due-date/priority sorting functional.
- Keep Today’s Focus above the project comparison list.
- Keep a 360px sticky Inspector at 1440px and wider; use an accessible right
  drawer below that width.
- Keep filters and project workspace tabs in one horizontally scrollable row.
- Verify 1920, 1440, 1280, 1100, 1024, and 768px before production promotion.

Implementation and local validation are complete. The Vercel Preview build is
Ready and its signed-out fallback correctly prompts for login without replacing
local data. The unchanged production sync layer continues to report
`クラウド同期済み` for the existing same-account session. Production promotion
remains before this stabilization pass is finished.
