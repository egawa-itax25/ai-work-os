---
date: 2026-07-23
tags: [knowledge, sync, supabase, local-first, conflict]
project: ai-work-os
related:
  - Decisions/2026-07-23-account-workspace-sync.md
  - Projects/portfolio-view.md
  - Preferences/ui.md
---

# Account Workspace Sync

## Runtime Model

AI Work OS keeps durable browser work in localStorage for immediate interaction
and mirrors a versioned snapshot to one Supabase row per authenticated user.
The workspace waits for the initial account check before feature components
read localStorage, preventing an old device cache from flashing or overwriting
the account state.

The synchronized snapshot contains only the known durable keys for projects,
tasks, project connections, trash, and navigation order. Selection, scroll,
open panels, collapsed navigation, and task-map pan/zoom remain device-local.

## Concurrency And Recovery

Every cloud write includes the revision the device last observed. Supabase
updates only that revision. A mismatch returns the latest snapshot instead of
silently accepting a stale write.

When local and remote work both changed, the remote revision is adopted and the
local snapshot is saved under `ai-work-os:sync-conflict-backup:v1`. The UI
notifies the user that a backup was protected. Each signed-in account also has
its own device cache so changing accounts does not leak one user's workspace
into another user's cloud row.

Network loss does not block local editing. The client reports an offline or
unavailable state, retries after reconnecting, and checks periodically for
updates made by another device.

## Operational Requirement

Apply `supabase/user_workspace_states.sql` before enabling external sync. The
table uses `auth.users` as its owner key and Row Level Security policies that
allow authenticated users to select, insert, and update only their own row.
It also grants the authenticated role only the SELECT, INSERT, and UPDATE table
privileges required by the Data API; DELETE is intentionally not granted. No
existing customer or notification data is changed by this migration.

If Supabase is not configured or the table does not exist, the API returns a
service-unavailable response and the product continues with the local cache.
