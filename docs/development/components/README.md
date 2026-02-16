# Components Golden Rule

This guide defines how we build components in this repo. It is the source of
truth for structure, behavior, and integration with Base UI and TanStack.

## Ownership rules

- `src/components/ui/*`: reusable, styled UI components. No product copy.
- `src/components/*`: blocks and compositions. Product copy allowed.
- `src/routes/*`: pages. Compose blocks and fetch data.

## Stack alignment

- Base UI provides behavior + accessibility primitives.
- TanStack Router handles navigation and links.
- TanStack Form handles form state with render props.
- TanStack Query handles mutations and cache updates.

## Core rules

- Prefer composition and slots over giant prop surfaces.
- Keep `ui` components generic and theme-friendly.
- Use `data-slot` and `data-state` for styling hooks.
- Support controlled and uncontrolled patterns where reasonable.
- Examples must pass lint, format, and typecheck.

## Topics

- Structure and data attributes: `docs/development/components/structure.md`
- Behavior (state + accessibility): `docs/development/components/behavior.md`
- Implementation (types + Base UI render patterns): `docs/development/components/implementation.md`
- TanStack integrations: `docs/development/components/tanstack.md`
- Form examples: `docs/development/components/examples/form.md`
- Typography examples: `docs/development/components/examples/typography.md`

## Global styling and tokens

- Styling: `docs/development/styling.md`
- Design tokens: `docs/development/design-tokens.md`
