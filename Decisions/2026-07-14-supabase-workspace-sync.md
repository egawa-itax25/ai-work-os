# Decision: Supabase-backed Workspace Sync

Date: 2026-07-14

## Context

The AI Work OS started by storing editable Portfolio and task state in browser
localStorage. That made iteration fast, but it also meant changes were isolated
to one browser. The user now wants projects and tasks created on one device to
appear on another PC, browser, or phone.

## Decision

Use Supabase as the shared workspace-state store for logged-in users. Keep
localStorage as a local cache and unauthenticated fallback so the UI stays fast
and still works before sign-in.

## Reason

Supabase is already part of the stack and environment. A small key-value
workspace state table lets the current UI synchronize immediately without a
large schema rewrite. It also keeps a future path open for normalized project,
task, trash, and knowledge tables.

## Consequences

- Cross-device sync requires signing in with the same Supabase Auth account.
- The first sync layer stores JSON by state key, then the app can later migrate
  hot paths to normalized relational tables.
- API routes should reject unauthenticated remote writes instead of exposing a
  public write endpoint.
