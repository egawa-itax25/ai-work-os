---
type: decision
date: 2026-07-12
status: accepted
---

# Hide low-priority inspector blocks from Project Inspector

## Context

The Project Inspector had a "Project connections" editing block. After that
was removed, the user clarified that the remaining always-visible AI insight
and risk editing blocks were also unnecessary in the current inspector flow.

## Decision

Remove the visible project-connection, AI insight, and risk editing blocks from
Project Inspector. Keep the underlying data fields for now so existing data and
future contextual views are not destroyed.

## Consequences

Project Inspector becomes cleaner and focuses on direct project details and
actions. AI/risk information and project relationship editing can return later
in a more appropriate contextual flow if needed.
