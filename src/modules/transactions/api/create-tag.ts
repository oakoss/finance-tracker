import { createServerFn } from '@tanstack/react-start';
import { type } from 'arktype';

import { db } from '@/db';
import { notDeleted } from '@/lib/audit/soft-delete';
import {
  parsePgError,
  pgErrorFields,
  throwIfConstraintViolation,
} from '@/lib/db/pg-error';
import { arkValidator, isExpectedError, toError } from '@/lib/form/validation';
import { createError, log } from '@/lib/logging/evlog';
import { hashId } from '@/lib/logging/hash';
import { authMiddleware, requireUserId } from '@/modules/auth/middleware';
import { tags } from '@/modules/transactions/db/schema';

const createTagSchema = type({
  name: '0 < string <= 100',
});

export const createTag = createServerFn({ method: 'POST' })
  .inputValidator(arkValidator(createTagSchema))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const userId = requireUserId(context);
    const name = data.name.trim();

    try {
      const existing = await db.query.tags.findFirst({
        where: (t, { and: a, eq: e }) =>
          a(e(t.name, name), e(t.userId, userId), notDeleted(t.deletedAt)),
      });

      if (existing) return existing;

      const [tag] = await db
        .insert(tags)
        .values({
          createdById: userId,
          name,
          userId,
        })
        .returning();

      if (!tag) {
        throw createError({
          fix: 'Try again. If the problem persists, contact support.',
          message: 'Failed to create tag.',
          status: 500,
        });
      }

      log.info({
        action: 'tag.create',
        outcome: { idHash: hashId(tag.id) },
        user: { idHash: hashId(userId) },
      });

      return tag;
    } catch (error) {
      if (isExpectedError(error)) throw error;

      // Handle unique constraint race condition (code 23505)
      const pgInfo = parsePgError(error);
      if (pgInfo?.code === '23505') {
        const existing = await db.query.tags.findFirst({
          where: (t, { and: a, eq: e }) =>
            a(e(t.name, name), e(t.userId, userId), notDeleted(t.deletedAt)),
        });
        if (existing) return existing;
      }

      throwIfConstraintViolation(error, 'tag.create', hashId(userId));
      log.error({
        action: 'tag.create',
        error: toError(error).message,
        outcome: { success: false },
        user: { idHash: hashId(userId) },
        ...pgErrorFields(error),
      });
      throw createError({
        cause: toError(error),
        fix: 'Try again. If the problem persists, contact support.',
        message: 'Failed to create tag.',
        status: 500,
      });
    }
  });
