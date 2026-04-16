import type { Db } from '@/db';
import type { CreatePayeeInput } from '@/modules/payees/validators';

import { notDeleted } from '@/lib/audit/soft-delete';
import { parsePgError, PG_ERROR_CODES } from '@/lib/db/pg-error';
import { createError, log } from '@/lib/logging/evlog';
import { hashId } from '@/lib/logging/hash';
import { payees, payeesIndexNames } from '@/modules/payees/db/schema';

export async function createPayeeService(
  database: Db,
  userId: string,
  data: CreatePayeeInput,
) {
  const normalizedName = data.name.trim().toLowerCase();

  const existing = await database.query.payees.findFirst({
    where: (t, { and: a, eq: e }) =>
      a(
        e(t.normalizedName, normalizedName),
        e(t.userId, userId),
        notDeleted(t.deletedAt),
      ),
  });

  if (existing) return existing;

  let payee;
  try {
    [payee] = await database
      .insert(payees)
      .values({
        createdById: userId,
        name: data.name.trim(),
        normalizedName,
        userId,
      })
      .returning();
  } catch (error) {
    // Race condition: another request created the same payee
    const pgInfo = parsePgError(error);
    if (
      pgInfo?.code === PG_ERROR_CODES.UNIQUE_VIOLATION &&
      pgInfo.constraint === payeesIndexNames.userNameIdx
    ) {
      const raced = await database.query.payees.findFirst({
        where: (t, { and: a, eq: e }) =>
          a(
            e(t.normalizedName, normalizedName),
            e(t.userId, userId),
            notDeleted(t.deletedAt),
          ),
      });
      if (raced) {
        log.warn({
          action: 'payee.create.raceResolved',
          outcome: { idHash: hashId(raced.id) },
          user: { idHash: hashId(userId) },
        });
        return raced;
      }
    }

    throw error;
  }

  if (!payee) {
    throw createError({
      fix: 'Try again. If the problem persists, contact support.',
      message: 'Failed to create payee.',
      status: 500,
    });
  }

  return payee;
}
