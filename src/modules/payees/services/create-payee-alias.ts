import type { Db } from '@/db';
import type { CreatePayeeAliasInput } from '@/modules/payees/validators';

import { notDeleted } from '@/lib/audit/soft-delete';
import { parsePgError, PG_ERROR_CODES } from '@/lib/db/pg-error';
import { createError } from '@/lib/logging/evlog';
import {
  payeeAliases,
  payeeAliasesIndexNames,
} from '@/modules/rules/db/schema';

export async function createPayeeAliasService(
  database: Db,
  userId: string,
  data: CreatePayeeAliasInput,
) {
  const owned = await database.query.payees.findFirst({
    where: (t, { and: a, eq: e }) =>
      a(e(t.id, data.payeeId), e(t.userId, userId), notDeleted(t.deletedAt)),
  });

  if (!owned) {
    throw createError({
      fix: 'Refresh the payee list and try again.',
      message: 'Payee not found.',
      status: 404,
    });
  }

  const normalizedAlias = data.alias.trim().toLowerCase();

  const duplicate = createError({
    fix: 'Choose a different alias or edit the existing one.',
    message: 'This payee already has this alias.',
    status: 409,
  });

  // Pre-check is a UX optimization that produces the friendly 409
  // without an exception round-trip; the unique index in the catch
  // below is the authoritative source for concurrent inserts.
  // The unique index is partial (deleted_at IS NULL), so soft-deleted
  // aliases are correctly excluded here too.
  const existing = await database.query.payeeAliases.findFirst({
    where: (t, { and: a, eq: e }) =>
      a(
        e(t.payeeId, data.payeeId),
        e(t.alias, normalizedAlias),
        notDeleted(t.deletedAt),
      ),
  });
  if (existing) throw duplicate;

  try {
    const [alias] = await database
      .insert(payeeAliases)
      .values({
        alias: normalizedAlias,
        createdById: userId,
        payeeId: data.payeeId,
      })
      .returning();

    if (!alias) {
      throw createError({
        fix: 'Try again. If the problem persists, contact support.',
        message: 'Failed to create payee alias.',
        status: 500,
        why: 'INSERT ... RETURNING produced no rows.',
      });
    }

    return alias;
  } catch (error) {
    const pgInfo = parsePgError(error);
    if (
      pgInfo?.code === PG_ERROR_CODES.UNIQUE_VIOLATION &&
      pgInfo.constraint === payeeAliasesIndexNames.payeeAliasIdx
    ) {
      throw duplicate;
    }
    throw error;
  }
}
