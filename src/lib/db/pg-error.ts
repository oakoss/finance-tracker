import { createError, log } from '@/lib/logging/evlog';
import { accountsConstraintMessages } from '@/modules/accounts/db/schema';
import { budgetsConstraintMessages } from '@/modules/budgets/db/schema';
import { categoriesConstraintMessages } from '@/modules/categories/db/schema';
import { payeesConstraintMessages } from '@/modules/payees/db/schema';
import { transactionsConstraintMessages } from '@/modules/transactions/db/schema';

// ---------------------------------------------------------------------------
// PG error codes
// ---------------------------------------------------------------------------

export const PG_ERROR_CODES = {
  FOREIGN_KEY_VIOLATION: '23503',
  UNIQUE_VIOLATION: '23505',
} as const;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PgErrorCode = (typeof PG_ERROR_CODES)[keyof typeof PG_ERROR_CODES];

type PgErrorInfo = {
  code: PgErrorCode;
  constraint: string | undefined;
  table: string | undefined;
};

type PgErrorLike = { code: string; constraint?: string; table?: string };

type PgLogFields = {
  pgCode?: string | undefined;
  pgConstraint?: string | undefined;
  pgTable?: string | undefined;
};

// ---------------------------------------------------------------------------
// Constraint → user-facing message map
//
// Each module owns the copy for its own violations and uses computed
// keys derived from its `*IndexNames` constants, so typos fail at
// compile time in the module. This aggregator composes them.
// ---------------------------------------------------------------------------

const CONSTRAINT_MESSAGES: Record<string, string> = {
  ...accountsConstraintMessages,
  ...budgetsConstraintMessages,
  ...categoriesConstraintMessages,
  ...payeesConstraintMessages,
  ...transactionsConstraintMessages,
};

const CONSTRAINT_CODES = new Set<string>(Object.values(PG_ERROR_CODES));

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function asPgError(value: unknown): PgErrorLike | null {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('code' in value) ||
    typeof (value as { code: unknown }).code !== 'string'
  ) {
    return null;
  }
  return value as PgErrorLike;
}

function unwrap(error: unknown): PgErrorLike | null {
  return (
    asPgError(error) ?? (error instanceof Error ? asPgError(error.cause) : null)
  );
}

// ---------------------------------------------------------------------------
// Parsing (constraint violations only)
// ---------------------------------------------------------------------------

/** Extract PG constraint error fields if `error` is a node-postgres
 *  DatabaseError with code 23505 or 23503. Also unwraps Drizzle's
 *  `DrizzleQueryError` wrapper (checks `error.cause`). */
export function parsePgError(error: unknown): PgErrorInfo | null {
  const pg = unwrap(error);
  if (!pg || !CONSTRAINT_CODES.has(pg.code)) return null;
  return {
    code: pg.code as PgErrorCode,
    constraint: pg.constraint,
    table: pg.table,
  };
}

// ---------------------------------------------------------------------------
// Throwing
// ---------------------------------------------------------------------------

/**
 * If `error` is a known PG constraint violation, log a warning and throw
 * a user-facing error. Otherwise no-op. Place before `log.error()` so
 * constraint violations don't get logged as 500s.
 */
export function throwIfConstraintViolation(
  error: unknown,
  action: string,
  userIdHash?: string,
): void {
  const pg = parsePgError(error);
  if (!pg) return;

  const causeOpt = error instanceof Error ? { cause: error } : {};
  const userOpt = userIdHash ? { user: { idHash: userIdHash } } : {};

  // Unique violation (23505)
  if (pg.code === PG_ERROR_CODES.UNIQUE_VIOLATION) {
    const fix =
      (pg.constraint && CONSTRAINT_MESSAGES[pg.constraint]) ??
      'A record with these values already exists.';
    log.warn({
      action,
      outcome: { success: false },
      pgConstraint: pg.constraint,
      pgTable: pg.table,
      ...userOpt,
    });
    throw createError({
      ...causeOpt,
      fix,
      message: 'Duplicate record.',
      status: 409,
    });
  }

  // Foreign-key violation (23503)
  if (pg.code === PG_ERROR_CODES.FOREIGN_KEY_VIOLATION) {
    log.warn({
      action,
      outcome: { success: false },
      pgConstraint: pg.constraint,
      pgTable: pg.table,
      ...userOpt,
    });
    throw createError({
      ...causeOpt,
      fix: 'A referenced record is missing or was deleted. Refresh and try again.',
      message: 'Referenced record not found.',
      status: 422,
    });
  }

  pg.code satisfies never;
}

// ---------------------------------------------------------------------------
// Log enrichment
// ---------------------------------------------------------------------------

/** Spread into `log.error()` for PG-specific diagnostics.
 *  Extracts fields from any PG error (not just constraint violations). */
export function pgErrorFields(error: unknown): PgLogFields {
  const pg = unwrap(error);
  if (!pg) return {};
  return { pgCode: pg.code, pgConstraint: pg.constraint, pgTable: pg.table };
}
