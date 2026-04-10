// @vitest-environment node
import type { UserExportData } from '@/modules/export/services/gather-user-data';

import { formatJson } from '@/modules/export/services/format-json';

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

describe('formatJson', () => {
  it('returns valid JSON with exportedAt timestamp', () => {
    const json = formatJson(emptyExportData());
    const parsed = JSON.parse(json);

    expect(parsed.exportedAt).toBeDefined();
    expect(new Date(parsed.exportedAt).toISOString()).toBe(parsed.exportedAt);
  });

  it('strips audit fields from entities', () => {
    const json = formatJson(
      emptyExportData({
        categories: [
          {
            createdAt: new Date('2024-01-01'),
            createdById: 'should-be-stripped',
            deletedAt: null,
            deletedById: null,
            id: 'cat-1',
            name: 'Food',
            parentId: null,
            type: 'expense',
            updatedAt: new Date('2024-01-01'),
            updatedById: 'should-be-stripped',
            userId: 'should-be-stripped',
          },
        ],
      }),
    );

    const parsed = JSON.parse(json);
    const cat = parsed.categories[0];

    expect(cat.id).toBe('cat-1');
    expect(cat.name).toBe('Food');
    expect(cat.createdAt).toBeDefined();
    expect(cat.updatedAt).toBeDefined();
    expect(cat).not.toHaveProperty('userId');
    expect(cat).not.toHaveProperty('createdById');
    expect(cat).not.toHaveProperty('updatedById');
    expect(cat).not.toHaveProperty('deletedAt');
    expect(cat).not.toHaveProperty('deletedById');
  });

  it('handles preferences: null', () => {
    const parsed = JSON.parse(formatJson(emptyExportData()));

    expect(parsed.preferences).toBeNull();
  });

  it('strips audit fields from preferences', () => {
    const json = formatJson(
      emptyExportData({
        preferences: {
          activeDebtStrategyId: null,
          createdAt: new Date('2024-01-01'),
          createdById: 'strip-me',
          dateFormat: null,
          defaultCurrency: 'USD',
          deletedAt: null,
          deletedById: null,
          locale: 'en-US',
          numberFormat: null,
          onboardingCompletedAt: null,
          timeZone: 'UTC',
          updatedAt: new Date('2024-01-01'),
          updatedById: 'strip-me',
          userId: 'strip-me',
        },
      }),
    );

    const parsed = JSON.parse(json);

    expect(parsed.preferences.locale).toBe('en-US');
    expect(parsed.preferences).not.toHaveProperty('userId');
    expect(parsed.preferences).not.toHaveProperty('createdById');
  });
});
