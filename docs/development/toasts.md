# Toasts

Toast notifications use [Sonner](https://sonner.emilkowal.dev/).

## Setup

The `Toaster` component (`src/components/ui/sonner.tsx`) wraps Sonner
with theme-aware styling via `next-themes` and custom Lucide icons for
each toast type (success, error, info, warning, loading). CSS variables
wire it into the app's design token system.

Mount `<Toaster />` in the root layout so it is available on all pages.

## Usage

Import `toast` directly from `'sonner'`:

```tsx
import { toast } from 'sonner';

// Success
toast.success('Account created');

// Error with description
toast.error('Import failed', {
  description: 'Check the CSV format and try again.',
});

// Promise-based (shows loading → success/error)
toast.promise(saveData(), {
  error: 'Save failed',
  loading: 'Saving...',
  success: 'Saved',
});
```

No project-local wrapper is needed; use the `toast` export directly.

## When to use

- User-initiated mutations: save, delete, import, export, settings
  changes
- Background task completion: import finished, report generated
- Destructive action confirmation: toast after the action completes (use
  `ConfirmDestructiveDialog` before)

## When not to use

- Initial page load
- Inline validation errors (use field errors instead)
- Navigation feedback (the router handles this)

## Duration guidelines

| Type    | Duration | Notes                          |
| ------- | -------- | ------------------------------ |
| Success | 3-4 s    | Short, concise message         |
| Error   | 6-8 s    | Include a short fix hint       |
| Loading | Auto     | Dismisses when promise settles |

## E2E testing

Sonner toasts persist across client-side navigations and take
several seconds to auto-dismiss. A toast from `beforeEach` setup
can interfere with the test body. See the
[E2E toast cleanup](e2e/README.md#writing-tests) section for the
`beforeEach` cleanup pattern.
