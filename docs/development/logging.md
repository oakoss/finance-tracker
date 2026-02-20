# Logging

Logging uses [evlog](https://evlog.dev) with a wide-event model — one structured log per request, accumulated throughout the request lifecycle and emitted at the end. Logs are sent to [SigNoz](https://signoz.io) via OTLP.

See `docs/adr/0020-logging-evlog-signoz.md` for the architectural decision.

## Files

| File                               | Purpose                                                                       |
| ---------------------------------- | ----------------------------------------------------------------------------- |
| `src/lib/logging/evlog.ts`         | Main entry point — re-exports `log`, `useLogger`, `createError`, `parseError` |
| `src/lib/logging/drain.ts`         | Nitro plugin — OTLP drain, enrichers, sanitization, pipeline                  |
| `src/lib/logging/hash.ts`          | HMAC-SHA256 ID hashing for audit logs                                         |
| `src/lib/logging/client-logger.ts` | Client-side logger with env-based enable/level control                        |
| `vite.config.ts` (`nitro.modules`) | evlog Nitro v3 module registration, sampling, route exclusions                |

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

export const createTransaction = createServerFn().handler(async ({ data }) => {
  try {
    const result = await db.insert(transactions).values(data);
    log.info({
      action: 'txn.create',
      user: { idHash: hashId(userId) },
      outcome: { id: result.id },
    });
    return result;
  } catch (error) {
    throw createError({
      message: 'Failed to create transaction.',
      status: 500,
      why: error instanceof Error ? error.message : String(error),
      fix: 'Check the database connection and try again.',
      cause: error instanceof Error ? error : new Error(String(error)),
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
for incremental context accumulation throughout the request:

```ts
import { useLogger } from '@/lib/logging/evlog';

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
| `outcome.errorId`    | `string` | from `error-ids.ts` if applicable              |
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

Client logging is disabled in production by default. Enable with env vars:

```bash
VITE_CLIENT_LOGGING_ENABLED=true
VITE_CLIENT_LOG_LEVEL=warn   # debug | info | warn | error
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
| `OTEL_EXPORTER_OTLP_ENDPOINT` | prod     | SigNoz OTLP HTTP collector URL                                                                                       |
| `OTEL_SERVICE_NAME`           | prod     | Service name in SigNoz (e.g. `finance-tracker`)                                                                      |
| `OTEL_RESOURCE_ATTRIBUTES`    | prod     | e.g. `deployment.environment=production`                                                                             |
| `LOG_HASH_SECRET`             | both     | Min 32-char secret for HMAC ID hashing. Use separate values per environment. Generate with `openssl rand -base64 32` |
| `VITE_CLIENT_LOGGING_ENABLED` | optional | Enable client logging in production                                                                                  |
| `VITE_CLIENT_LOG_LEVEL`       | optional | Min client log level (default: `warn`)                                                                               |

If `OTEL_EXPORTER_OTLP_ENDPOINT` is unset, logs go to stdout only (pretty in dev, JSON in prod).

## Drain pipeline

The OTLP drain uses a pipeline for production reliability:

- Batches up to 50 events, flushed every 5 seconds.
- Retries up to 3 times with exponential backoff (1s → 30s max).
- Buffers up to 1000 events; oldest dropped on overflow.
- Flushes remaining buffer on server shutdown.

## SigNoz

SigNoz is deployed on Coolify. The OTLP HTTP collector endpoint is:

```text
https://otelcollectorhttp-finance-tracker.jacebabin.com
```

- Logs retention: 30 days.
- Filter by `deployment.environment` to separate dev and production.
- Filter by `service.name=finance-tracker` to isolate this app.
- Dev logs: stdout only by default (omit `OTEL_EXPORTER_OTLP_ENDPOINT` locally).
- Production logs: sent to SigNoz via OTLP.

Required Coolify env vars for production:

```bash
OTEL_EXPORTER_OTLP_ENDPOINT=https://otelcollectorhttp-finance-tracker.jacebabin.com
OTEL_SERVICE_NAME=finance-tracker
OTEL_RESOURCE_ATTRIBUTES=deployment.environment=production
LOG_HASH_SECRET=<generate with: openssl rand -base64 32>
```

Alerts to configure in SigNoz (once traffic is flowing):

- Error rate spike (5xx / error logs).
- Latency spike (duration > threshold).
