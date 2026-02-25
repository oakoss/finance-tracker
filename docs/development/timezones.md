# Timezones

Timezone handling for server and client rendering.

See `docs/adr/0016-user-preferences-table.md` for where the user's
timezone preference is stored.

## Storage

- All timestamps are stored as `timestamp({ withTimezone: true })` in
  Postgres (UTC). See `docs/development/database.md`.
- The user's preferred display timezone is stored in
  `userPreferences.timeZone` (defaults to `'UTC'`).

## Formatting utilities

`src/lib/i18n.ts` provides timezone-aware formatters. All accept an
optional `timeZone` parameter and default to `'UTC'`:

| Function             | Output example          | Notes                       |
| -------------------- | ----------------------- | --------------------------- |
| `formatDate`         | `23 Feb 2026`           | Date only                   |
| `formatDateTime`     | `23 Feb 2026, 14:30`    | Date + time, no seconds     |
| `formatDateTimeFull` | `23 Feb 2026, 14:30:05` | Date + time + seconds       |
| `formatMonthYear`    | `February 2026`         | Month and year              |
| `formatRelativeTime` | `3 hours ago`           | Timezone-agnostic (ms diff) |

Formatter instances are cached by `locale:options` key to avoid
repeated `Intl.DateTimeFormat` construction.

`getUserTimeZone()` returns the browser's timezone via
`Intl.DateTimeFormat().resolvedOptions().timeZone`.

## Timestamp component

`src/components/ui/timestamp.tsx` displays a formatted date with a
hover tooltip showing four rows:

1. **UTC** time
2. **Local timezone** (only if different from UTC)
3. **Relative** time (e.g., "3 hours ago")
4. **ISO timestamp** (raw `toISOString()`)

Each tooltip row is click-to-copy.

## Rules

- Never render server-local time for user-facing dates.
- Convert timestamps at the UI layer using the user's stored timezone.
- Default to UTC when no user preference is available.
- Store all timestamps in UTC; display in the user's timezone.
