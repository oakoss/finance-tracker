export const TARGET_FIELD_VALUES = [
  'amount',
  'categoryName',
  'creditAmount',
  'debitAmount',
  'description',
  'memo',
  'payeeName',
  'skip',
  'transactionAt',
] as const;

export type TargetField = (typeof TARGET_FIELD_VALUES)[number];
