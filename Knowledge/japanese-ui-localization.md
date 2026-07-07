---
date: 2026-07-06
tags: [ui, japanese, localization, quality]
project: ai-task-system
related:
  - Decisions/2026-07-06-japanese-spatial-canvas-polish.md
  - Projects/AI-Task-System-Architecture.md
---

# Japanese UI Localization

## Learning

For this project, visible UI text should be authored as Japanese UI copy, not translated mechanically from English.

## Practical Rules

- Avoid visible English labels in menus, headings, buttons, status, dummy data, AI messages, and tooltips.
- Replace English-like product words with Japanese-facing wording when possible, such as `AI仕事基盤`, `知識庫`, `空間キャンバス`, and `流動スコア`.
- Check generated pages for mojibake or old English dummy data after editing Japanese text.
- Japanese labels need more horizontal room, stable line height, and `whitespace-nowrap` on compact navigation controls.

## Verification

Run lint and build, then inspect the generated UI in desktop and mobile widths.
