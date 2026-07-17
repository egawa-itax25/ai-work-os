---
date: 2026-07-17
tags: [sync, supabase, persistence]
project: AI Work OS
related: [2026-07-14-supabase-workspace-sync]
---

# Decision: Cross-device sync hardening

## Context

The user wants projects and tasks entered on the main PC to appear on a phone
and on another PC. The app already has a Supabase-backed `workspace_states`
store, but the first sync experience was still fragile:

- The login/signup UI was hard to understand on mobile.
- A device could not tell whether the local cache or the remote workspace was
  newer.
- A remote value could replace local data without keeping a recovery copy.

## Decision

The app will treat Supabase as the canonical shared workspace for signed-in
users. Browser `localStorage` remains a cache and offline fallback, but it is
not the cross-device source of truth.

Sync helpers must:

- keep a per-device local sync timestamp;
- compare local and remote timestamps before replacing data;
- push local non-empty data to Supabase when the remote state is empty;
- preserve a small local backup before overwriting cached state from Supabase;
- show signed-out, local-only, saving, synced, and error states distinctly.

## Reason

The user is already operating across PC, phone, and future secondary PCs. The
product must protect work data during deployment, browser switching, and login
state changes before moving to fully normalized database tables.

## Consequences

- Cross-device sync requires logging in with the same Supabase Auth account.
- Links can be shared, but workspace changes should require authentication.
- The current JSON state table remains acceptable for the MVP.
- If the sync layer ever has to choose between remote and local data, it must
  avoid silent destructive overwrites and keep a recovery snapshot.
- A future migration can add server-side version history, but the immediate fix
  is local overwrite protection plus clearer sync state.
