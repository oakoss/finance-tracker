import { createServerFn } from '@tanstack/react-start';

import type { UserPreferences } from '@/modules/preferences/models';

import { type Db, db } from '@/db';
import { log } from '@/lib/logging/evlog';
import { hashId } from '@/lib/logging/hash';
import { authMiddleware, requireUserId } from '@/modules/auth/middleware';
import {
  bootstrapUserPreferences,
  DEFAULT_USER_PREFERENCES,
} from '@/modules/preferences/services/bootstrap';

/**
 * Discriminated union forcing callers to branch on `isDefault` before
 * accessing any preference field. The default branch is deliberately
 * narrow — it only contains fields with meaningful in-memory defaults.
 */
export type GetUserPreferencesResult =
  | { isDefault: false; preferences: UserPreferences }
  | { isDefault: true; preferences: typeof DEFAULT_USER_PREFERENCES };

/**
 * Internal handler split from the server function so it can be unit-
 * tested with a stub db. Callers outside tests should use the
 * `getUserPreferences` server function.
 */
export async function fetchUserPreferences(
  database: Db,
  userId: string,
): Promise<GetUserPreferencesResult> {
  try {
    const preferences = await bootstrapUserPreferences(database, userId);
    log.info({
      action: 'preferences.get',
      outcome: { isDefault: false },
      user: { idHash: hashId(userId) },
    });
    return { isDefault: false, preferences };
  } catch (error) {
    // Last-resort fallback: DB read/insert failed entirely. Return
    // in-memory defaults so the app keeps working; the user can
    // explicitly save preferences later to recover.
    log.error({
      action: 'preferences.get',
      error,
      outcome: { isDefault: true, reason: 'bootstrap_failed' },
      user: { idHash: hashId(userId) },
    });
    return { isDefault: true, preferences: { ...DEFAULT_USER_PREFERENCES } };
  }
}

export const getUserPreferences = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const userId = requireUserId(context);
    return fetchUserPreferences(db, userId);
  });
