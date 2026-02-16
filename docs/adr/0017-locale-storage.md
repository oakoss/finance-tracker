# ADR 0017: Locale Storage via Cookie + User Preferences

Date: 2026-02-15
Status: Accepted

## Context

We want locale-aware formatting and future translations without URL locale prefixes. We also want to avoid local/session storage and keep DB reads minimal.

## Decision

- Store the active locale in a cookie for fast access on public and authenticated pages.
- Persist the locale in `user_preferences.locale` for logged-in users.
- On login or preference updates, sync the cookie with `user_preferences`.
- Default: cookie → Accept-Language → `en-US`.

## Alternatives Considered

- Locale in URL paths (e.g., `/en/...`).
- Local/session storage only.

## Consequences

- Positive: Simple routing, fast locale reads, easy for public pages.
- Negative: Need to keep cookie and DB in sync for authenticated users.
- Follow-ups: Add a language switcher that updates cookie + user preferences.
