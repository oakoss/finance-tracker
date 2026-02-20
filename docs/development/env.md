# Environment Variables

Environment variables are validated at runtime using
[ArkEnv](https://github.com/yamcodes/arkenv) (ArkType). The schema and
validation live in `src/configs/env.ts`.

## How env loading works

Env files are loaded automatically using
[dotenvx](https://dotenvx.com) with the `flow` convention, which loads
files based on `NODE_ENV` in this order:

1. `.env.{NODE_ENV}.local`
2. `.env.{NODE_ENV}`
3. `.env.local`
4. `.env`

Each config file loads env independently:

| Config file         | Loads env via                            |
| ------------------- | ---------------------------------------- |
| `vite.config.ts`    | `dotenvx config({ convention: 'flow' })` |
| `vitest.config.ts`  | `dotenvx config({ convention: 'flow' })` |
| `drizzle.config.ts` | `dotenvx config({ convention: 'flow' })` |

Scripts that don't go through a config file still use `pnpm with:env`:

- `pnpm start`
- `pnpm schema:auth:generate`

## Validation

The `env` export in `src/configs/env.ts` is a lazy proxy (similar to
t3-env). Validation runs on first property access, not at import time.
This allows `.env` files to be loaded before validation triggers.

```ts
import { env } from '@/configs/env';

// Validation happens here, on first access
const url = env.BETTER_AUTH_URL;
```

Set `SKIP_ENV_VALIDATION=true` to bypass validation (useful for CI
builds or Coolify/Nixpacks where runtime secrets aren't available at
build time).

## Client-side typing

`VITE_*` variables are exposed to the browser via the
`@arkenv/vite-plugin` in `vite.config.ts`. TypeScript types for
`import.meta.env` are augmented in `src/vite-env.d.ts`.

## Local development

Local env is managed via
[1Password Environments](https://developer.1password.com/docs/environments),
which mounts a virtual `.env` file at the project root. No plaintext
secrets on disk.

Alternatively, copy `.env.example` to `.env` for a working set of dummy
values.

## CI

CI copies `.env.example` to `.env` before running tests:

```yaml
- run: cp .env.example .env
- run: pnpm test
```

`.env.example` contains valid dummy values that pass ArkEnv validation.

## Production (Coolify)

Set env vars directly in the Coolify UI. The lazy proxy in
`src/configs/env.ts` validates at server startup. No `.env` files are
used in production.

## Adding a new variable

1. Add the key + ArkType constraint to the `Env` schema in
   `src/configs/env.ts`.
2. Add a dummy value to `.env.example`.
3. Add the real value to 1Password Environments (local) and Coolify
   (production).
4. If it's a `VITE_*` variable, it will be typed automatically via the
   Vite plugin.

## Future: encrypted env files

When E2E tests require real secrets in CI, consider using
`dotenvx encrypt` to commit encrypted `.env.ci` files to the repo. Only
one GitHub secret (`DOTENV_PRIVATE_KEY_CI`) would be needed to decrypt
at runtime. See [dotenvx encryption docs](https://dotenvx.com/docs/encryption).

## Notes

- Email configuration and templates: `docs/development/emails.md`.
- Logging env vars: `docs/development/logging.md`.
- Deployment assumptions: `docs/adr/0006-deployment-coolify-cloudflare-tunnel.md`.
