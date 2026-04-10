import { createServerFn } from '@tanstack/react-start';

import { db } from '@/db';
import { log } from '@/lib/logging/evlog';
import { hashId } from '@/lib/logging/hash';
import { handleServerFnError } from '@/lib/server-fn/handle-error';
import { authMiddleware, requireUserId } from '@/modules/auth/middleware';
import { cancelDeletionService } from '@/modules/auth/services/cancel-deletion';

export const cancelAccountDeletion = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const userId = requireUserId(context);

    try {
      await cancelDeletionService(db, userId);

      log.info({
        action: 'auth.deletion.cancelled',
        user: { idHash: hashId(userId) },
      });

      return { success: true };
    } catch (error) {
      handleServerFnError(error, {
        action: 'auth.deletion.cancelled',
        fix: 'Try again. If the problem persists, contact support.',
        message: 'Failed to cancel account deletion.',
        userId,
      });
    }
  });
