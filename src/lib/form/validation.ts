import { type } from 'arktype';
import { EvlogError } from 'evlog';

import { createError, log } from '@/lib/logging/evlog';

export function arkValidator<T>(schema: (data: T) => T | type.errors) {
  return (data: T) => {
    const result = schema(data);
    if (result instanceof type.errors) {
      throw createError({
        fix: 'Check the highlighted fields and correct any errors.',
        message: 'Validation failed.',
        status: 422,
        why: result.summary,
      });
    }
    return result;
  };
}

export async function ensureFound<T>(
  query: Promise<T | undefined>,
  entityName: string,
): Promise<T> {
  const result = await query;
  if (!result) {
    log.warn({
      action: `${entityName.toLowerCase()}.notFound`,
      outcome: { success: false },
    });
    throw createError({
      fix: 'Refresh the page. This item may have been deleted.',
      message: `${entityName} not found.`,
      status: 404,
    });
  }
  return result;
}

export function isExpectedError(error: unknown): boolean {
  return error instanceof EvlogError && error.status < 500;
}

export function toError(value: unknown): Error {
  return value instanceof Error ? value : new Error(String(value));
}
