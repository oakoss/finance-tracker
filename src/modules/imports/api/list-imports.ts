import { createServerFn } from '@tanstack/react-start';

import { db } from '@/db';
import { log } from '@/lib/logging/evlog';
import { hashId } from '@/lib/logging/hash';
import { handleServerFnError } from '@/lib/server-fn/handle-error';
import { authMiddleware, requireUserId } from '@/modules/auth/middleware';
import { listImportsService } from '@/modules/imports/services/list-imports';

export const listImports = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const userId = requireUserId(context);

    try {
      const result = await listImportsService(db, userId);

      log.info({
        action: 'import.list',
        outcome: { count: result.length },
        user: { idHash: hashId(userId) },
      });

      return result;
    } catch (error) {
      handleServerFnError(error, {
        action: 'import.list',
        fix: 'Refresh the page. If the problem persists, contact support.',
        message: 'Failed to list imports.',
        userId,
      });
    }
  });

export type ImportListItem = Awaited<ReturnType<typeof listImports>>[number];
