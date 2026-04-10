import type { UserExportData } from '@/modules/export/services/gather-user-data';

type CsvRow = Record<string, string>;

function escapeField(value: string): string {
  let safe = value;

  // Neutralize formula injection: Excel/Sheets interpret leading =, +, -, @
  const first = safe[0];
  if (first === '=' || first === '+' || first === '-' || first === '@') {
    safe = `\t${safe}`;
  }

  if (
    safe.includes(',') ||
    safe.includes('"') ||
    safe.includes('\n') ||
    safe.includes('\r') ||
    safe.includes('\t')
  ) {
    return `"${safe.replaceAll('"', '""')}"`;
  }
  return safe;
}

function centsToDollars(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return '';
  return (cents / 100).toFixed(2);
}

function bpsToPercent(bps: number | null | undefined): string {
  if (bps === null || bps === undefined) return '';
  return (bps / 100).toFixed(2);
}

function iso(date: Date | string | null | undefined): string {
  if (date === null || date === undefined) return '';
  return typeof date === 'string' ? date : date.toISOString();
}

function str(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return '';
  return String(value);
}

function toCsv(headers: string[], rows: CsvRow[]): string {
  const headerLine = headers.map((h) => escapeField(h)).join(',');
  const dataLines = rows.map((row) =>
    headers.map((h) => escapeField(row[h] ?? '')).join(','),
  );
  return [headerLine, ...dataLines].join('\r\n');
}

function buildCategoryLookup(
  data: UserExportData,
): Map<string, { name: string; parentName: string }> {
  const map = new Map<string, { name: string; parentName: string }>();
  for (const cat of data.categories) {
    const parent = cat.parentId
      ? data.categories.find((c) => c.id === cat.parentId)
      : null;
    map.set(cat.id, { name: cat.name, parentName: parent?.name ?? '' });
  }
  return map;
}

export function formatCsv(data: UserExportData): Map<string, string> {
  const files = new Map<string, string>();
  const catLookup = buildCategoryLookup(data);

  // accounts
  files.set(
    'accounts.csv',
    toCsv(
      [
        'id',
        'name',
        'type',
        'ownerType',
        'status',
        'currency',
        'institution',
        'accountNumberMask',
        'openedAt',
        'closedAt',
        'createdAt',
      ],
      data.accounts.map((a) => ({
        accountNumberMask: str(a.accountNumberMask),
        closedAt: iso(a.closedAt),
        createdAt: iso(a.createdAt),
        currency: str(a.currency),
        id: a.id,
        institution: str(a.institution),
        name: a.name,
        openedAt: iso(a.openedAt),
        ownerType: str(a.ownerType),
        status: str(a.status),
        type: str(a.type),
      })),
    ),
  );

  // accountTerms
  files.set(
    'account-terms.csv',
    toCsv(
      [
        'id',
        'accountId',
        'aprPercent',
        'dueDay',
        'statementDay',
        'minPaymentType',
        'minPaymentValue',
        'createdAt',
      ],
      data.accountTerms.map((t) => ({
        accountId: t.accountId,
        aprPercent: bpsToPercent(t.aprBps),
        createdAt: iso(t.createdAt),
        dueDay: str(t.dueDay),
        id: t.id,
        minPaymentType: str(t.minPaymentType),
        minPaymentValue: str(t.minPaymentValue),
        statementDay: str(t.statementDay),
      })),
    ),
  );

  // transactions
  files.set(
    'transactions.csv',
    toCsv(
      [
        'id',
        'accountId',
        'amountCents',
        'amount',
        'balanceCents',
        'balance',
        'currency',
        'description',
        'direction',
        'payeeId',
        'payeeNameRaw',
        'categoryId',
        'categoryName',
        'transferId',
        'isSplit',
        'pending',
        'memo',
        'transactionAt',
        'postedAt',
        'createdAt',
      ],
      data.transactions.map((tx) => {
        const cat = tx.categoryId ? catLookup.get(tx.categoryId) : null;
        return {
          accountId: tx.accountId,
          amount: centsToDollars(tx.amountCents),
          amountCents: str(tx.amountCents),
          balance: centsToDollars(tx.balanceCents),
          balanceCents: str(tx.balanceCents),
          categoryId: str(tx.categoryId),
          categoryName: cat?.name ?? '',
          createdAt: iso(tx.createdAt),
          currency: str(tx.currency),
          description: tx.description,
          direction: str(tx.direction),
          id: tx.id,
          isSplit: str(tx.isSplit),
          memo: str(tx.memo),
          payeeId: str(tx.payeeId),
          payeeNameRaw: str(tx.payeeNameRaw),
          pending: str(tx.pending),
          postedAt: iso(tx.postedAt),
          transactionAt: iso(tx.transactionAt),
          transferId: str(tx.transferId),
        };
      }),
    ),
  );

  // splitLines
  files.set(
    'split-lines.csv',
    toCsv(
      [
        'id',
        'transactionId',
        'sortOrder',
        'amountCents',
        'amount',
        'categoryId',
        'categoryName',
        'memo',
      ],
      data.splitLines.map((s) => {
        const cat = s.categoryId ? catLookup.get(s.categoryId) : null;
        return {
          amount: centsToDollars(s.amountCents),
          amountCents: str(s.amountCents),
          categoryId: str(s.categoryId),
          categoryName: cat?.name ?? '',
          id: s.id,
          memo: str(s.memo),
          sortOrder: str(s.sortOrder),
          transactionId: s.transactionId,
        };
      }),
    ),
  );

  // categories
  files.set(
    'categories.csv',
    toCsv(
      ['id', 'name', 'type', 'parentId', 'parentName', 'createdAt'],
      data.categories.map((c) => {
        const parent = catLookup.get(c.id);
        return {
          createdAt: iso(c.createdAt),
          id: c.id,
          name: c.name,
          parentId: str(c.parentId),
          parentName: parent?.parentName ?? '',
          type: c.type,
        };
      }),
    ),
  );

  // payees
  files.set(
    'payees.csv',
    toCsv(
      ['id', 'name', 'normalizedName', 'createdAt'],
      data.payees.map((p) => ({
        createdAt: iso(p.createdAt),
        id: p.id,
        name: p.name,
        normalizedName: str(p.normalizedName),
      })),
    ),
  );

  // tags
  files.set(
    'tags.csv',
    toCsv(
      ['id', 'name', 'createdAt'],
      data.tags.map((t) => ({
        createdAt: iso(t.createdAt),
        id: t.id,
        name: t.name,
      })),
    ),
  );

  // transactionTags
  files.set(
    'transaction-tags.csv',
    toCsv(
      ['id', 'transactionId', 'tagId'],
      data.transactionTags.map((tt) => ({
        id: tt.id,
        tagId: tt.tagId,
        transactionId: tt.transactionId,
      })),
    ),
  );

  // budgetPeriods
  files.set(
    'budget-periods.csv',
    toCsv(
      ['id', 'year', 'month', 'notes', 'createdAt'],
      data.budgetPeriods.map((bp) => ({
        createdAt: iso(bp.createdAt),
        id: bp.id,
        month: str(bp.month),
        notes: str(bp.notes),
        year: str(bp.year),
      })),
    ),
  );

  // budgetLines
  files.set(
    'budget-lines.csv',
    toCsv(
      [
        'id',
        'budgetPeriodId',
        'categoryId',
        'categoryName',
        'amountCents',
        'amount',
        'notes',
      ],
      data.budgetLines.map((bl) => {
        const cat = bl.categoryId ? catLookup.get(bl.categoryId) : null;
        return {
          amount: centsToDollars(bl.amountCents),
          amountCents: str(bl.amountCents),
          budgetPeriodId: bl.budgetPeriodId,
          categoryId: bl.categoryId,
          categoryName: cat?.name ?? '',
          id: bl.id,
          notes: str(bl.notes),
        };
      }),
    ),
  );

  // payeeAliases
  files.set(
    'payee-aliases.csv',
    toCsv(
      ['id', 'payeeId', 'alias', 'createdAt'],
      data.payeeAliases.map((pa) => ({
        alias: pa.alias,
        createdAt: iso(pa.createdAt),
        id: pa.id,
        payeeId: pa.payeeId,
      })),
    ),
  );

  // merchantRules
  files.set(
    'merchant-rules.csv',
    toCsv(
      [
        'id',
        'matchType',
        'matchValue',
        'categoryId',
        'payeeId',
        'priority',
        'isActive',
        'createdAt',
      ],
      data.merchantRules.map((mr) => ({
        categoryId: str(mr.categoryId),
        createdAt: iso(mr.createdAt),
        id: mr.id,
        isActive: str(mr.isActive),
        matchType: mr.matchType,
        matchValue: mr.matchValue,
        payeeId: str(mr.payeeId),
        priority: str(mr.priority),
      })),
    ),
  );

  // recurringRules
  files.set(
    'recurring-rules.csv',
    toCsv(
      [
        'id',
        'name',
        'interval',
        'description',
        'amountCents',
        'amount',
        'accountId',
        'categoryId',
        'payeeId',
        'nextRunAt',
        'createdAt',
      ],
      data.recurringRules.map((rr) => ({
        accountId: str(rr.accountId),
        amount: centsToDollars(rr.amountCents),
        amountCents: str(rr.amountCents),
        categoryId: str(rr.categoryId),
        createdAt: iso(rr.createdAt),
        description: str(rr.description),
        id: rr.id,
        interval: rr.interval,
        name: rr.name,
        nextRunAt: iso(rr.nextRunAt),
        payeeId: str(rr.payeeId),
      })),
    ),
  );

  // debtStrategies
  files.set(
    'debt-strategies.csv',
    toCsv(
      ['id', 'name', 'strategyType', 'createdAt'],
      data.debtStrategies.map((ds) => ({
        createdAt: iso(ds.createdAt),
        id: ds.id,
        name: ds.name,
        strategyType: ds.strategyType,
      })),
    ),
  );

  // debtStrategyOrder
  files.set(
    'debt-strategy-order.csv',
    toCsv(
      ['id', 'strategyId', 'accountId', 'rank'],
      data.debtStrategyOrder.map((dso) => ({
        accountId: dso.accountId,
        id: dso.id,
        rank: str(dso.rank),
        strategyId: dso.strategyId,
      })),
    ),
  );

  // imports (metadata only)
  files.set(
    'imports.csv',
    toCsv(
      ['id', 'fileName', 'status', 'createdAt'],
      data.imports.map((i) => ({
        createdAt: iso(i.createdAt),
        fileName: str(i.fileName),
        id: i.id,
        status: i.status,
      })),
    ),
  );

  // transfers
  files.set(
    'transfers.csv',
    toCsv(
      [
        'id',
        'fromAccountId',
        'toAccountId',
        'amountCents',
        'amount',
        'memo',
        'transferAt',
        'createdAt',
      ],
      data.transfers.map((t) => ({
        amount: centsToDollars(t.amountCents),
        amountCents: str(t.amountCents),
        createdAt: iso(t.createdAt),
        fromAccountId: t.fromAccountId,
        id: t.id,
        memo: str(t.memo),
        toAccountId: t.toAccountId,
        transferAt: iso(t.transferAt),
      })),
    ),
  );

  // preferences (single row)
  if (data.preferences) {
    const p = data.preferences;
    files.set(
      'preferences.csv',
      toCsv(
        ['locale', 'timeZone', 'defaultCurrency', 'dateFormat', 'numberFormat'],
        [
          {
            dateFormat: str(p.dateFormat),
            defaultCurrency: p.defaultCurrency,
            locale: p.locale,
            numberFormat: str(p.numberFormat),
            timeZone: p.timeZone,
          },
        ],
      ),
    );
  }

  return files;
}
