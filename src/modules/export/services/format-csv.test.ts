// @vitest-environment node
import type { UserExportData } from '@/modules/export/services/gather-user-data';

import { formatCsv } from '@/modules/export/services/format-csv';

function emptyExportData(overrides?: Partial<UserExportData>): UserExportData {
  return {
    accounts: [],
    accountTerms: [],
    budgetLines: [],
    budgetPeriods: [],
    categories: [],
    debtStrategies: [],
    debtStrategyOrder: [],
    imports: [],
    merchantRules: [],
    payeeAliases: [],
    payees: [],
    preferences: null,
    recurringRules: [],
    splitLines: [],
    tags: [],
    transactions: [],
    transactionTags: [],
    transfers: [],
    ...overrides,
  };
}

describe('formatCsv', () => {
  it('returns a map with one file per entity', () => {
    const files = formatCsv(emptyExportData());

    expect(files).toBeInstanceOf(Map);
    expect(files.has('accounts.csv')).toBe(true);
    expect(files.has('transactions.csv')).toBe(true);
    expect(files.has('categories.csv')).toBe(true);
    expect(files.has('tags.csv')).toBe(true);
    expect(files.has('transaction-tags.csv')).toBe(true);
  });

  it('omits preferences.csv when preferences is null', () => {
    const files = formatCsv(emptyExportData({ preferences: null }));

    expect(files.has('preferences.csv')).toBe(false);
  });

  it('includes preferences.csv when preferences exist', () => {
    const files = formatCsv(
      emptyExportData({
        preferences: {
          activeDebtStrategyId: null,
          createdAt: new Date('2024-01-01'),
          createdById: null,
          dateFormat: null,
          defaultCurrency: 'USD',
          deletedAt: null,
          deletedById: null,
          locale: 'en-US',
          numberFormat: null,
          onboardingCompletedAt: null,
          timeZone: 'America/New_York',
          updatedAt: new Date('2024-01-01'),
          updatedById: null,
          userId: 'user-1',
        },
      }),
    );

    expect(files.has('preferences.csv')).toBe(true);
    const csv = files.get('preferences.csv')!;
    expect(csv).toContain('en-US');
    expect(csv).toContain('America/New_York');
  });

  it('formats money as both cents and dollars', () => {
    const files = formatCsv(
      emptyExportData({
        transactions: [
          {
            accountId: 'acc-1',
            amountCents: 12_345,
            balanceCents: 99_900,
            categoryId: null,
            createdAt: new Date('2024-06-15'),
            createdById: null,
            currency: 'USD',
            deletedAt: null,
            deletedById: null,
            description: 'Test',
            direction: 'debit',
            externalId: null,
            fingerprint: null,
            id: 'tx-1',
            isSplit: false,
            memo: null,
            payeeId: null,
            payeeNameRaw: null,
            pending: false,
            postedAt: new Date('2024-06-15'),
            transactionAt: new Date('2024-06-15'),
            transferId: null,
            updatedAt: new Date('2024-06-15'),
            updatedById: null,
          },
        ],
      }),
    );

    const csv = files.get('transactions.csv')!;
    expect(csv).toContain('12345');
    expect(csv).toContain('123.45');
    expect(csv).toContain('99900');
    expect(csv).toContain('999.00');
  });

  it('escapes commas and quotes per RFC 4180', () => {
    const files = formatCsv(
      emptyExportData({
        payees: [
          {
            createdAt: new Date('2024-01-01'),
            createdById: null,
            deletedAt: null,
            deletedById: null,
            id: 'p-1',
            name: 'Acme, Inc.',
            normalizedName: null,
            updatedAt: new Date('2024-01-01'),
            updatedById: null,
            userId: 'user-1',
          },
          {
            createdAt: new Date('2024-01-01'),
            createdById: null,
            deletedAt: null,
            deletedById: null,
            id: 'p-2',
            name: 'The "Best" Store',
            normalizedName: null,
            updatedAt: new Date('2024-01-01'),
            updatedById: null,
            userId: 'user-1',
          },
        ],
      }),
    );

    const csv = files.get('payees.csv')!;
    expect(csv).toContain('"Acme, Inc."');
    expect(csv).toContain('"The ""Best"" Store"');
  });

  it('includes sortOrder in split lines', () => {
    const files = formatCsv(
      emptyExportData({
        splitLines: [
          {
            amountCents: 5000,
            categoryId: null,
            id: 'sl-1',
            memo: null,
            sortOrder: 2,
            transactionId: 'tx-1',
          },
        ],
      }),
    );

    const csv = files.get('split-lines.csv')!;
    expect(csv).toContain('sortOrder');
    expect(csv).toContain('2');
  });

  it('denormalizes category parent names', () => {
    const parentCat = {
      createdAt: new Date('2024-01-01'),
      createdById: null,
      deletedAt: null,
      deletedById: null,
      id: 'cat-parent',
      name: 'Housing',
      parentId: null,
      type: 'expense' as const,
      updatedAt: new Date('2024-01-01'),
      updatedById: null,
      userId: 'user-1',
    };
    const childCat = {
      ...parentCat,
      id: 'cat-child',
      name: 'Rent',
      parentId: 'cat-parent',
    };

    const files = formatCsv(
      emptyExportData({ categories: [parentCat, childCat] }),
    );

    const csv = files.get('categories.csv')!;
    const lines = csv.split('\r\n');
    const rentLine = lines.find((l) => l.includes('Rent'));
    expect(rentLine).toContain('Housing');
  });

  it('neutralizes formula injection characters', () => {
    const files = formatCsv(
      emptyExportData({
        payees: [
          {
            createdAt: new Date('2024-01-01'),
            createdById: null,
            deletedAt: null,
            deletedById: null,
            id: 'p-1',
            name: '=SUM(A1:A10)',
            normalizedName: null,
            updatedAt: new Date('2024-01-01'),
            updatedById: null,
            userId: 'user-1',
          },
        ],
      }),
    );

    const csv = files.get('payees.csv')!;
    // Should be tab-prefixed and quoted, not raw =SUM(...)
    expect(csv).not.toContain(',=SUM');
    expect(csv).toContain('\t=SUM');
  });

  it('uses CRLF line endings', () => {
    const files = formatCsv(emptyExportData());
    const csv = files.get('accounts.csv')!;
    expect(csv).not.toContain('\r\n\r\n');
    // Header only for empty data — just one line, no CRLF to split
    expect(csv.includes('\n')).toBe(false);
  });
});
