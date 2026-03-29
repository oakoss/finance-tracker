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

const url = ENV.BETTER_AUTH_URL;
const key = ENV.POSTHOG_KEY;
```

No `VITE_` prefix needed. The `@sensitive` / `@public` decorators in
`.env.schema` control what gets bundled into the client.

## Sensitivity

- `@defaultSensitive=true` — all vars are sensitive (server-only)
  unless explicitly marked `@public`.
- `@public` vars are replaced at build time in client code.
- `@sensitive` vars are never bundled — only available server-side
  via `process.env`.
- `@preventLeaks` (enabled by default) scans HTTP responses for
  sensitive values and throws if found.
- `@redactLogs` (enabled by default) masks sensitive values in
  console output as `▒▒▒▒▒`.

## Environment-aware validation

`@currentEnv=$APP_ENV` enables `forEnv()` conditionals:

```bash
# @sensitive @required=forEnv(production)
BREVO_API_KEY=

# @sensitive @required=forEnv(development, test)
SMTP_HOST=localhost
```

`APP_ENV` falls back to `NODE_ENV` via
`fallback($NODE_ENV, development)`, so it works automatically in
dev, CI, and production without explicit configuration.

## Type generation

Types are auto-generated to `src/env.d.ts` whenever varlock runs
(dev server, build, `varlock run`, `varlock load`). The file is
gitignored — it regenerates on demand.

The `@generateTypes(lang=ts, path=src/env.d.ts, auto=true)` root
decorator controls this.

## Secrets management

Never commit real secrets. No encrypted `.env` files are checked in.

### Local development

Use `.env.local` (gitignored) for personal overrides on top of schema
defaults. Alternatively, use
[1Password Environments](https://developer.1password.com/docs/environments)
to mount a virtual `.env` file.

### CI

`.env.schema` defaults provide valid dummy values for CI. The
`ci-prepare` action compiles Paraglide — no `.env` file copy needed.

### Production (Coolify)

Set env vars in the Coolify UI. `process.env` takes highest
precedence, so Coolify's values override schema defaults. Set
`APP_ENV=production` to activate `forEnv(production)` requirements.

## Adding a new variable

1. Add the key + decorators to `.env.schema`.
2. Add the real value to 1Password / `.env.local` (local) and Coolify
   (production).
3. Types regenerate automatically on next dev/build.

## Docker Compose variables

These variables in `.env.schema` configure the local Postgres and
Mailpit containers (`pnpm docker:up`). They are only used by
`docker-compose.yml`:

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
