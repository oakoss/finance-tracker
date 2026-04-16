import { eq } from 'drizzle-orm';

import type { Db } from '@/db';
import type { UserPreferences } from '@/modules/preferences/models';

import { parsePgError, PG_ERROR_CODES } from '@/lib/db/pg-error';
import { createError, log } from '@/lib/logging/evlog';
import { hashId } from '@/lib/logging/hash';
import { userPreferences } from '@/modules/preferences/db/schema';

/**
 * In-memory defaults mirroring the DB column defaults in
 * `userPreferences`. Used as a last-resort fallback when both the
 * initial bootstrap and a lazy bootstrap attempt fail to materialize
 * a row — keeps the app functional with sensible values.
 */
export const DEFAULT_USER_PREFERENCES = {
  defaultCurrency: 'USD',
  locale: 'en-US',
  timeZone: 'UTC',
} as const;

export async function bootstrapUserPreferences(
  database: Db,
  userId: string,
): Promise<UserPreferences> {
  const existing = await database.query.userPreferences.findFirst({
    where: eq(userPreferences.userId, userId),
  });
  if (existing) return existing;

  try {
    const [row] = await database
      .insert(userPreferences)
      .values({ createdById: userId, userId })
      .returning();
    if (row) return row;
  } catch (error) {
    // Race: a concurrent request (e.g., auth hook + first loader) may
    // have inserted the row between our read and write. Re-read it.
    const pgInfo = parsePgError(error);
    if (pgInfo?.code === PG_ERROR_CODES.UNIQUE_VIOLATION) {
      const raced = await database.query.userPreferences.findFirst({
        where: eq(userPreferences.userId, userId),
      });
      if (raced) return raced;
    }
    throw error;
  }

  // Insert succeeded but RETURNING produced no row — shouldn't happen
  // on a healthy connection. Log with enough context for operators to
  // diagnose, then throw a structured error.
  log.error({
    action: 'preferences.bootstrap',
    outcome: { reason: 'insert_returned_no_row', success: false },
    user: { idHash: hashId(userId) },
  });
  throw createError({
    fix: 'Try again. If the problem persists, contact support.',
    message: 'Failed to bootstrap user preferences.',
    status: 500,
    why: 'INSERT INTO user_preferences ... RETURNING * produced no row.',
  });
}
