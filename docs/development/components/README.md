# Components Golden Rule

How we build components in this repo.

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
- Confirm destructive dialog: `docs/development/components/examples/confirm-destructive-dialog.md`
- Form examples: `docs/development/components/examples/form.md`
- Typography conventions: `docs/development/styling.md` (Typography section)

## Selection components

Three selection primitives, each for a different use case:

- **Select** — closed dropdown, pick one from a short list. No
  typing. Use for enums, statuses, and fixed options (5-15 items).
- **Combobox** — type-to-filter from a known entity list. Supports
  single and multi select (chips), item indicators, clear button.
  Use for accounts, categories, payees, tags.
- **Autocomplete** — free-text input with a suggestion dropdown.
  The user can type anything; suggestions assist but don't
  constrain. Use for search, addresses, and freeform fields where
  hints help.

When in doubt: if the value **must** come from the list, use
Combobox. If the user can submit any text, use Autocomplete.

## Styling and tokens

- Styling and design tokens: `docs/development/styling.md`
