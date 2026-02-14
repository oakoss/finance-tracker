# Secrets

Manage secrets via environment variables.
See `docs/development/env.md` for validation details.

## Local development

- Copy `.env.example` to `.env.local`.
- Never commit real secrets.
- Use `pnpm with:env <command>` when a script needs env vars.

## Production

- Configure secrets in Coolify for the deployed app.
- Keep `BETTER_AUTH_SECRET` unique per environment.
- We do not commit encrypted `.env` files.
