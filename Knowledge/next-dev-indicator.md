---
date: 2026-07-07
tags: [nextjs, ui, development]
project: ai-task-system
related:
  - Preferences/ui.md
  - Projects/AI-Task-System-Architecture.md
---

# Next.js Dev Indicator

## Context

Next.js can show a development indicator in the lower-left corner of the app.
In this project, that menu appears in English and sits on top of the AI Work OS
canvas, which conflicts with Japanese-first product review.

## Solution

For Next.js 15, disable the development indicator with:

```ts
const nextConfig = {
  devIndicators: false,
};
```

This only affects the framework development overlay. It does not change the
product UI or runtime behavior.
