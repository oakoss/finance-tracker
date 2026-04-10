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
import { commitImportService } from '@/modules/imports/services/commit-import';
import { commitImportSchema } from '@/modules/imports/validators';

export const commitImport = createServerFn({ method: 'POST' })
  .inputValidator(arkValidator(commitImportSchema))
  .middleware([verifiedMutationMiddleware])
  .handler(async ({ context, data }) => {
    const userId = requireUserId(context);

    try {
      const start = performance.now();
      const result = await commitImportService(db, userId, data);

      log.info({
        action: 'import.commit',
        outcome: {
          committedCount: result.committedCount,
          errorCount: result.errorCount,
          idHash: hashId(data.importId),
          serviceMs: Math.round(performance.now() - start),
          skippedCount: result.skippedCount,
        },
        user: { idHash: hashId(userId) },
      });

      return result;
    } catch (error) {
      handleServerFnError(error, {
        action: 'import.commit',
        fix: 'Try again or contact support.',
        message: 'Failed to commit import.',
        userId,
      });
    }
  });
