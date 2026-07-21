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
