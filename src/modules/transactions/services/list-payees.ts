import { and, asc, eq } from 'drizzle-orm';

import type { Db } from '@/db';

import { notDeleted } from '@/lib/audit/soft-delete';
import { payees } from '@/modules/transactions/db/schema';

export async function listPayeesService(database: Db, userId: string) {
  return database
    .select({
      id: payees.id,
      name: payees.name,
    })
    .from(payees)
    .where(and(eq(payees.userId, userId), notDeleted(payees.deletedAt)))
    .orderBy(asc(payees.name));
}
