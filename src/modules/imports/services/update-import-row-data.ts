import { and, eq } from 'drizzle-orm';

import type { Db } from '@/db';
import type { ProcessedNormalizedRow } from '@/modules/imports/lib/apply-column-mapping';
import type { UpdateImportRowDataInput } from '@/modules/imports/validators';

import { createError } from '@/lib/logging/evlog';
import { importRows, imports } from '@/modules/imports/db/schema';
import { computeRowFingerprint } from '@/modules/imports/lib/compute-row-fingerprint';

const FINGERPRINT_FIELDS = new Set([
  'amountCents',
  'description',
  'transactionAt',
]);

export async function updateImportRowDataService(
  database: Db,
  userId: string,
  data: UpdateImportRowDataInput,
) {
  const [row] = await database
    .select({
      id: importRows.id,
      importStatus: imports.status,
      normalizedData: importRows.normalizedData,
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

  if (row.status !== 'mapped') {
    throw createError({
      fix: 'Only mapped rows can be edited.',
      message: 'Row cannot be edited.',
      status: 409,
    });
  }

  const existing = (row.normalizedData ?? {}) as ProcessedNormalizedRow;
  const merged: ProcessedNormalizedRow = {
    ...existing,
    ...data.normalizedData,
  };

  const needsFingerprint = Object.keys(data.normalizedData).some((key) =>
    FINGERPRINT_FIELDS.has(key),
  );

  if (needsFingerprint) {
    const fp = computeRowFingerprint(merged);
    if (fp) merged.fingerprint = fp;
    else delete merged.fingerprint;
  }

  const [updated] = await database
    .update(importRows)
    .set({ normalizedData: merged })
    .where(and(eq(importRows.id, data.id), eq(importRows.status, 'mapped')))
    .returning({ id: importRows.id });

  if (!updated) {
    throw createError({
      fix: 'The row may have been modified. Refresh and try again.',
      message: 'Row was not updated.',
      status: 409,
    });
  }

  return { id: data.id, normalizedData: merged };
}
