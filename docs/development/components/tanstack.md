# TanStack Components

This doc covers how UI components integrate with TanStack libraries.

## Router

- Use `Link` from TanStack Router for internal navigation.
- Avoid raw `<a>` tags for app routes.

## Form (TanStack Form)

- Use `useForm` and `form.Field` render props.
- Add `data-invalid` to `Field` and `aria-invalid` to inputs.

### Validation

- **Single source of truth**: Import the server schema from
  `types.ts` (e.g. `createCategorySchema`) and use it — or a
  derivation of it — as the form validator. Never duplicate
  validation logic in the form component.
- If the form needs a subset or variant, derive it with
  `.pick()` / `.omit()` / `.merge()` — don't write a new schema.
- Validate on both `onBlur` and `onSubmit`:

  ```ts
  validators: { onBlur: createFooSchema, onSubmit: createFooSchema }
  ```

- For optional fields that use empty string as "unset" in the UI
  (e.g. a select with a "None" option), store `undefined` in form
  state so the schema's `'field?'` constraint works. Map sentinel
  values to `undefined` in `onValueChange`.

## Query (TanStack Query)

- Use `useMutation` for submissions.
- Mutations call TanStack Start server functions.
- Invalidate queries after success.

## Table

- Hooks live outside `ui` components.
- `ui` table components should render only structure and cells.
- Prefer controlled state for complex tables (`state` + `on*Change`).
- Use `manualPagination` and `manualFiltering` for server-side tables.
- Provide `getRowId` when selection needs stable identifiers.
- Extract reusable controls (column header, pagination, view options) only when
  reused across multiple tables.

### Example: controlled table state

```tsx
const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
  [],
);
const [pagination, setPagination] = React.useState({
  pageIndex: 0,
  pageSize: 10,
});

const table = useReactTable({
  columns,
  data,
  getCoreRowModel: getCoreRowModel(),
  getFilteredRowModel: getFilteredRowModel(),
  getPaginationRowModel: getPaginationRowModel(),
  onColumnFiltersChange: setColumnFilters,
  onPaginationChange: setPagination,
  state: {
    columnFilters,
    pagination,
  },
});
```

### Example: server-side pagination + filtering

```tsx
const [pagination, setPagination] = React.useState({
  pageIndex: 0,
  pageSize: 20,
});
const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
  [],
);

const table = useReactTable({
  columns,
  data: serverRows,
  getCoreRowModel: getCoreRowModel(),
  manualPagination: true,
  manualFiltering: true,
  rowCount: totalRowCount,
  onPaginationChange: setPagination,
  onColumnFiltersChange: setColumnFilters,
  state: {
    columnFilters,
    pagination,
  },
});
```

## Virtual

- Virtualization is handled by `@tanstack/react-virtual` in blocks.
- `ui` components should not own virtual logic.
- Infinite scroll uses manual pagination plus virtualization.
