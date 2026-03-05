import { and, asc, eq } from 'drizzle-orm';

import type { Db } from '@/db';

import { notDeleted } from '@/lib/audit/soft-delete';
import { tags } from '@/modules/transactions/db/schema';

export async function listTagsService(database: Db, userId: string) {
  return database
    .select({
      id: tags.id,
      name: tags.name,
    })
    .from(tags)
    .where(and(eq(tags.userId, userId), notDeleted(tags.deletedAt)))
    .orderBy(asc(tags.name));
}
