import type { ColumnMapping, TargetField } from '@/modules/imports/validators';

export type NormalizedRow = {
  amountCents?: number;
  categoryName?: string;
  description?: string;
  memo?: string;
  payeeName?: string;
  transactionAt?: string;
};

/** Parses an amount string (e.g. "$1,234.56", "(4.50)") to cents. Returns null if unparseable. */
export function parseAmountToCents(raw: string): number | null {
  if (!raw?.trim()) return null;

  let cleaned = raw.trim();

  const isParenNegative = cleaned.startsWith('(') && cleaned.endsWith(')');
  if (isParenNegative) {
    cleaned = cleaned.slice(1, -1);
  }

  cleaned = cleaned.replaceAll(/[^0-9.-]/g, '');

  const value = Number.parseFloat(cleaned);
  if (!Number.isFinite(value)) return null;

  const cents = Math.round((isParenNegative ? -value : value) * 100);
  return cents;
}

export function buildReverseMap(
  mapping: ColumnMapping,
): Map<TargetField, string> {
  const reverseMap = new Map<TargetField, string>();
  for (const [csvHeader, targetField] of Object.entries(mapping.mapping)) {
    if (targetField !== 'skip') {
      reverseMap.set(targetField, csvHeader);
    }
  }
  return reverseMap;
}

export function applyColumnMapping(
  rawRow: Record<string, string>,
  columnMapping: ColumnMapping,
  reverseMap?: Map<TargetField, string>,
): NormalizedRow {
  const result: NormalizedRow = {};
  const map = reverseMap ?? buildReverseMap(columnMapping);

  const getValue = (field: TargetField): string =>
    (map.has(field) ? rawRow[map.get(field)!] : undefined) ?? '';

  const description = getValue('description').trim();
  if (description) result.description = description;

  const transactionAt = getValue('transactionAt').trim();
  if (transactionAt) result.transactionAt = transactionAt;

  const categoryName = getValue('categoryName').trim();
  if (categoryName) result.categoryName = categoryName;

  const payeeName = getValue('payeeName').trim();
  if (payeeName) result.payeeName = payeeName;

  const memo = getValue('memo').trim();
  if (memo) result.memo = memo;

  if (columnMapping.amountMode === 'single') {
    const cents = parseAmountToCents(getValue('amount'));
    if (cents !== null) result.amountCents = cents;
  } else {
    const debitCents = parseAmountToCents(getValue('debitAmount'));
    const creditCents = parseAmountToCents(getValue('creditAmount'));

    if (debitCents !== null && debitCents !== 0) {
      result.amountCents = debitCents > 0 ? -debitCents : debitCents;
    } else if (creditCents !== null && creditCents !== 0) {
      result.amountCents = Math.abs(creditCents);
    } else if (debitCents === 0 && creditCents === 0) {
      result.amountCents = 0;
    }
  }

  return result;
}
