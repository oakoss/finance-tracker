import { and, eq } from 'drizzle-orm';

import type { Db } from '@/db';
import type { DeleteImportInput } from '@/modules/imports/validators';

import { insertAuditLog } from '@/lib/audit/insert-audit-log';
import { ensureFound } from '@/lib/form/validation';
import { createError } from '@/lib/logging/evlog';
import { imports } from '@/modules/imports/db/schema';

export async function deleteImportService(
  database: Db,
  userId: string,
  data: DeleteImportInput,
) {
  return database.transaction(async (tx) => {
    const existing = await ensureFound(
      tx.query.imports.findFirst({
        where: (t, { and: a, eq: e }) =>
          a(e(t.id, data.id), e(t.userId, userId)),
      }),
      'Import',
    );

    await insertAuditLog(tx, {
      action: 'delete',
      actorId: userId,
      beforeData: existing as unknown as Record<string, unknown>,
      entityId: data.id,
      tableName: 'imports',
    });

    const [deleted] = await tx
      .delete(imports)
      .where(and(eq(imports.id, data.id), eq(imports.userId, userId)))
      .returning({ id: imports.id });

    if (!deleted) {
      throw createError({
        fix: 'Refresh the page. This import may have already been deleted.',
        message: 'Import not found.',
        status: 409,
      });
    }
  });
}
