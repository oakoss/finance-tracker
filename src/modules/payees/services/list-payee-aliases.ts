import type { Db } from '@/db';
import type { ListPayeeAliasesInput } from '@/modules/payees/validators';

import { notDeleted } from '@/lib/audit/soft-delete';
import { createError, log } from '@/lib/logging/evlog';
import { hashId } from '@/lib/logging/hash';

// Hard cap so a runaway/imported alias set can't blow the SSR payload
// or a JSON serializer. Pagination can land later if real users hit it.
export const PAYEE_ALIAS_LIST_CAP = 500;

export async function listPayeeAliasesService(
  database: Db,
  userId: string,
  data: ListPayeeAliasesInput,
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

  const rows = await database.query.payeeAliases.findMany({
    limit: PAYEE_ALIAS_LIST_CAP + 1,
    orderBy: (t, { asc }) => asc(t.alias),
    where: (t, { and: a, eq: e }) =>
      a(e(t.payeeId, data.payeeId), notDeleted(t.deletedAt)),
  });

  if (rows.length > PAYEE_ALIAS_LIST_CAP) {
    log.warn({
      action: 'payee.alias.list.cap_hit',
      outcome: { count: rows.length, payeeIdHash: hashId(data.payeeId) },
      user: { idHash: hashId(userId) },
    });
    return rows.slice(0, PAYEE_ALIAS_LIST_CAP);
  }

  return rows;
}
