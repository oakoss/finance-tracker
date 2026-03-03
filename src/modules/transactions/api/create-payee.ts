import { createServerFn } from '@tanstack/react-start';
import { type } from 'arktype';

import { db } from '@/db';
import { notDeleted } from '@/lib/audit/soft-delete';
import {
  parsePgError,
  pgErrorFields,
  throwIfConstraintViolation,
} from '@/lib/db/pg-error';
import { createError, log } from '@/lib/logging/evlog';
import { hashId } from '@/lib/logging/hash';
import { arkValidator, isExpectedError, toError } from '@/lib/validation';
import { authMiddleware, requireUserId } from '@/modules/auth/middleware';
import { payees } from '@/modules/transactions/db/schema';

const createPayeeSchema = type({
  name: '0 < string <= 200',
});

export const createPayee = createServerFn({ method: 'POST' })
  .inputValidator(arkValidator(createPayeeSchema))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const userId = requireUserId(context);
    const normalizedName = data.name.trim().toLowerCase();

    try {
      const existing = await db.query.payees.findFirst({
        where: (t, { and: a, eq: e }) =>
          a(
            e(t.normalizedName, normalizedName),
            e(t.userId, userId),
            notDeleted(t.deletedAt),
          ),
      });

      if (existing) return existing;

      const [payee] = await db
        .insert(payees)
        .values({
          createdById: userId,
          name: data.name.trim(),
          normalizedName,
          userId,
        })
        .returning();

      if (!payee) {
        throw createError({
          fix: 'Try again. If the problem persists, contact support.',
          message: 'Failed to create payee.',
          status: 500,
        });
      }

      log.info({
        action: 'payee.create',
        outcome: { idHash: hashId(payee.id) },
        user: { idHash: hashId(userId) },
      });

      return payee;
    } catch (error) {
      if (isExpectedError(error)) throw error;

      // Handle unique constraint race condition (code 23505)
      const pgInfo = parsePgError(error);
      if (pgInfo?.code === '23505') {
        const existing = await db.query.payees.findFirst({
          where: (t, { and: a, eq: e }) =>
            a(
              e(t.normalizedName, normalizedName),
              e(t.userId, userId),
              notDeleted(t.deletedAt),
            ),
        });
        if (existing) return existing;
      }

      throwIfConstraintViolation(error, 'payee.create', hashId(userId));
      log.error({
        action: 'payee.create',
        error: toError(error).message,
        outcome: { success: false },
        user: { idHash: hashId(userId) },
        ...pgErrorFields(error),
      });
      throw createError({
        cause: toError(error),
        fix: 'Try again. If the problem persists, contact support.',
        message: 'Failed to create payee.',
        status: 500,
      });
    }
  });
