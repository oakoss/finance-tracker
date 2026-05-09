import { and, eq } from 'drizzle-orm';

import type { Db } from '@/db';
import type { DeletePayeeAliasInput } from '@/modules/payees/validators';

import { notDeleted } from '@/lib/audit/soft-delete';
import { createError } from '@/lib/logging/evlog';
import { payees } from '@/modules/payees/db/schema';
import { payeeAliases } from '@/modules/rules/db/schema';

export async function deletePayeeAliasService(
  database: Db,
  userId: string,
  data: DeletePayeeAliasInput,
) {
  const notFound = createError({
    fix: 'Refresh and try again.',
    message: 'Alias not found.',
    status: 404,
  });

  const [row] = await database
    .select({ payeeUserId: payees.userId })
    .from(payeeAliases)
    .innerJoin(payees, eq(payees.id, payeeAliases.payeeId))
    .where(
      and(eq(payeeAliases.id, data.id), notDeleted(payeeAliases.deletedAt)),
    )
    .limit(1);

  if (!row || row.payeeUserId !== userId) throw notFound;

  // Soft-delete keeps the row available for export/audit/recovery
  // and matches the pattern used by categories/payees. The partial
  // unique index lets the user re-create the same alias afterward.
  const updated = await database
    .update(payeeAliases)
    .set({ deletedAt: new Date(), deletedById: userId })
    .where(
      and(eq(payeeAliases.id, data.id), notDeleted(payeeAliases.deletedAt)),
    )
    .returning({ id: payeeAliases.id });

  if (updated.length === 0) throw notFound;
}
