import { createServerFn } from '@tanstack/react-start';
import { type } from 'arktype';

import { db } from '@/db';
import { arkValidator } from '@/lib/form/validation';
import { log } from '@/lib/logging/evlog';
import { hashId } from '@/lib/logging/hash';
import { handleServerFnError } from '@/lib/server-fn/handle-error';
import { authMiddleware, requireUserId } from '@/modules/auth/middleware';
import { createPayeeService } from '@/modules/transactions/services/create-payee';

const createPayeeSchema = type({
  name: '0 < string <= 200',
});

export const createPayee = createServerFn({ method: 'POST' })
  .inputValidator(arkValidator(createPayeeSchema))
  .middleware([authMiddleware])
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
