import { createServerFn } from '@tanstack/react-start';

import { db } from '@/db';
import { log } from '@/lib/logging/evlog';
import { hashId } from '@/lib/logging/hash';
import { handleServerFnError } from '@/lib/server-fn/handle-error';
import { authMiddleware, requireUserId } from '@/modules/auth/middleware';
import { initiateDeletionService } from '@/modules/auth/services/initiate-deletion';

export const initiateAccountDeletion = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const userId = requireUserId(context);

    try {
      const result = await initiateDeletionService(db, userId);

      log.info({
        action: 'auth.deletion.initiated',
        outcome: { purgeAfter: result.purgeAfter.toISOString() },
        user: { idHash: hashId(userId) },
      });

      return result;
    } catch (error) {
      handleServerFnError(error, {
        action: 'auth.deletion.initiated',
        fix: 'Try again. If the problem persists, contact support.',
        message: 'Failed to initiate account deletion.',
        userId,
      });
    }
  });
