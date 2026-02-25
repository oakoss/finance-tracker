# Cookies

We use `universal-cookie` for client and server cookie handling and `cookie`
for `Set-Cookie` serialization.

See `docs/adr/0019-cookie-management.md` for the decision.

## Storage Policy

Cookies are the **only** browser persistence mechanism we use. Do not use
`localStorage` or `sessionStorage` — they are not SSR-safe and add unnecessary
complexity. IndexedDB is reserved for future offline support via TanStack DB.

| Storage   | Use                                                        |
| --------- | ---------------------------------------------------------- |
| Cookies   | Persistent UI state (sidebar, theme, locale)               |
| Memory    | Everything else (Query cache, form state, component state) |
| IndexedDB | Reserved for future offline mode (via `@tanstack/db`)      |

## Client Usage

```ts
import { setClientCookie } from '@/lib/cookies';

setClientCookie('sidebar_state', 'true', { maxAge: 60 * 60 * 24 * 7 });
```

## Server Usage

```ts
import {
  appendSetCookieHeaders,
  createServerCookies,
  serializeServerCookie,
} from '@/lib/cookies';

const cookies = createServerCookies(request.headers.get('cookie'));
const locale = cookies.get('APP_LOCALE');

const headers = new Headers();
const setCookieHeaders = serializeServerCookie('APP_LOCALE', 'en-US', {
  maxAge: 60 * 60 * 24 * 365,
});
appendSetCookieHeaders(headers, setCookieHeaders);
```
