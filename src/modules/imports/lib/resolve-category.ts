import { and, eq, sql } from 'drizzle-orm';

import type { DbOrTx } from '@/db';

import { notDeleted } from '@/lib/audit/soft-delete';
import { categories } from '@/modules/categories/db/schema';

export async function resolveCategoryByName(
  tx: DbOrTx,
  userId: string,
  name: string,
): Promise<string | null> {
  const [row] = await tx
    .select({ id: categories.id })
    .from(categories)
    .where(
      and(
        eq(categories.userId, userId),
        eq(sql`lower(${categories.name})`, name.toLowerCase()),
        notDeleted(categories.deletedAt),
      ),
    );

  return row?.id ?? null;
}
