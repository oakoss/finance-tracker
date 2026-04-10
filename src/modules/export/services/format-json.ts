import type { UserExportData } from '@/modules/export/services/gather-user-data';

type JsonRow = Record<string, unknown>;

const AUDIT_KEYS = new Set([
  'createdById',
  'deletedAt',
  'deletedById',
  'updatedById',
  'userId',
]);

function stripAuditFields(row: JsonRow): JsonRow {
  const clean: JsonRow = {};
  for (const [key, value] of Object.entries(row)) {
    if (!AUDIT_KEYS.has(key)) {
      clean[key] = value;
    }
  }
  return clean;
}

function stripMany(rows: JsonRow[]): JsonRow[] {
  return rows.map((row) => stripAuditFields(row));
}

export function formatJson(data: UserExportData): string {
  const output = {
    accounts: stripMany(data.accounts),
    accountTerms: stripMany(data.accountTerms),
    budgetLines: stripMany(data.budgetLines),
    budgetPeriods: stripMany(data.budgetPeriods),
    categories: stripMany(data.categories),
    debtStrategies: stripMany(data.debtStrategies),
    debtStrategyOrder: stripMany(data.debtStrategyOrder),
    exportedAt: new Date().toISOString(),
    imports: stripMany(data.imports),
    merchantRules: stripMany(data.merchantRules),
    payeeAliases: stripMany(data.payeeAliases),
    payees: stripMany(data.payees),
    preferences: data.preferences ? stripAuditFields(data.preferences) : null,
    recurringRules: stripMany(data.recurringRules),
    splitLines: stripMany(data.splitLines),
    tags: stripMany(data.tags),
    transactions: stripMany(data.transactions),
    transactionTags: stripMany(data.transactionTags),
    transfers: stripMany(data.transfers),
  };

  return JSON.stringify(output, null, 2);
}
