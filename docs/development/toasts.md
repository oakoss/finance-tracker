# Toasts

We use Sonner for toasts.

## When to use

- User-initiated actions: save, delete, import, export, settings changes.
- Background completion: import finished, report generated.

## When not to use

- Initial page load.
- Inline validation errors (use field errors instead).

## Guidelines

- Success: short (3–4s) and concise.
- Error: longer (6–8s) with a short fix hint.
- Destructive actions: confirm first, then toast on completion.
