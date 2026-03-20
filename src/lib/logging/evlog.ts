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
 * - Forwards wide events to PostHog via evlog:drain Nitro hook.
 * - Enriches with user agent, request size, and trace context.
 * - Sanitizes sensitive fields before sending.
 *
 * Usage in server functions:
 * - TanStack Start server functions do NOT have access to the raw H3 event.
 * - `log.set()` does NOT exist on the standalone `log` object.
 * - Use `log.info()`, `log.warn()`, `log.error()`, `log.debug()` with a full
 *   context object in one call. The Nitro module accumulates these into the
 *   request-scoped wide event automatically.
 *
 * @example
 * // Server function
 * import { createError, log } from '@/lib/logging/evlog'
 * import { hashId } from '@/lib/logging/hash'
 * import { isExpectedError, toError } from '@/lib/form/validation'
 *
 * export const createTransaction = createServerFn()
 *   .middleware([authMiddleware])
 *   .handler(async ({ context, data }) => {
 *     const userId = requireUserId(context)
 *     try {
 *       const result = await db.insert(transactions).values(data)
 *       log.info({ action: 'txn.create', outcome: { idHash: hashId(result.id) }, user: { idHash: hashId(userId) } })
 *       return result
 *     } catch (error) {
 *       if (isExpectedError(error)) throw error
 *       log.error({ action: 'txn.create', error: toError(error).message, user: { idHash: hashId(userId) } })
 *       throw createError({ cause: toError(error), fix: 'Try again.', message: 'Failed.', status: 500 })
 *     }
 *   })
 *
 * @example
 * // Client hook
 * import { parseError } from '@/lib/logging/evlog'
 *
 * const parsed = parseError(error)
 * toast.error('Failed', { description: parsed.fix ?? parsed.why })
 */
export { createError, log, parseError } from 'evlog';
