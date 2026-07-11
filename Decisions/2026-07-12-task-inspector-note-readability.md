---
type: decision
date: 2026-07-12
status: accepted
---

# Task Inspector note readability

## Context

The Task Inspector next-action field looked like a flat gray input block. It was
editable, but it did not read well as task context.

## Decision

Keep the field editable, but style it as a readable dark note surface:

- softer dark background instead of flat gray
- subtle border and inner depth
- more comfortable padding and line height
- clear focus state for editing

## Consequences

The field remains lightweight and editable while feeling more like useful task
context than a raw form field.
