import { createServerFn } from '@tanstack/react-start';

import { db } from '@/db';
import { arkValidator } from '@/lib/form/validation';
import { log } from '@/lib/logging/evlog';
import { hashId } from '@/lib/logging/hash';
import { handleServerFnError } from '@/lib/server-fn/handle-error';
import {
  requireUserId,
  verifiedMutationMiddleware,
} from '@/modules/auth/middleware';
import { createPayeeService } from '@/modules/transactions/services/create-payee';
import { createPayeeSchema } from '@/modules/transactions/validators';

export const createPayee = createServerFn({ method: 'POST' })
  .inputValidator(arkValidator(createPayeeSchema))
  .middleware([verifiedMutationMiddleware])
  .handler(async ({ context, data }) => {
    const userId = requireUserId(context);

    try {
      const payee = await createPayeeService(db, userId, data);

      log.info({
        action: 'payee.create',
        outcome: { idHash: hashId(payee.id) },
        user: { idHash: hashId(userId) },
      });

      return payee;
    } catch (error) {
      handleServerFnError(error, {
        action: 'payee.create',
        fix: 'Try again. If the problem persists, contact support.',
        message: 'Failed to create payee.',
        userId,
      });
    }
  });
