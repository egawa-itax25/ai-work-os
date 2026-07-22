---
date: 2026-07-17
tags: [sync, persistence, supabase, localstorage]
project: AI Work OS
---

# Sync Persistence Notes

## Fallback data must not become remote state

Typed fallback records are useful for first render and development, but they
are not user data. A signed-in device must not upload fallback projects or
tasks to Supabase just because a page mounted.

## Merge before replacing local arrays

For JSON array workspace state, records with stable `id` fields should be
merged when both local and remote contain data:

- remote wins for the same `id`;
- local-only records are preserved;
- the merged result is saved back to Supabase;
- local state is backed up before a remote replacement.

This prevents a PC's local task data from disappearing when cross-device sync
is enabled after the user has already created work locally.

## Global sync visibility

As of 2026-07-21, sync state should be visible on every screen.
The UI must distinguish these states:

- signed out: changes are saved only on this device;
- saving: local changes are being written to Supabase;
- synced: the workspace is available from other devices with the same account;
- local pending: local data exists and will be uploaded when auth/cloud is available;
- error: cloud sync failed, but local data remains intact.

The indicator is only a status and control layer. It must not replace the
existing merge-first persistence flow. Login must not delete local projects or
tasks.

The server and browser must render the same initial sync-indicator state.
Supabase configuration and authentication are reflected only after the browser
has mounted. This initialization rule must not change stored data or merge
behavior.

## Email confirmation is part of the sync login flow

When Supabase email confirmation is enabled, sign-up creates an account before
the account can sign in. The product must not expose Supabase's raw `Email not
confirmed` error as if registration failed.

- Explain in Japanese that the account is waiting for email confirmation.
- Provide an in-place confirmation-email resend action.
- Send confirmation links through an app-owned auth callback and return to the
  portfolio after the session is established.
- Keep local projects and tasks intact while confirmation is pending.
- A resend or callback failure must leave local-only persistence operational.

## Authentication status must be authoritative

The global sync indicator must not infer the current login state from an old
successful sync snapshot. Authentication and persistence history are separate:

- the current login state is resolved from the server-side Supabase session;
- a previous `lastSyncedAt` value does not mean the user is currently signed in;
- while authentication is being checked, the UI shows a checking state instead
  of briefly reporting that the user is signed out;
- manual cloud sync is disabled while signed out;
- signing out must normalize the visible status to local-only without deleting
  local projects or tasks.

Japanese UI copy in JSX must be written as Japanese text or as a JavaScript
string expression. A literal `\\uXXXX` sequence in a JSX text node is rendered
as visible escape characters and must not be used.
