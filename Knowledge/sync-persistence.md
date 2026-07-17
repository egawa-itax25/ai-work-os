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
