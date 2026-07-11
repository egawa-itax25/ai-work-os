---
type: decision
date: 2026-07-12
status: accepted
---

# Hide project connections from Project Inspector

## Context

The Project Inspector had a "Project connections" editing block. The user
identified it as unnecessary in the current inspector flow.

## Decision

Remove the visible project-connection editing block from Project Inspector.
Keep the underlying connection data for now so existing data and future
map-level relationship work are not destroyed.

## Consequences

Project Inspector becomes cleaner and focuses on project details, AI insight,
and risk information. Project relationship editing can return later in a more
appropriate flow if needed.
