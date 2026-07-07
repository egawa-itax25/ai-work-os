---
date: 2026-07-06
tags: [decision, ui, ai-work-os, spatial-canvas]
project: ai-task-system
related:
  - Projects/AI-Task-System-Architecture.md
  - .cursor/rules/04-ui.mdc
---

# AI Work OS Spatial Canvas

## Context

The product should move beyond a conventional task dashboard. The desired experience is a near-future work operating system where AI, tasks, projects, knowledge, and flow are manipulated in one spatial surface.

## Decision

The primary cockpit UI will use a full-screen dark spatial canvas:

- Tasks appear as glowing planets or spheres, not cards.
- Projects appear as star systems around task clusters.
- Dependencies appear as orbit and gravity-like flow paths instead of simple arrows.
- AI focus highlights the work that needs attention now.
- A top-centered Flow Score summarizes the health of work.
- The immersive cockpit still needs a compact navigation surface so users can
  move to Portfolio, tasks, knowledge, and settings without relying on the
  hidden app shell.
- A right inspection panel exposes task metadata, AI commentary, related notes, people, and projects.
- A bottom timeline projects future bottlenecks.

## Reason

The product concept is to visualize and keep work flowing with AI, rather than merely list tasks. A spatial canvas better supports dependency awareness, zoomable context, and the feeling of operating work itself.

## Consequences

- The cockpit should prioritize motion, spacing, hover/drag feel, and visual hierarchy over adding many static features.
- Existing task data can remain Markdown-compatible while the presentation becomes more spatial.
- Future integrations such as RAG, MCP, agents, calendar, Slack, Gmail, GitHub, OpenAI, Claude, and an Obsidian plugin should attach to this spatial work graph.
- Hiding the standard sidebar in the cockpit must not trap the user. The
  cockpit should include its own low-noise navigation entry points.

## Revisit When

- The canvas becomes visually impressive but less useful for deciding the next action.
- Real Vault parsing exposes data that requires a different graph model.
- Performance or accessibility constraints require a simpler rendering strategy.
