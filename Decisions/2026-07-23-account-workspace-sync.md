---
date: 2026-07-23
tags: [decision, sync, supabase, offline, account]
project: ai-work-os
related:
  - Projects/portfolio-view.md
  - Preferences/ui.md
  - Knowledge/portfolio-responsive-inspector.md
---

# Account Workspace Sync

## Context

Portfolio projects, tasks, connections, trash, and navigation order currently
live only in browser localStorage. The same signed-in user cannot continue work
from another device.

## Decision

- Add one Supabase `user_workspace_states` row per authenticated user.
- Store a versioned JSON snapshot of durable local workspace keys.
- Keep localStorage as the responsive local cache and offline working copy.
- Gate the signed-in workspace briefly on first load so remote state can be
  applied before feature components read localStorage.
- Use an integer revision for optimistic concurrency. A write based on an old
  revision must not silently overwrite a newer device.
- If both remote and local changed, preserve the local snapshot as a conflict
  backup before adopting the newer remote revision.
- Retry after network recovery and periodically check for updates from another
  device.
- Show quiet sync state feedback: checking, syncing, synced, offline,
  local-only, unavailable, or conflict protected.

## Synced Data

- Portfolio projects.
- Tasks, including task-map node coordinates.
- Portfolio project connections.
- Thirty-day trash contents.
- User navigation order.

## Device-local Data

- Scroll position and current selection.
- Inspector and modal open state.
- Navigation collapsed state.
- Task-map pan and zoom, because visible geometry differs by device.

## Reason

Durable work should follow the signed-in account, while viewport-dependent UI
state should remain stable for each device. A local-first cache keeps the app
usable during brief network loss, and revision checks prevent silent
last-writer data loss.

## Consequences

- Supabase requires a new RLS-protected table and migration.
- Unauthenticated or unconfigured environments continue in local-only mode.
- The first authenticated device seeds an empty remote workspace from its
  current local data.
- The operational Supabase snapshot is a synchronization layer; Vault Markdown
  remains the long-lived product and knowledge source of truth.

## Applied

On 2026-07-23, `user_workspace_states` was created in the connected Supabase
project. RLS is enabled with authenticated-user SELECT, INSERT, and UPDATE
policies scoped by `auth.uid() = user_id`. The authenticated role has only the
matching table privileges; DELETE remains unavailable. The dashboard verified
all three policies and the privilege result `true / true / true / false`.
