---
date: 2026-07-07
tags: [portfolio, priority-score, ai]
project: ai-task-system
related:
  - Projects/portfolio-view.md
  - Decisions/2026-07-07-portfolio-view.md
---

# Portfolio Priority Score

## Purpose

Priority Score ranks projects in Portfolio View. It should be explainable, not a
black-box number.

## Initial Mock Inputs

Use a deterministic breakdown that can later be replaced by AI:

- Deadline impact.
- Downstream task impact.
- Whether the user currently has the ball.
- Business importance.
- Stalled risk.

## Important Modeling Rule

Project owner and current ball holder must stay separate.

Owner is the person accountable for the project. Current ball holder is the
person, group, customer, or AI actor whose next action moves the project forward.

The UI may show both values next to each other, but filters and scoring should
use `currentBallHolder` for "who must act now".
