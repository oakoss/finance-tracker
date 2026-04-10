import { createServerFn } from '@tanstack/react-start';

import { db } from '@/db';
import { arkValidator } from '@/lib/form/validation';
import { log } from '@/lib/logging/evlog';
import { hashId } from '@/lib/logging/hash';
import { handleServerFnError } from '@/lib/server-fn/handle-error';
import { createAccountService } from '@/modules/accounts/services/create-account';
import { createAccountSchema } from '@/modules/accounts/validators';
import {
  requireUserId,
  verifiedMutationMiddleware,
} from '@/modules/auth/middleware';

export const createAccount = createServerFn({ method: 'POST' })
  .inputValidator(arkValidator(createAccountSchema))
  .middleware([verifiedMutationMiddleware])
  .handler(async ({ context, data }) => {
    const userId = requireUserId(context);

    try {
      const result = await createAccountService(db, userId, data);

      log.info({
        action: 'account.create',
        outcome: { idHash: hashId(result.id) },
        user: { idHash: hashId(userId) },
      });

      return result;
    } catch (error) {
      handleServerFnError(error, {
        action: 'account.create',
        fix: 'Try again. If the problem persists, contact support.',
        message: 'Failed to create account.',
        userId,
      });
    }
  });
