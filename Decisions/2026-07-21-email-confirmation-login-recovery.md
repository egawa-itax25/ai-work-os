---
date: 2026-07-21
tags: [decision, auth, supabase, sync, login]
project: AI Work OS
---

# Email confirmation login recovery

## Context

Supabase email confirmation is enabled. A newly registered user could attempt
to log in before opening the confirmation email and see the raw English error
`Email not confirmed`. The UI offered no recovery action, and the project had
no app-owned auth callback route.

## Decision

- Translate confirmation-related authentication errors into actionable
  Japanese guidance.
- Add `確認メールを再送` to the existing login form.
- Configure sign-up and resend links to return through `/auth/callback`.
- Exchange the confirmation code for a session in the callback, then return to
  `/portfolio`.
- Preserve existing local data throughout registration, confirmation, and
  login; authentication recovery does not alter workspace state.

## Consequences

Users can recover without leaving the login context. Supabase must allow the
deployed callback URL in its authentication redirect configuration. If cloud
authentication is unavailable, the application's local persistence remains
unchanged.
