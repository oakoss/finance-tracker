# Routing

Routing conventions for TanStack Router file-based routes.

## Conventions

- Flat routes for simple pages (e.g., `login.tsx`).
- Use `route.tsx` for layout routes inside a folder.
- Use `_route-name` for pathless grouping routes that should not appear in the URL.
- Route files can include both the `Route` definition and the page component.

## Route Options

Common options:

- `beforeLoad`
- `loader`
- `component`
- `pendingComponent`
- `errorComponent`
- `notFoundComponent`
- `validateSearch`
- `loaderDeps`
- `head` / `scripts` / `links` / `meta`
- `context`

### Order-sensitive properties

For type inference, place options in this order:

1. `params`, `validateSearch`
2. `loaderDeps`, `search.middlewares`, `ssr`
3. `context`
4. `beforeLoad`
5. `loader`
6. `onEnter`, `onStay`, `onLeave`, `head`, `scripts`, `headers`, `remountDeps`

Note: the TanStack Router ESLint plugin enforces this ordering.

## Search Params Validation

You can pass schemas directly to `validateSearch` (no adapter required).

## Example

```tsx
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_app/dashboard')({
  validateSearch: (search) => search,
  beforeLoad: async () => {
    // auth guard, redirects, etc.
  },
  loader: async () => {
    return { message: 'hello' };
  },
  component: RouteComponent,
  errorComponent: () => <div>Something went wrong.</div>,
});

function RouteComponent() {
  return <div>Dashboard</div>;
}
```

## Route Grouping

- `_public` for public marketing pages (landing, about, etc.).
- `_auth` for sign-up, sign-in, and auth reset flows.
- `_app` for authenticated routes.
- Add `_app/route.tsx` with auth middleware to protect authed routes.

## Dynamic Segments

- Use `$param` for path params (e.g., `users/$userId.tsx`).
- Use `$` for splats (catch-all).
