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
  `validators.ts` (e.g. `createCategorySchema`) and use it — or a
  derivation of it — as the form validator. Never duplicate
  validation logic in the form component.
- If the form needs a subset or variant, derive it with
  `.pick()` / `.omit()` / `.merge()` — don't write a new schema.
- **Choosing validators** — each fires at a different time and
  errors persist until that same validator re-runs:

  | Validator       | Fires when              | Best for                                                                  |
  | --------------- | ----------------------- | ------------------------------------------------------------------------- |
  | `onSubmit`      | Form submission         | Final gate. Always include.                                               |
  | `onBlur`        | Field loses focus       | Text inputs — validates after the user stops typing.                      |
  | `onChange`      | Every value change      | Selects, radios, checkboxes — each change is deliberate, not a keystroke. |
  | `onChangeAsync` | Value change, debounced | Async checks (uniqueness) — pair with `onChangeAsyncDebounceMs`.          |
  | `onMount`       | Field mounts            | Pre-populated data sanity checks.                                         |

  **Default pattern for text inputs** — `onBlur` + `onSubmit`:

  ```ts
  validators: { onBlur: schema, onSubmit: schema }
  ```

  **Selects, radios, checkboxes** — `onChange` + `onSubmit` is fine
  since there are no keystrokes to interrupt. For multi-step forms
  where errors shouldn't show before the first submit attempt, gate
  on `submissionAttempts`:

  ```ts
  validators: {
    onChange: (params) => {
      if (params.fieldApi.form.state.submissionAttempts === 0) return;
      // validate...
    },
    onSubmit: schema,
  }
  ```

  **Error lifecycle**: an `onSubmit` error persists until the next
  submit. An `onChange` error clears/updates on every change. Pair
  them so errors clear reactively after a failed submit.

- For optional fields that use empty string as "unset" in the UI
  (e.g. a select with a "None" option), store `undefined` in form
  state so the schema's `'field?'` constraint works. Map sentinel
  values to `undefined` in `onValueChange`.

### Reactivity: `form.state` vs `form.Subscribe`

Reading `form.state.isSubmitting` (or any form state) directly in
JSX **does not trigger re-renders**. The value updates internally
but the component won't know.

```tsx
// WRONG — will not re-render when isSubmitting changes
<Input disabled={form.state.isSubmitting} />

// RIGHT — reactive subscription
<form.Subscribe selector={(s) => s.isSubmitting}>
  {(isSubmitting) => <Button disabled={isSubmitting}>Save</Button>}
</form.Subscribe>

// RIGHT — hook-based subscription
const isSubmitting = useStore(form.store, (s) => s.isSubmitting)
```

This applies to all `form.state.*` properties: `isSubmitting`,
`canSubmit`, `isValid`, `submissionAttempts`, etc.

### Input disabled state during submission

Do **not** disable inputs with `form.state.isSubmitting`. If
`isSubmitting` gets stuck (reactivity issue above), users cannot
correct validation errors. Only disable the **submit button** via
`form.Subscribe`.

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
  state: { columnFilters, pagination },
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
  state: { columnFilters, pagination },
});
```

## Virtual

- Virtualization is handled by `@tanstack/react-virtual` in blocks.
- `ui` components should not own virtual logic.
- Infinite scroll uses manual pagination plus virtualization.
