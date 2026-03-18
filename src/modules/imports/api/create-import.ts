import { createServerFn } from '@tanstack/react-start';

import { db } from '@/db';
import { arkValidator } from '@/lib/form/validation';
import { log } from '@/lib/logging/evlog';
import { hashId } from '@/lib/logging/hash';
import { handleServerFnError } from '@/lib/server-fn/handle-error';
import { authMiddleware, requireUserId } from '@/modules/auth/middleware';
import { createImportService } from '@/modules/imports/services/create-import';
import { createImportSchema } from '@/modules/imports/validators';

export const createImport = createServerFn({ method: 'POST' })
  .inputValidator(arkValidator(createImportSchema))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const userId = requireUserId(context);

    try {
      const result = await createImportService(db, userId, data);

      log.info({
        action: 'import.create',
        outcome: { idHash: hashId(result.id), rowCount: result.rowCount },
        user: { idHash: hashId(userId) },
      });

      return result;
    } catch (error) {
      handleServerFnError(error, {
        action: 'import.create',
        fix: 'Try again. If the problem persists, contact support.',
        message: 'Failed to create import.',
        userId,
      });
    }
  });
