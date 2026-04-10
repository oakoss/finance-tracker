import { createServerFn } from '@tanstack/react-start';

import { db } from '@/db';
import { arkValidator } from '@/lib/form/validation';
import { log } from '@/lib/logging/evlog';
import { hashId } from '@/lib/logging/hash';
import { handleServerFnError } from '@/lib/server-fn/handle-error';
import { authMiddleware, requireUserId } from '@/modules/auth/middleware';
import { updateUserPreferencesService } from '@/modules/preferences/services/update-preferences';
import { updateUserPreferencesSchema } from '@/modules/preferences/validators';

export const updateUserPreferences = createServerFn({ method: 'POST' })
  .inputValidator(arkValidator(updateUserPreferencesSchema))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const userId = requireUserId(context);

    try {
      const result = await updateUserPreferencesService(db, userId, data);
      log.info({
        action: 'preferences.update',
        outcome: { success: true },
        user: { idHash: hashId(userId) },
      });
      return result;
    } catch (error) {
      handleServerFnError(error, {
        action: 'preferences.update',
        fix: 'Try again. If the problem persists, contact support.',
        message: 'Failed to update preferences.',
        userId,
      });
    }
  });
