import type { ColumnMapping, TargetField } from '@/modules/imports/validators';

const DATE_PATTERNS =
  /^(date|trans(action)?[_\s]?date|posted[_\s]?date|booking[_\s]?date)$/i;
const DESCRIPTION_PATTERNS =
  /^(desc(ription)?|narration|particulars|details|reference|trans(action)?[_\s]?desc(ription)?)$/i;
const AMOUNT_PATTERNS = /^(amount|sum|value|trans(action)?[_\s]?amount)$/i;
const DEBIT_PATTERNS =
  /^(debit|withdrawal|out|debit[_\s]?amount|money[_\s]?out)$/i;
const CREDIT_PATTERNS =
  /^(credit|deposit|in|credit[_\s]?amount|money[_\s]?in)$/i;
const CATEGORY_PATTERNS = /^(category|type|group|category[_\s]?name)$/i;
const PAYEE_PATTERNS = /^(payee|merchant|vendor|payee[_\s]?name|beneficiary)$/i;
const MEMO_PATTERNS = /^(memo|note|notes|comment|remarks)$/i;

type PatternEntry = { field: TargetField; pattern: RegExp };

const SINGLE_PATTERNS: PatternEntry[] = [
  { field: 'transactionAt', pattern: DATE_PATTERNS },
  { field: 'description', pattern: DESCRIPTION_PATTERNS },
  { field: 'amount', pattern: AMOUNT_PATTERNS },
  { field: 'categoryName', pattern: CATEGORY_PATTERNS },
  { field: 'payeeName', pattern: PAYEE_PATTERNS },
  { field: 'memo', pattern: MEMO_PATTERNS },
];

const SPLIT_PATTERNS: PatternEntry[] = [
  { field: 'transactionAt', pattern: DATE_PATTERNS },
  { field: 'description', pattern: DESCRIPTION_PATTERNS },
  { field: 'debitAmount', pattern: DEBIT_PATTERNS },
  { field: 'creditAmount', pattern: CREDIT_PATTERNS },
  { field: 'categoryName', pattern: CATEGORY_PATTERNS },
  { field: 'payeeName', pattern: PAYEE_PATTERNS },
  { field: 'memo', pattern: MEMO_PATTERNS },
];

function detectAmountMode(headers: string[]): 'single' | 'split' {
  const normalized = headers.map((h) => h.trim());
  const hasDebit = normalized.some((h) => DEBIT_PATTERNS.test(h));
  const hasCredit = normalized.some((h) => CREDIT_PATTERNS.test(h));
  return hasDebit && hasCredit ? 'split' : 'single';
}

export function autoDetectMapping(
  headers: string[],
  overrideAmountMode?: 'single' | 'split',
): ColumnMapping {
  const amountMode = overrideAmountMode ?? detectAmountMode(headers);
  const patterns = amountMode === 'split' ? SPLIT_PATTERNS : SINGLE_PATTERNS;
  const mapping: Record<string, TargetField> = {};
  const used = new Set<TargetField>();

  for (const header of headers) {
    const trimmed = header.trim();
    let matched = false;

    for (const { field, pattern } of patterns) {
      if (!used.has(field) && pattern.test(trimmed)) {
        mapping[header] = field;
        used.add(field);
        matched = true;
        break;
      }
    }

    if (!matched) {
      mapping[header] = 'skip';
    }
  }

  return { amountMode, mapping };
}
