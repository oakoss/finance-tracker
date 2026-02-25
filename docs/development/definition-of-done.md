# Definition of Done

Every feature task must meet these criteria before it is considered
complete.

## Checklist

### Responsive

- Design mobile-first, then scale up to desktop.
- Test at 320px, 768px, and 1280px breakpoints.

### Internationalization

- All user-facing strings use Paraglide message functions.
- English only for MVP, but wired for future locales.

### UI States

- **Empty states**: Explanation and clear next action for every
  list/collection view. Use the shared empty state template component.
- **Loading states**: Skeleton screens for data-dependent content. Use
  skeleton patterns from shared components (not spinners).
- **Error states**: Error boundary or inline error display for failed
  data fetches. Use `createError()` for structured server errors.

### User Feedback

- **Toast feedback**: Success/error toasts on all mutations (create,
  update, delete).
- **Type-to-confirm**: All destructive actions (delete, remove,
  archive) use `ConfirmDestructiveDialog`.

### Audit & Logging

- Server functions log `action`/`outcome` via `log.info()` for all
  CRUD operations.
- Follow the allowlist-only logging pattern (see
  `docs/development/logging.md`).

### Accessibility

- All interactive elements reachable via Tab.
- Operable via Enter/Space.
- Dismissible via Escape (dialogs, popovers, dropdowns).

### Testing

- **Server function tests (TDD)**: Write tests for server functions
  and business logic before implementation.
- **E2E test**: Happy-path E2E test for the feature using Playwright
  `test.step()`.
- **Unit tests**: Complex client-side logic (hooks, utilities,
  validators) if applicable.

See `docs/development/testing.md` for testing patterns and examples.
