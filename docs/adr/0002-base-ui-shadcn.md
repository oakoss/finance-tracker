# ADR 0002: Use base-ui variant of shadcn-style UI

Date: 2026-02-13
Status: Accepted

## Context

We want accessible, composable UI primitives with a shadcn-style workflow, but prefer base-ui primitives.

## Decision

Use shadcn-style components based on the base-ui variant.

## Alternatives Considered

- Radix-based shadcn
- Fully custom component library
- Headless UI

## Consequences

- Positive: Accessible primitives + rapid UI assembly; consistent component patterns.
- Negative: Need to align component generation/updates with repo conventions.
- Follow-ups: Decide the styling approach (Tailwind vs CSS variables + utility mix) once the scaffold is in place.
