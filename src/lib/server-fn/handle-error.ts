import {
  pgErrorFields,
  throwIfConstraintViolation,
  throwIfQueryCanceled,
} from '@/lib/db/pg-error';
import { isExpectedError, toError } from '@/lib/form/validation';
import { createError, log } from '@/lib/logging/evlog';
import { hashId } from '@/lib/logging/hash';

type HandleErrorOpts = {
  action: string;
  fix: string;
  message: string;
  userId: string;
};

/**
 * Shared catch-block handler for server functions. Handles expected
 * errors, constraint violations, structured logging, and generic 500s.
 *
 * @throws Always throws — either the original expected error, a
 * mapped constraint violation, or a generic 500.
 */
export function handleServerFnError(
  error: unknown,
  opts: HandleErrorOpts,
): never {
  if (isExpectedError(error)) throw error;
  throwIfQueryCanceled(error, opts.action, hashId(opts.userId));
  throwIfConstraintViolation(error, opts.action, hashId(opts.userId));
  log.error({
    action: opts.action,
    error: toError(error).message,
    outcome: { success: false },
    user: { idHash: hashId(opts.userId) },
    ...pgErrorFields(error),
  });
  throw createError({
    cause: toError(error),
    fix: opts.fix,
    message: opts.message,
    status: 500,
  });
}
