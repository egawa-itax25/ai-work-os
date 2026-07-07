---
date: 2026-07-07
tags: [decision, deployment, vercel, mobile-preview]
project: ai-task-system
related:
  - Projects/AI-Task-System-Architecture.md
  - Knowledge/next-verification-on-windows.md
---

# Vercel Mobile Preview

## Context

Local development URLs such as `127.0.0.1` are not reliable for phone review
because they point to the phone itself. LAN IP testing works only when the PC
and phone are on the same network.

The user wants to review AI Work OS from a phone without depending on the local
network setup.

## Decision

Use GitHub and Vercel as the default mobile review path.

The repository remains hosted at:

```text
egawa-itax25/ai-work-os
```

Vercel should import this GitHub repository and build the Next.js application.
After that, phone review should use the Vercel deployment URL instead of
`127.0.0.1` or the PC LAN IP.

## Reason

Vercel gives a stable HTTPS URL that works from phones, tablets, and other
networks. It also keeps preview and production deployments tied to GitHub
commits, which fits the existing GitHub-based development flow.

## Consequences

- Local LAN URLs remain useful for fast same-network checks.
- GitHub must be kept up to date before Vercel deploys the latest UI.
- Environment variables must be configured in Vercel if features depend on
  `.env.local`.
- Deployment verification should include both local build success and Vercel
  page load on mobile.
