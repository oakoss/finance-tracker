# Components Structure

This doc covers composition patterns and data-attribute conventions.

## Composition rules

- Prefer small, composable pieces over monolithic components.
- Use compound components for multi-part UI.
- Keep layout scaffolding in blocks, not `ui` components.
- For tables, extract reusable controls (header, pagination, view options) only
  after they are reused.

### Compound example (structure only)

```tsx
<Menu.Root>
  <Menu.Trigger>Open</Menu.Trigger>
  <Menu.Content>
    <Menu.Item>One</Menu.Item>
  </Menu.Content>
</Menu.Root>
```

## Slots and naming

- Root container: `Root` or component name.
- Interactive element: `Trigger`.
- Content region: `Content`.
- Structural parts: `Header`, `Body`, `Footer`.

## data-attributes

Use attributes to expose internal state and slots for styling.

- `data-slot`: stable part names (kebab-case).
- `data-state`: interactive state (`open`, `closed`, `active`, `loading`).

### Convention

- `data-slot="input"`
- `data-slot="trigger"`
- `data-state="open"`

Avoid encoding styling intent in slot names.
