import { createServerFn } from '@tanstack/react-start';

import { db } from '@/db';
import { arkValidator } from '@/lib/form/validation';
import { log } from '@/lib/logging/evlog';
import { hashId } from '@/lib/logging/hash';
import { handleServerFnError } from '@/lib/server-fn/handle-error';
import { updateAccountService } from '@/modules/accounts/services/update-account';
import { updateAccountSchema } from '@/modules/accounts/validators';
import {
  requireUserId,
  verifiedMutationMiddleware,
} from '@/modules/auth/middleware';

export const updateAccount = createServerFn({ method: 'POST' })
  .inputValidator(arkValidator(updateAccountSchema))
  .middleware([verifiedMutationMiddleware])
  .handler(async ({ context, data }) => {
    const userId = requireUserId(context);

    try {
      const result = await updateAccountService(db, userId, data);

      log.info({
        action: 'account.update',
        outcome: { idHash: hashId(result.id) },
        user: { idHash: hashId(userId) },
      });

      return result;
    } catch (error) {
      handleServerFnError(error, {
        action: 'account.update',
        fix: 'Try again. If the problem persists, contact support.',
        message: 'Failed to update account.',
        userId,
      });
    }
  });
