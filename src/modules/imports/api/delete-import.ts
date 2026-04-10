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
import { deleteImportService } from '@/modules/imports/services/delete-import';
import { deleteImportSchema } from '@/modules/imports/validators';

export const deleteImport = createServerFn({ method: 'POST' })
  .inputValidator(arkValidator(deleteImportSchema))
  .middleware([verifiedMutationMiddleware])
  .handler(async ({ context, data }) => {
    const userId = requireUserId(context);

    try {
      await deleteImportService(db, userId, data);

      log.info({
        action: 'import.delete',
        outcome: { idHash: hashId(data.id) },
        user: { idHash: hashId(userId) },
      });

      return { success: true };
    } catch (error) {
      handleServerFnError(error, {
        action: 'import.delete',
        fix: 'Try again or contact support.',
        message: 'Failed to delete import.',
        userId,
      });
    }
  });
