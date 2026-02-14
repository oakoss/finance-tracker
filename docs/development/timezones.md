# Timezones

Timezone handling for server and client rendering.

## Recommended approach

- Store the user's preferred timezone in their profile.
- Default to the browser timezone on first login.
- Use the stored timezone for server-side rendering and reports.

## Notes

- Avoid rendering server times in the server timezone for user-facing dates.
- Convert timestamps at the edge (or in UI) using the stored timezone.
- Store timestamps in UTC using `timestamptz` (see `docs/development/database.md`).
