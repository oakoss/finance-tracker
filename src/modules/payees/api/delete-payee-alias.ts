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
import { deletePayeeAliasService } from '@/modules/payees/services/delete-payee-alias';
import { deletePayeeAliasSchema } from '@/modules/payees/validators';

export const deletePayeeAlias = createServerFn({ method: 'POST' })
  .inputValidator(arkValidator(deletePayeeAliasSchema))
  .middleware([verifiedMutationMiddleware])
  .handler(async ({ context, data }) => {
    const userId = requireUserId(context);

    try {
      await deletePayeeAliasService(db, userId, data);

      log.info({
        action: 'payee.alias.delete',
        outcome: { idHash: hashId(data.id) },
        user: { idHash: hashId(userId) },
      });
    } catch (error) {
      handleServerFnError(error, {
        action: 'payee.alias.delete',
        fix: 'Refresh and try again.',
        message: 'Failed to delete payee alias.',
        userId,
      });
    }
  });
