import { createHash } from 'node:crypto';

import type { NormalizedRow } from '@/modules/imports/lib/apply-column-mapping';

export function computeRowFingerprint(row: NormalizedRow): string | null {
  if (
    row.transactionAt === undefined ||
    row.amountCents === undefined ||
    row.description === undefined
  ) {
    return null;
  }

  return createHash('sha256')
    .update(
      `${row.transactionAt}|${row.amountCents}|${row.description}|${row.memo ?? ''}`,
    )
    .digest('hex');
}
