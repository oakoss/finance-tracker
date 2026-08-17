# Environment Variables

Environment variables are managed by
[varlock](https://varlock.dev). The schema, defaults, validation,
and documentation live in `.env.schema`.

## How env loading works

Varlock loads env files in this order (increasing precedence):

1. `.env.schema` — schema + defaults (committed)
2. `.env` — general overrides
3. `.env.local` — personal overrides (gitignored)
4. `.env.[APP_ENV]` — environment-specific
5. `.env.[APP_ENV].local` — environment-specific local (gitignored)
6. `process.env` — always wins

The Vite plugin (`@varlock/vite-integration`) handles loading during
`pnpm dev` and `pnpm build`. Outside Vite (tests, scripts, drizzle-kit),
use `import 'varlock/auto-load'` or the `pnpm with:env` wrapper
(`varlock run --`).

## Accessing env vars

Use the `ENV` import everywhere — server and client:

```ts
import { ENV } from 'varlock/env';

const level = ENV.CLIENT_LOG_LEVEL;
const key = ENV.POSTHOG_KEY;
```

No `VITE_` prefix needed. The `@sensitive` / `@public` decorators in
`.env.schema` control both what reaches the client and what gets
inlined at build time.

## Sensitivity

- `@defaultSensitive=true` — all vars are sensitive (server-only)
  unless explicitly marked `@public`.
- `@public` vars are replaced at build time in every bundle, server
  included. A runtime override of a `@public` var is ignored unless the
  var is also `@dynamic`.
- `@public @dynamic` vars are server-read-only. They resolve at
  runtime, but the server emits no client hydration payload, so a
  client-side read throws — and neither typecheck nor lint catches it.
- `@sensitive` vars are never bundled — only available server-side
  via `process.env`.
- `@preventLeaks` (production only via `forEnv(production)`) scans
  HTTP responses for sensitive values and throws if found.
- `@redactLogs` (production only via `forEnv(production)`) masks
  sensitive values in console output as `▒▒▒▒▒`.

## Environment-aware validation

`@currentEnv=$APP_ENV` enables `forEnv()` conditionals:

```bash
# @sensitive @required=forEnv(production)
BREVO_API_KEY=

# @public @dynamic @optional @type=string
SMTP_HOST=if(forEnv(development, test), localhost)
```

`APP_ENV` falls back to `NODE_ENV` via
`fallback($NODE_ENV, development)`.

## Type generation

Types are auto-generated to `src/env.d.ts` whenever varlock runs
(dev server, build, `varlock run`, `varlock load`). The file is
gitignored.

## Secrets management

Never commit real secrets. No encrypted `.env` files are checked in.

### Local development

Use `.env.local` (gitignored) for personal overrides on top of schema
defaults. Alternatively, use
[1Password Environments](https://developer.1password.com/docs/environments)
to mount a virtual `.env` file.

### Testing

`.env.test` (committed) overrides `DATABASE_URL` to point at
`finance_tracker_test`. It loads automatically when `APP_ENV=test`:

- Integration tests: script sets `APP_ENV=test`
- E2E: Playwright config sets `APP_ENV=test` on build + start
- CI: `APP_ENV=test` at the workflow level

Use `pnpm db:migrate:test` to migrate the test database locally.

### CI

`APP_ENV=test` is set at the workflow level. `.env.schema` defaults
plus `.env.test` overrides provide all values. The `ci-prepare`
action generates varlock types and compiles Paraglide.

### Production (Coolify)

Set env vars in the Coolify UI. `forEnv(production)` requirements
activate off `APP_ENV`, which resolves to `production` at runtime from
the Dockerfile's `NODE_ENV=production`.

The build stage is not production: it runs `APP_ENV=test`. Vars scoped
Buildtime in Coolify still inline their real values, but anything else
resolves its test branch — schema defaults and `forEnv()` conditionals
alike. `ENV.APP_ENV` reads fold to `test` in the shipped bundle, and no
runtime value can change them.

Scope each variable to match its decorators — the two mismatches fail
in opposite ways:

- `@public` without `@dynamic` is inlined at build time, so it must be
  marked **Buildtime**. Runtime alone is ignored silently: the bundle
  keeps whatever the `APP_ENV=test` build resolved.
- `@public @dynamic` is never inlined, so it must be marked
  **Runtime**. Buildtime alone leaves it missing at runtime, and a
  required one such as `BETTER_AUTH_URL` makes `varlock run` exit
  before the server starts.

`TRUSTED_ORIGINS` defaults to `BETTER_AUTH_URL`, so a single-origin
deploy needs only the latter. Set it explicitly to allow more.

## Adding a new variable

1. Add the key + decorators to `.env.schema`.
2. Add the real value to 1Password / `.env.local` (local) and Coolify
   (production), scoping it Buildtime or Runtime to match its
   decorators — see Production (Coolify) above.
3. Types regenerate automatically on next dev/build.

## Docker Compose variables

These variables are used by `docker-compose.yml` with inline defaults.
Override via `.env` or `docker compose --env-file .env.local up`.

All are compose-only except `POSTGRES_PORT`, which is declared in
`.env.schema` with `@auditIgnore` since compose reads it directly and
`varlock audit` never sees the usage:

| Variable            | Default                    |
| ------------------- | -------------------------- |
| `POSTGRES_USER`     | `finance_tracker`          |
| `POSTGRES_PASSWORD` | `finance_tracker_password` |
| `POSTGRES_DB`       | `finance_tracker_dev`      |
| `POSTGRES_PORT`     | `5432`                     |
| `POSTGRES_DATA_DIR` | `/var/lib/postgresql/data` |
| `MAILPIT_SMTP_PORT` | `1025`                     |
| `MAILPIT_UI_PORT`   | `8025`                     |

## Notes

- Email configuration and templates: `docs/development/emails.md`.
- Logging env vars: `docs/development/logging.md`.
- Deployment assumptions:
  `docs/adr/0006-deployment-coolify-cloudflare-tunnel.md`.
