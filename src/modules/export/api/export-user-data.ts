import { createServerFn } from '@tanstack/react-start';

import { db } from '@/db';
import { arkValidator } from '@/lib/form/validation';
import { log } from '@/lib/logging/evlog';
import { hashId } from '@/lib/logging/hash';
import { handleServerFnError } from '@/lib/server-fn/handle-error';
import { authMiddleware, requireUserId } from '@/modules/auth/middleware';
import { buildExport } from '@/modules/export/services/build-export';
import { gatherUserData } from '@/modules/export/services/gather-user-data';
import { exportUserDataSchema } from '@/modules/export/validators';

export const exportUserData = createServerFn({ method: 'POST' })
  .inputValidator(arkValidator(exportUserDataSchema))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const userId = requireUserId(context);

    try {
      const userData = await gatherUserData(db, userId);
      const result = await buildExport(userData, data.format);

      const counts = {
        accounts: userData.accounts.length,
        budgetPeriods: userData.budgetPeriods.length,
        categories: userData.categories.length,
        transactions: userData.transactions.length,
      };

      log.info({
        action: 'export.download',
        outcome: { counts, format: data.format },
        user: { idHash: hashId(userId) },
      });

      return result;
    } catch (error) {
      handleServerFnError(error, {
        action: 'export.download',
        fix: 'Try again. If the problem persists, contact support.',
        message: 'Failed to export data.',
        userId,
      });
    }
  });
