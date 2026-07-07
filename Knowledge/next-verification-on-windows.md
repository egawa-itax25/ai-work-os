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
- If `http://127.0.0.1:<port>` returns plain `Internal Server Error` while
  `npm.cmd run build` succeeds, the port may be held by a stale Next dev
  process. Check the PID with `netstat -ano | Select-String ':<port>'`, stop
  that process, then start the dev server again.
- A phone cannot open the PC's dev server with `127.0.0.1` because that address
  points to the phone itself. Use the PC's LAN IPv4 address instead, for example
  `http://172.16.1.157:3030/portfolio`, and keep the phone on the same Wi-Fi.
  Confirm the dev server is listening on `0.0.0.0:<port>` or the LAN address
  before testing from the phone.
- For phone review outside the local network, deploy the GitHub repository to
  Vercel and use the HTTPS deployment URL. This avoids LAN IP changes,
  same-Wi-Fi requirements, and mobile localhost confusion.

## Applies When

Use this note when verifying Next.js UI changes on Windows or when CSS assets appear to be missing after a successful build.
