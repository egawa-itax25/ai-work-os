---
date: 2026-07-23
tags: [preferences, collaboration, safety]
project: ai-work-os
related: []
---

# Collaboration Preferences

## Confirmations And Permissions

When work needs user judgment, permission, authentication, or a potentially
destructive operation, collect related questions into one concise request.
Explain why each answer is needed, state the recommended choice, and make the
reply format simple.

Do not repeatedly interrupt work for small, safe, reversible implementation
choices that can be resolved from repository context. While waiting for a
decision, continue unaffected investigation and safe local work.

Always obtain explicit permission before destructive or hard-to-reverse work,
production changes, credential or environment-variable changes, external
service commitments, public-scope changes, GitHub push, pull-request creation
or merge, or other authenticated external operations.

Do not ask the same answered question again. If new information requires a
follow-up, state what changed, why the new decision is needed, the options, the
recommendation, and the impact.
