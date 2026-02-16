# ADR 0018: i18n via Paraglide JS

Date: 2026-02-15
Status: Accepted

## Context

We need a TanStack Start-compatible i18n solution that supports future languages, cookie-based locale detection, and type-safe translations.

## Decision

- Adopt Paraglide JS (inlang) for translations and locale management.
- Use a cookie-first strategy with fallback to Accept-Language and base locale.
- Keep locale out of the URL for MVP.

## Alternatives Considered

- react-i18next
- react-intl (FormatJS)
- Intlayer

## Consequences

- Positive: Official TanStack Start examples; type-safe messages; modern tooling.
- Negative: Requires build-time plugin and inlang project config.
- Follow-ups: Add a language switcher that updates cookie + user preferences.
