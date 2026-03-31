import { createServerFn } from '@tanstack/react-start';

import { db } from '@/db';
import { arkValidator } from '@/lib/form/validation';
import { log } from '@/lib/logging/evlog';
import { hashId } from '@/lib/logging/hash';
import { handleServerFnError } from '@/lib/server-fn/handle-error';
import { authMiddleware, requireUserId } from '@/modules/auth/middleware';
import { listImportRowsService } from '@/modules/imports/services/list-import-rows';
import { listImportRowsSchema } from '@/modules/imports/validators';

export const listImportRows = createServerFn({ method: 'GET' })
  .inputValidator(arkValidator(listImportRowsSchema))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const userId = requireUserId(context);

    try {
      const result = await listImportRowsService(db, userId, data);

      log.info({
        action: 'importRow.list',
        outcome: { count: result.rows.length },
        user: { idHash: hashId(userId) },
      });

      return result;
    } catch (error) {
      handleServerFnError(error, {
        action: 'importRow.list',
        fix: 'Refresh the page.',
        message: 'Failed to load import rows.',
        userId,
      });
    }
  });

export type ImportDetailResult = NonNullable<
  Awaited<ReturnType<typeof listImportRows>>
>;
export type ImportRowItem = ImportDetailResult['rows'][number];
