# Decision: Mobile Task Flow Map uses a wider touch canvas

Date: 2026-07-10

## Context

The desktop Task Flow Map uses a spatial two-column ownership layout with
draggable task nodes. On mobile, the same visible width makes the self/other
zones, zone labels, task cards, and controls overlap.

## Decision

Keep the desktop Task Flow Map unchanged. For mobile widths only, the map should
use a wider horizontal touch canvas inside the existing page so the ownership
zones and task cards retain readable proportions. Users can scroll horizontally
inside the map while keeping the same drag/drop mental model.

Mobile zone headings, spacing, and controls should be smaller and easier to tap,
but the product model stays the same:

- self ball
- other ball
- done
- draggable task nodes
- zoom controls

## Consequences

- Desktop layout remains stable.
- Mobile layout becomes more readable and touchable without rewriting task flow
  behavior.
- Future mobile improvements should continue to be scoped with responsive styles
  instead of changing the desktop interaction model.
