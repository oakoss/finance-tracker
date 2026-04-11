import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils.js';

import type { NormalizedRow } from '@/modules/imports/lib/apply-column-mapping';

export function computeRowFingerprint(row: NormalizedRow): string | null {
  if (
    row.transactionAt === undefined ||
    row.amountCents === undefined ||
    row.description === undefined
  ) {
    return null;
  }

  return bytesToHex(
    sha256(
      utf8ToBytes(
        `${row.transactionAt}|${row.amountCents}|${row.description}|${row.memo ?? ''}`,
      ),
    ),
  );
}
