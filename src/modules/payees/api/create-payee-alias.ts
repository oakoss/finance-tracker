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
import { createPayeeAliasService } from '@/modules/payees/services/create-payee-alias';
import { createPayeeAliasSchema } from '@/modules/payees/validators';

export const createPayeeAlias = createServerFn({ method: 'POST' })
  .inputValidator(arkValidator(createPayeeAliasSchema))
  .middleware([verifiedMutationMiddleware])
  .handler(async ({ context, data }) => {
    const userId = requireUserId(context);

    try {
      const alias = await createPayeeAliasService(db, userId, data);

      log.info({
        action: 'payee.alias.create',
        outcome: { idHash: hashId(alias.id) },
        user: { idHash: hashId(userId) },
      });

      return alias;
    } catch (error) {
      handleServerFnError(error, {
        action: 'payee.alias.create',
        fix: 'Try again. If the problem persists, contact support.',
        message: 'Failed to create payee alias.',
        userId,
      });
    }
  });
