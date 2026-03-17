import { createError, log } from '@/lib/logging/evlog';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PgErrorCode = '23503' | '23505';

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
// ---------------------------------------------------------------------------

const CONSTRAINT_MESSAGES: Record<string, string> = {
  account_terms_account_id_idx:
    'This account already has terms. Edit existing terms.',
  budget_lines_period_category_idx:
    'This category already has a budget line in this period.',
  budget_periods_user_year_month_idx:
    'A budget period for this month already exists.',
  categories_user_name_idx: 'A category with this name already exists.',
  payees_user_name_idx: 'A payee with this name already exists.',
  tags_user_name_idx: 'A tag with this name already exists.',
  transactions_account_external_id_idx:
    'This transaction has already been imported.',
  transactions_account_fingerprint_idx:
    'This transaction has already been imported.',
};

const CONSTRAINT_CODES = new Set<string>(['23503', '23505']);

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
  if (pg.code === '23505') {
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
  if (pg.code === '23503') {
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
