/**
 * evlog integration for TanStack Start (Nitro v3).
 *
 * TanStack Start compiles server functions into Nitro handlers internally
 * and never exposes the raw H3 HTTPEvent to userland. The evlog Nitro module
 * hooks in at the Nitro level before TanStack's abstraction, so wide event
 * creation and emission are handled automatically per request.
 *
 * Configuration (vite.config.ts nitro.modules):
 * - Service name, environment, sampling, and route exclusions.
 *
 * OTLP drain + enrichers (src/lib/logging/drain.ts):
 * - Forwards wide events to SigNoz via evlog:drain Nitro hook.
 * - Enriches with user agent, request size, and trace context.
 * - Sanitizes sensitive fields before sending.
 *
 * Usage in server functions:
 * - TanStack Start server functions do NOT have access to the raw H3 event,
 *   so `useLogger(event)` cannot be used inside `createServerFn` handlers.
 * - `log.set()` does NOT exist on the standalone `log` object.
 * - Use `log.info()`, `log.warn()`, `log.error()`, `log.debug()` with a full
 *   context object in one call. The Nitro module accumulates these into the
 *   request-scoped wide event automatically.
 *
 * @example
 * import { createError, log } from '@/lib/logging/evlog'
 * import { hashId } from '@/lib/logging/hash'
 *
 * export const createTransaction = createServerFn().handler(async ({ data }) => {
 *   try {
 *     const result = await db.insert(transactions).values(data)
 *     log.info({ action: 'txn.create', user: { idHash: hashId(userId) }, outcome: { id: result.id } })
 *     return result
 *   } catch (error) {
 *     throw createError({ message: 'Failed to create transaction.', status: 500, why: error.message })
 *   }
 * })
 *
 * Usage in Nitro server routes (if any are added directly):
 * - `useLogger(event)` works and gives request-scoped `log.set()` accumulation.
 */
export { createError, createRequestLogger, log, parseError } from 'evlog';
export { useLogger } from 'evlog/nitro/v3';
