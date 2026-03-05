import type { Db } from '@/db';
import type { CreatePayeeInput } from '@/modules/transactions/validators';

import { notDeleted } from '@/lib/audit/soft-delete';
import { parsePgError } from '@/lib/db/pg-error';
import { createError } from '@/lib/logging/evlog';
import { payees } from '@/modules/transactions/db/schema';

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
    if (pgInfo?.code === '23505') {
      const raced = await database.query.payees.findFirst({
        where: (t, { and: a, eq: e }) =>
          a(
            e(t.normalizedName, normalizedName),
            e(t.userId, userId),
            notDeleted(t.deletedAt),
          ),
      });
      if (raced) return raced;
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
