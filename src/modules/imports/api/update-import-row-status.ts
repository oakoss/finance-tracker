import { createServerFn } from '@tanstack/react-start';

import { db } from '@/db';
import { arkValidator } from '@/lib/form/validation';
import { log } from '@/lib/logging/evlog';
import { hashId } from '@/lib/logging/hash';
import { handleServerFnError } from '@/lib/server-fn/handle-error';
import { authMiddleware, requireUserId } from '@/modules/auth/middleware';
import { updateImportRowStatusService } from '@/modules/imports/services/update-import-row-status';
import { updateImportRowStatusSchema } from '@/modules/imports/validators';

export const updateImportRowStatus = createServerFn({ method: 'POST' })
  .inputValidator(arkValidator(updateImportRowStatusSchema))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const userId = requireUserId(context);

    try {
      const result = await updateImportRowStatusService(db, userId, data);

      log.info({
        action: 'importRow.updateStatus',
        outcome: { idHash: hashId(data.id), status: data.status },
        user: { idHash: hashId(userId) },
      });

      return result;
    } catch (error) {
      handleServerFnError(error, {
        action: 'importRow.updateStatus',
        fix: 'Try again.',
        message: 'Failed to update row status.',
        userId,
      });
    }
  });
