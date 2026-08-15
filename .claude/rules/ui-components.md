---
paths:
  - src/components/ui/**/*
  - src/components/data-grid/**/*
  - src/components/filters/**/*
---

# UI Component Rules

- shadcn/ui style is `base-nova` (Base UI variant, not Radix).
- Use `render` prop / `mergeProps` pattern, not `asChild`.
- Icon library: Lucide.
- See `docs/development/components/` for the component authoring guide.

## Styling pattern

Uses CVA (class-variance-authority) + `cn()`:

```ts
const variants = cva('base-classes', {
  variants: { size: { sm: '...', md: '...' } },
});
// Apply:
cn(variants({ size }), className);
```

## Field anatomy

Components use `data-slot` attributes for semantic CSS targeting:

- `<FieldSet>` — Fieldset wrapper (`data-slot="field-set"`)
- `<FieldLegend>` — Legend with `variant` (legend/label)
- `<FieldGroup>` — Container for related fields (`data-slot="field-group"`)
- `<Field orientation="vertical|horizontal|responsive">` — Individual field
- `<FieldContent>` — Inner flex wrapper
- `<FieldLabel>` / `<FieldTitle>` — Label with optional icon
- `<FieldDescription>` — Helper text
- `<FieldError errors={...}>` — Deduped error rendering (single or list)

## InputGroup composition

- `<InputGroup>` — Fieldset-based container
- `<InputGroupAddon align="inline-start|inline-end|block-start|block-end">` — Flexible addon slots
- `<InputGroupButton>` / `<InputGroupText>` — Button or text/icon addons
- `<InputGroupInput>` / `<InputGroupTextarea>` — Actual input elements
- Clicking an addon focuses the input automatically.

## Filters system

A full filter UI in `src/components/filters/` (split across 10 files). Do not rebuild — use it:

- Context-based: `FilterContext` provides variant, size config.
- Field types: `select`, `multiselect`, `text`, `custom`, `separator`.
- 28 predefined operators (is, contains, between, empty, etc.).
- Custom validation (regex or function) and custom rendering per field.
- Helpers: `createFilter()`, `createFilterGroup()`, `createOperators()`, `formatOperator()`.
- Import from `@/components/filters` (main component) or individual modules.

## Data grid system

A composable data grid in `src/components/data-grid/` (4 files). Do not rebuild — use it:

- Feature registry: `createDataGridFeatures<TData>()` in `features.ts`. v9 only
  exposes an API when its feature is registered, so a new call in `table.tsx` or
  `pagination.tsx` needs its feature added there first. Call it at module level.
- Column meta (`cellClassName`, `headerClassName`, `skeleton`) is scoped to that
  feature set, not declared globally. `headerTitle` is also defined but nothing
  reads it — see the note on the field before relying on it.
- Columns files use `createDataGridColumnHelper<TRow>()` from `features.ts`. Do
  not call `createColumnHelper` directly — it drops the grid's feature binding.
- Context-based: `DataGridContext` provides table instance, props, loading state.
- Composed table: `DataGridTable` assembles head/body/rows, with skeleton and
  spinner loading. `table.tsx` also exports its head/body/row/cell parts so new
  table variants can be composed from them rather than forked.
- `tableLayout` flags control borders, density, stripes, column resizing, sticky
  header, width mode and column pinning. Every flag is defaulted in `DataGrid`
  and no consumer currently overrides them.
- Pagination: page size selector, page buttons, ellipsis grouping.
- Helpers: `getColumnMeta()`, `DataGridContainer`.
- Import from `@/components/data-grid` (context/provider/types) or individual modules.
