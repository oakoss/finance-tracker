# Logging

Logging uses [evlog](https://evlog.dev) with a wide-event model: one structured log per request, accumulated throughout the request lifecycle and emitted at the end. Logs are sent to [PostHog](https://posthog.com) via OTLP.

See `docs/adr/0020-logging-evlog-signoz.md` for the architectural decision.

## Files

| File                               | Purpose                                                         |
| ---------------------------------- | --------------------------------------------------------------- |
| `src/lib/logging/evlog.ts`         | Main entry point: re-exports `log`, `createError`, `parseError` |
| `src/lib/logging/drain.ts`         | Nitro plugin — OTLP drain, enrichers, sanitization, pipeline    |
| `src/lib/logging/hash.ts`          | HMAC-SHA256 ID hashing for audit logs                           |
| `src/lib/logging/sanitize.ts`      | Allowlist-based field sanitizer for PII removal before drain    |
| `src/lib/logging/client-logger.ts` | Client-side logger with env-based enable/level control          |
| `vite.config.ts` (`nitro.modules`) | evlog Nitro v3 module registration, sampling, route exclusions  |

## How it works

evlog is registered as a Nitro v3 module in `vite.config.ts`. It hooks into Nitro's `request`, `response`, and `error` lifecycle automatically — no manual wiring needed in server functions.

TanStack Start compiles server functions into Nitro handlers internally and never exposes the raw H3 event to userland. The evlog Nitro module intercepts at the Nitro level, so the wide event is created and emitted automatically per request.

## Server logging

### In server functions

TanStack Start server functions do not expose the raw H3 event, so `useLogger(event)`
and `log.set()` are **not available** inside `createServerFn` handlers.

Use `log.info()`, `log.warn()`, `log.error()`, or `log.debug()` with a full
context object in one call. The evlog Nitro module accumulates these into the
request-scoped wide event automatically:

```ts
import { createError, log } from '@/lib/logging/evlog';
import { hashId } from '@/lib/logging/hash';
import { isExpectedError, toError } from '@/lib/form/validation';

export const createTransaction = createServerFn()
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const userId = requireUserId(context);

    try {
      const result = await db.insert(transactions).values(data);
      log.info({
        action: 'txn.create',
        outcome: { idHash: hashId(result.id) },
        user: { idHash: hashId(userId) },
      });
      return result;
    } catch (error) {
      if (isExpectedError(error)) throw error;
      log.error({
        action: 'txn.create',
        error: toError(error).message,
        outcome: { success: false },
        user: { idHash: hashId(userId) },
      });
      throw createError({
        cause: toError(error),
        fix: 'Try again. If the problem persists, contact support.',
        message: 'Failed to create transaction.',
        status: 500,
      });
    }
  });
```

The wide event is emitted automatically at request end — never call `log.emit()` manually.

### Structured errors

Use `createError` for errors with actionable context:

```ts
import { createError } from '@/lib/logging/evlog';

throw createError({
  message: 'Transaction not found',
  status: 404,
  why: `No transaction with ID "${id}" exists`,
  fix: 'Check the transaction ID and try again',
});
```

### In Nitro routes (if added directly)

`useLogger(event)` is available in raw Nitro route handlers and supports `log.set()`
for incremental context accumulation throughout the request. Import directly from `evlog/nitro/v3` (not re-exported from `@/lib/logging/evlog`):

```ts
import { useLogger } from 'evlog/nitro/v3';

export default defineHandler(async (event) => {
  const log = useLogger(event);
  log.set({ action: 'export.pdf' });
  // ...more log.set() calls as the handler progresses
});
```

## Wide event schema

All server events should include these fields where available:

| Field                | Type     | Notes                                          |
| -------------------- | -------- | ---------------------------------------------- |
| `action`             | `string` | e.g. `auth.login`, `txn.create`                |
| `user.idHash`        | `string` | HMAC-SHA256 hash via `hashId()` — never raw ID |
| `user.role`          | `string` | optional                                       |
| `outcome.status`     | `number` | HTTP status — set automatically                |
| `outcome.durationMs` | `number` | set automatically                              |
| `outcome.serviceMs`  | `number` | service-call latency via `performance.now()`   |
| `outcome.errorId`    | `string` | structured error identifier, if applicable     |
| `audit.entity`       | `string` | auditable entity name e.g. `transaction`       |
| `audit.entityIdHash` | `string` | hashed entity ID                               |
| `audit.operation`    | `string` | `create`, `update`, `delete`                   |

## Audit events

Audit logging is required for these actions (per ADR 0015 and ADR 0020):

**Auth**

- `auth.signup`, `auth.login`, `auth.logout`
- `auth.password.reset`, `auth.email.verify`

**Finance**

- `account.create`, `account.update`, `account.delete`
- `category.create`, `category.update`, `category.delete`
- `txn.create`, `txn.update`, `txn.delete`
- `transfer.create`, `transfer.update`, `transfer.delete`
- `payee.create`, `payee.update`, `payee.delete`
- `tag.create`, `tag.update`, `tag.delete`
- `import.create`, `import.complete`, `import.fail`
- `finance.upload` (metadata only — no file content or sensitive names)
- `statement.upload`, `attachment.upload`, `attachment.delete`

Audit events must never be sampled — they are always kept regardless of sampling config.

## Security rules

- **Allowlist only** — log explicit fields; never spread full objects.
- **Never log**: passwords, tokens, cookies, secrets, session IDs, raw request bodies.
- **Mask emails**: only log partial form e.g. `j***@example.com`.
- **Hash IDs**: always use `hashId()` from `@/lib/logging/hash` for user and entity IDs.
- **Uploads**: log only metadata (size, MIME type) — never file content or raw filenames.

## Hashing IDs

```ts
import { hashId } from '@/lib/logging/hash';

log.set({ user: { idHash: hashId(session.userId) } });
log.set({
  audit: {
    entityIdHash: hashId(transaction.id),
    entity: 'transaction',
    operation: 'create',
  },
});
```

`hashId` uses HMAC-SHA256 with `LOG_HASH_SECRET`. Use separate secrets per environment.

## Client logging

Client logging is controlled by `CLIENT_LOG_LEVEL` (default: `warn`).
All levels always delegate to evlog; sampling rates determine which emit.

```bash
CLIENT_LOG_LEVEL=warn   # debug | info | warn | error
```

```ts
import { clientLog } from '@/lib/logging/client-logger';

clientLog.warn({ action: 'form.submit', message: 'cart empty' });
clientLog.error({ action: 'auth', error: 'token_expired' });
```

Rules for client logs:

- No PII — no emails, names, or user IDs.
- Only log UX state and feature flags.
- Never log form values.

## Log levels and sampling

| Level   | Production                             | Development |
| ------- | -------------------------------------- | ----------- |
| `error` | always kept                            | always kept |
| `warn`  | always kept                            | always kept |
| `info`  | 10% sampled (audit events always kept) | always kept |
| `debug` | dropped                                | always kept |

Requests with status ≥ 400 or duration > 3000ms are always kept regardless of sampling.

## Environment variables

| Variable                      | Required | Description                                                                                                          |
| ----------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------- |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | prod     | PostHog OTLP log ingestion URL                                                                                       |
| `OTEL_SERVICE_NAME`           | prod     | Service name in PostHog (e.g. `finance-tracker`)                                                                     |
| `OTEL_RESOURCE_ATTRIBUTES`    | prod     | e.g. `deployment.environment=production`                                                                             |
| `LOG_HASH_SECRET`             | both     | Min 32-char secret for HMAC ID hashing. Use separate values per environment. Generate with `openssl rand -base64 32` |
| `CLIENT_LOG_LEVEL`            | optional | Min client log level (default: `warn`)                                                                               |

If `OTEL_EXPORTER_OTLP_ENDPOINT` is unset, logs go to stdout only (pretty in dev, JSON in prod).

## Drain pipeline

The OTLP drain uses a pipeline for production reliability:

- Batches up to 50 events, flushed every 5 seconds.
- Retries up to 3 times with exponential backoff (1s → 30s max).
- Buffers up to 1000 events; oldest dropped on overflow.
- Flushes remaining buffer on server shutdown.

## PostHog

Logs are sent to PostHog's OTLP log ingestion endpoint with Bearer auth.

```text
https://us.i.posthog.com/i
```

- Filter by `deployment.environment` to separate dev and production.
- Filter by `service.name=finance-tracker` to isolate this app.
- Dev logs: stdout only by default (omit `OTEL_EXPORTER_OTLP_ENDPOINT` locally).
- Production logs: sent to PostHog via OTLP.

Required production env vars:

```bash
OTEL_EXPORTER_OTLP_ENDPOINT=https://us.i.posthog.com/i
OTEL_SERVICE_NAME=finance-tracker
OTEL_RESOURCE_ATTRIBUTES=deployment.environment=production
POSTHOG_KEY=phc_xxx
LOG_HASH_SECRET=<generate with: openssl rand -base64 32>
```

## Error tracking

PostHog handles all error tracking — no Sentry needed.

### Client-side

- **Unhandled errors and rejections**: autocaptured via `capture_exceptions` config
  in `src/lib/analytics.tsx`. Console errors are not captured (too noisy).
- **React render crashes**: the root error boundary (`src/components/errors/root-error-boundary.tsx`)
  reports to PostHog via `posthog.captureException()`. Reports once per error (ref-guarded).
- **Source maps**: `@posthog/rollup-plugin` uploads source maps during the Coolify
  Docker build so stack traces in PostHog match the shipped release. Maps use
  `sourcemap: 'hidden'` (no `sourceMappingURL` in output) and `vite.config.ts`
  sets `deleteAfterUpload: true` so they're removed from `.output` after the
  upload. The Dockerfile mounts PostHog credentials as BuildKit secrets
  (`--mount=type=secret`), so they reach only the `pnpm build` process and
  never land in any image layer, layer metadata, or build cache. Configure
  both secrets in Coolify's build-secrets UI with ids
  `posthog_personal_api_key` and `posthog_project_id`. Both mounts are
  `required=false`, so a local
  `docker build` without the secrets still succeeds and `vite.config.ts`
  skips the plugin via its env-gate. The Playwright build steps in
  `.github/workflows/ci.yml` intentionally skip the upload, so Coolify stays
  the single source of truth. Upload failures are non-fatal:
  `nonFatalWriteBundle` in `vite.config.ts` catches `writeBundle` errors,
  deletes the orphaned `.map` files so they never ship, and lets the deploy
  continue. Set `STRICT_SOURCEMAPS=1` for a one-off build to disable the
  wrapper and see the underlying CLI error (useful during Coolify setup to
  distinguish auth failures from outages).

### Server-side

- **Exception autocapture**: `enableExceptionAutocapture: true` on the posthog-node client
  (`src/lib/analytics-server.ts`). Captures unhandled server exceptions automatically.

## Custom analytics events

Use the `useAnalytics()` hook from `@/hooks/use-analytics` to capture
custom events. The hook wraps PostHog's `capture` in a try-catch so
analytics errors never propagate to the UI.

```ts
const { capture } = useAnalytics();
capture('account_created', { currency: 'USD', type: 'checking' });
```

### Conventions

- **Event names**: `snake_case`, `noun_verbed` (e.g., `account_created`,
  `budget_line_deleted`, `user_signed_in`).
- **Properties**: non-PII metadata only. Never include raw IDs, names,
  emails, or amounts. Use booleans (`has_category: true`) or enums
  (`type: 'checking'`, `direction: 'debit'`).
- **Placement**: capture in mutation `onSuccess` callbacks, not in
  server functions (events are client-side).

### Instrumented events

| Module       | Events                                                                                                                 |
| ------------ | ---------------------------------------------------------------------------------------------------------------------- |
| Accounts     | `account_created`, `account_updated`, `account_deleted`                                                                |
| Transactions | `transaction_created`, `transaction_updated`, `transaction_deleted`                                                    |
| Imports      | `import_created`, `import_deleted`                                                                                     |
| Budgets      | `budget_period_created`, `budget_period_deleted`, `budget_period_copied`, `budget_line_created`, `budget_line_deleted` |
| Categories   | `category_created`, `category_updated`, `category_deleted`                                                             |
| Auth         | `user_signed_up`, `user_signed_in`, `user_signed_out`, `user_social_auth_started`                                      |
