import { and, eq } from 'drizzle-orm';

import type { Db } from '@/db';
import type { UpdateImportRowStatusInput } from '@/modules/imports/validators';

import { createError } from '@/lib/logging/evlog';
import { importRows, imports } from '@/modules/imports/db/schema';

const TOGGLEABLE_STATUSES = new Set(['mapped', 'ignored']);

export async function updateImportRowStatusService(
  database: Db,
  userId: string,
  data: UpdateImportRowStatusInput,
) {
  const [row] = await database
    .select({
      id: importRows.id,
      importId: importRows.importId,
      importStatus: imports.status,
      status: importRows.status,
    })
    .from(importRows)
    .innerJoin(imports, eq(imports.id, importRows.importId))
    .where(and(eq(importRows.id, data.id), eq(imports.userId, userId)));

  if (!row) {
    throw createError({
      fix: 'Select a valid import row.',
      message: 'Import row not found.',
      status: 404,
    });
  }

  if (row.importStatus === 'committed') {
    throw createError({
      fix: 'This import has already been committed.',
      message: 'Cannot modify rows of a committed import.',
      status: 409,
    });
  }

  if (!TOGGLEABLE_STATUSES.has(row.status)) {
    throw createError({
      fix: `Rows with status "${row.status}" cannot be toggled.`,
      message: 'Row status cannot be changed.',
      status: 409,
    });
  }

  const oppositeStatus = data.status === 'mapped' ? 'ignored' : 'mapped';
  const [updated] = await database
    .update(importRows)
    .set({ status: data.status })
    .where(
      and(eq(importRows.id, data.id), eq(importRows.status, oppositeStatus)),
    )
    .returning({
      id: importRows.id,
      rowIndex: importRows.rowIndex,
      status: importRows.status,
    });

  if (!updated) {
    throw createError({
      fix: 'The row may have been modified. Refresh and try again.',
      message: 'Row status was not updated.',
      status: 409,
    });
  }

  return updated;
}
