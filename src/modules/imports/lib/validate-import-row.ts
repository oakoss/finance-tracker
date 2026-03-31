import type { NormalizedRow } from '@/modules/imports/lib/apply-column-mapping';

type ValidationResult =
  | { errors: string[]; valid: false }
  | { errors: []; valid: true };

export function validateImportRow(row: NormalizedRow): ValidationResult {
  const errors: string[] = [];

  if (!row.description?.trim()) {
    errors.push('Missing required field: description');
  }

  if (row.amountCents === undefined || !Number.isFinite(row.amountCents)) {
    const msg = row.amountRaw
      ? `Could not parse amount: "${row.amountRaw}"`
      : 'Missing required field: amount';
    errors.push(msg);
  }

  if (!row.transactionAt?.trim()) {
    errors.push('Missing required field: transactionAt');
  }

  if (errors.length > 0) return { errors, valid: false };
  return { errors: [], valid: true };
}
