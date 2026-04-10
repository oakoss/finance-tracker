import { createServerFn } from '@tanstack/react-start';

import { db } from '@/db';
import { authMiddleware, requireUserId } from '@/modules/auth/middleware';
import { fetchUserPreferences } from '@/modules/preferences/services/fetch-preferences';

export type { GetUserPreferencesResult } from '@/modules/preferences/services/fetch-preferences';

export const getUserPreferences = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const userId = requireUserId(context);
    return fetchUserPreferences(db, userId);
  });
