import { createServerFn } from '@tanstack/react-start';
import { and, asc, eq } from 'drizzle-orm';

import { db } from '@/db';
import { notDeleted } from '@/lib/audit/soft-delete';
import { createError, log } from '@/lib/logging/evlog';
import { hashId } from '@/lib/logging/hash';
import { isExpectedError, toError } from '@/lib/validation';
import { authMiddleware, requireUserId } from '@/modules/auth/middleware';
import { tags } from '@/modules/transactions/db/schema';

export const listTags = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const userId = requireUserId(context);

    try {
      const rows = await db
        .select({
          id: tags.id,
          name: tags.name,
        })
        .from(tags)
        .where(and(eq(tags.userId, userId), notDeleted(tags.deletedAt)))
        .orderBy(asc(tags.name));

      log.info({
        action: 'tag.list',
        outcome: { count: rows.length },
        user: { idHash: hashId(userId) },
      });

      return rows;
    } catch (error) {
      if (isExpectedError(error)) throw error;
      log.error({
        action: 'tag.list',
        error: toError(error).message,
        outcome: { success: false },
        user: { idHash: hashId(userId) },
      });
      throw createError({
        cause: toError(error),
        fix: 'Refresh the page. If the problem persists, contact support.',
        message: 'Failed to list tags.',
        status: 500,
      });
    }
  });

export type TagListItem = Awaited<ReturnType<typeof listTags>>[number];
