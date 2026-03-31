import { createServerFn } from '@tanstack/react-start';

import { db } from '@/db';
import { arkValidator } from '@/lib/form/validation';
import { log } from '@/lib/logging/evlog';
import { hashId } from '@/lib/logging/hash';
import { handleServerFnError } from '@/lib/server-fn/handle-error';
import { authMiddleware, requireUserId } from '@/modules/auth/middleware';
import { updateImportRowDataService } from '@/modules/imports/services/update-import-row-data';
import { updateImportRowDataSchema } from '@/modules/imports/validators';

export const updateImportRowData = createServerFn({ method: 'POST' })
  .inputValidator(arkValidator(updateImportRowDataSchema))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const userId = requireUserId(context);

    try {
      const result = await updateImportRowDataService(db, userId, data);

      log.info({
        action: 'importRow.updateData',
        outcome: { idHash: hashId(data.id) },
        user: { idHash: hashId(userId) },
      });

      return result;
    } catch (error) {
      handleServerFnError(error, {
        action: 'importRow.updateData',
        fix: 'Try again.',
        message: 'Failed to update row data.',
        userId,
      });
    }
  });
