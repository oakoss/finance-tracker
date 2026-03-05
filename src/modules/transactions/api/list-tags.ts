import { createServerFn } from '@tanstack/react-start';

import { db } from '@/db';
import { log } from '@/lib/logging/evlog';
import { hashId } from '@/lib/logging/hash';
import { handleServerFnError } from '@/lib/server-fn/handle-error';
import { authMiddleware, requireUserId } from '@/modules/auth/middleware';
import { listTagsService } from '@/modules/transactions/services/list-tags';

export const listTags = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const userId = requireUserId(context);

    try {
      const rows = await listTagsService(db, userId);

      log.info({
        action: 'tag.list',
        outcome: { count: rows.length },
        user: { idHash: hashId(userId) },
      });

      return rows;
    } catch (error) {
      handleServerFnError(error, {
        action: 'tag.list',
        fix: 'Refresh the page. If the problem persists, contact support.',
        message: 'Failed to list tags.',
        userId,
      });
    }
  });

export type TagListItem = Awaited<ReturnType<typeof listTags>>[number];
