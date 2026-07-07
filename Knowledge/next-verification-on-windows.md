---
date: 2026-07-06
tags: [nextjs, windows, verification]
project: ai-task-system
related:
  - Projects/AI-Task-System-Architecture.md
---

# Next Verification On Windows

## Context

PowerShell may block `npm.ps1` because of the local execution policy. Use `npm.cmd` for normal package scripts in this workspace.

## Notes

- `npm.cmd run lint` works for ESLint verification.
- `npm.cmd run build` works for production build verification.
- If a Next server serves stale or missing CSS, remove the generated `.next` cache and rebuild.
- When using a long-lived browser automation session, restart the Next server after rebuilding so it does not keep serving stale build state.

## Applies When

Use this note when verifying Next.js UI changes on Windows or when CSS assets appear to be missing after a successful build.
