# Environment Variables

Environment variables are validated at runtime using ArkEnv (ArkType).
The schema lives in `src/env.ts` and reads from both `process.env` and
`import.meta.env`.

Deployment assumptions for env values are documented in
`docs/adr/0006-deployment-coolify-cloudflare-tunnel.md`.

## Validation

```ts
import arkenv from 'arkenv';

export const env = arkenv(
  {
    BETTER_AUTH_URL: 'string.url',
    DATABASE_URL: 'string > 0',
    BETTER_AUTH_SECRET: 'string >= 32',
    EMAIL_FROM: 'string.email',
    'EMAIL_FROM_NAME?': 'string > 0',
    PASSWORD_MIN_LENGTH: '6 <= number.integer <= 128',
    VITE_APP_TITLE: 'string > 0?',
  },
  {
    env: {
      ...process.env,
      ...import.meta.env,
    },
    coerce: true,
    onUndeclaredKey: 'delete',
  },
);
```

## Notes

- Use `?` in keys to mark optional variables.
- Keep validation in `src/env.ts` to ensure both server and client env
  are checked consistently.
- Use `pnpm with:env <command>` to load `.env` during scripts.
- We do not encrypt `.env` files; production secrets are managed in Coolify.
