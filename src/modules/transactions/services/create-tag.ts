import type { Db } from '@/db';

import { notDeleted } from '@/lib/audit/soft-delete';
import { parsePgError } from '@/lib/db/pg-error';
import { createError } from '@/lib/logging/evlog';
import { tags } from '@/modules/transactions/db/schema';

type CreateTagInput = {
  name: string;
};

export async function createTagService(
  database: Db,
  userId: string,
  data: CreateTagInput,
) {
  const name = data.name.trim();

  const existing = await database.query.tags.findFirst({
    where: (t, { and: a, eq: e }) =>
      a(e(t.name, name), e(t.userId, userId), notDeleted(t.deletedAt)),
  });

  if (existing) return existing;

  let tag;
  try {
    [tag] = await database
      .insert(tags)
      .values({
        createdById: userId,
        name,
        userId,
      })
      .returning();
  } catch (error) {
    // Race condition: another request created the same tag
    const pgInfo = parsePgError(error);
    if (pgInfo?.code === '23505') {
      const raced = await database.query.tags.findFirst({
        where: (t, { and: a, eq: e }) =>
          a(e(t.name, name), e(t.userId, userId), notDeleted(t.deletedAt)),
      });
      if (raced) return raced;
    }

    throw error;
  }

  if (!tag) {
    throw createError({
      fix: 'Try again. If the problem persists, contact support.',
      message: 'Failed to create tag.',
      status: 500,
    });
  }

  return tag;
}
