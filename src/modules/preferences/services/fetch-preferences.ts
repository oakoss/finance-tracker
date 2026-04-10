import type { Db } from '@/db';
import type { UserPreferences } from '@/modules/preferences/models';

import { log } from '@/lib/logging/evlog';
import { hashId } from '@/lib/logging/hash';
import {
  bootstrapUserPreferences,
  DEFAULT_USER_PREFERENCES,
} from '@/modules/preferences/services/bootstrap';

/**
 * Discriminated union. The `isDefault: true` branch is an error-recovery
 * fallback returned only when `bootstrapUserPreferences` fails entirely;
 * it carries a minimal in-memory shape so the UI keeps working.
 */
export type GetUserPreferencesResult =
  | { isDefault: false; preferences: UserPreferences }
  | { isDefault: true; preferences: typeof DEFAULT_USER_PREFERENCES };

/**
 * Server-only handler split from the server function so it can be
 * tested with a stub db. Lives in `services/` because importing it
 * on the client would pull in the database driver.
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
