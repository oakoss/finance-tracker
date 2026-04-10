import { createServerFn } from '@tanstack/react-start';

import { db } from '@/db';
import { arkValidator } from '@/lib/form/validation';
import { log } from '@/lib/logging/evlog';
import { hashId } from '@/lib/logging/hash';
import { handleServerFnError } from '@/lib/server-fn/handle-error';
import { deleteAccountService } from '@/modules/accounts/services/delete-account';
import { deleteAccountSchema } from '@/modules/accounts/validators';
import {
  requireUserId,
  verifiedMutationMiddleware,
} from '@/modules/auth/middleware';

export const deleteAccount = createServerFn({ method: 'POST' })
  .inputValidator(arkValidator(deleteAccountSchema))
  .middleware([verifiedMutationMiddleware])
  .handler(async ({ context, data }) => {
    const userId = requireUserId(context);

    try {
      await deleteAccountService(db, userId, data);

      log.info({
        action: 'account.delete',
        outcome: { idHash: hashId(data.id) },
        user: { idHash: hashId(userId) },
      });

      return { success: true };
    } catch (error) {
      handleServerFnError(error, {
        action: 'account.delete',
        fix: 'Try again or contact support.',
        message: 'Failed to delete account.',
        userId,
      });
    }
  });
