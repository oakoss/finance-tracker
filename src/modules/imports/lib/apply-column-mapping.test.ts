// @vitest-environment node
import { describe, expect, it } from 'vitest';

import {
  applyColumnMapping,
  parseAmountToCents,
} from '@/modules/imports/lib/apply-column-mapping';

describe('parseAmountToCents', () => {
  it('parses a simple positive amount', () => {
    expect(parseAmountToCents('42.99')).toBe(4299);
  });

  it('parses a negative amount', () => {
    expect(parseAmountToCents('-4.50')).toBe(-450);
  });

  it('parses parenthesized negative amount', () => {
    expect(parseAmountToCents('(100.00)')).toBe(-10_000);
  });

  it('strips currency symbols', () => {
    expect(parseAmountToCents('$1,234.56')).toBe(123_456);
  });

  it('handles thousands separators', () => {
    expect(parseAmountToCents('2,500.00')).toBe(250_000);
  });

  it('returns null for empty string', () => {
    expect(parseAmountToCents('')).toBeNull();
  });

  it('returns null for whitespace', () => {
    expect(parseAmountToCents('   ')).toBeNull();
  });

  it('returns null for non-numeric string', () => {
    expect(parseAmountToCents('abc')).toBeNull();
  });

  it('handles zero', () => {
    expect(parseAmountToCents('0.00')).toBe(0);
  });

  it('rounds fractional cents', () => {
    expect(parseAmountToCents('1.999')).toBe(200);
  });

  it('handles whole numbers without decimals', () => {
    expect(parseAmountToCents('50')).toBe(5000);
  });
});

describe('applyColumnMapping — single mode', () => {
  const singleMapping = {
    amountMode: 'single' as const,
    mapping: {
      Amount: 'amount' as const,
      Category: 'categoryName' as const,
      Date: 'transactionAt' as const,
      Description: 'description' as const,
    },
  };

  it('maps all fields from a raw row', () => {
    const raw = {
      Amount: '-4.50',
      Category: 'Food',
      Date: '2024-01-15',
      Description: 'Coffee Shop',
    };

    const result = applyColumnMapping(raw, singleMapping);

    expect(result).toEqual({
      amountCents: -450,
      categoryName: 'Food',
      description: 'Coffee Shop',
      transactionAt: '2024-01-15',
    });
  });

  it('omits empty optional fields', () => {
    const raw = {
      Amount: '100.00',
      Category: '',
      Date: '2024-01-15',
      Description: 'Paycheck',
    };

    const result = applyColumnMapping(raw, singleMapping);

    expect(result.categoryName).toBeUndefined();
  });

  it('handles missing columns gracefully', () => {
    const raw = { Amount: '10.00', Date: '2024-01-15', Description: 'Test' };

    const result = applyColumnMapping(raw, singleMapping);

    expect(result.categoryName).toBeUndefined();
    expect(result.description).toBe('Test');
  });
});

describe('applyColumnMapping — split mode', () => {
  const splitMapping = {
    amountMode: 'split' as const,
    mapping: {
      Credit: 'creditAmount' as const,
      Date: 'transactionAt' as const,
      Debit: 'debitAmount' as const,
      Description: 'description' as const,
    },
  };

  it('treats debit as negative outflow', () => {
    const raw = {
      Credit: '',
      Date: '2024-01-15',
      Debit: '50.00',
      Description: 'Purchase',
    };

    const result = applyColumnMapping(raw, splitMapping);

    expect(result.amountCents).toBe(-5000);
  });

  it('treats credit as positive inflow', () => {
    const raw = {
      Credit: '2500.00',
      Date: '2024-01-16',
      Debit: '',
      Description: 'Deposit',
    };

    const result = applyColumnMapping(raw, splitMapping);

    expect(result.amountCents).toBe(250_000);
  });

  it('keeps debit negative if already negative', () => {
    const raw = {
      Credit: '',
      Date: '2024-01-15',
      Debit: '-50.00',
      Description: 'Return',
    };

    const result = applyColumnMapping(raw, splitMapping);

    expect(result.amountCents).toBe(-5000);
  });

  it('handles both debit and credit empty', () => {
    const raw = {
      Credit: '',
      Date: '2024-01-15',
      Debit: '',
      Description: 'Unknown',
    };

    const result = applyColumnMapping(raw, splitMapping);

    expect(result.amountCents).toBeUndefined();
  });
});

describe('applyColumnMapping — skip columns', () => {
  it('ignores columns mapped to skip', () => {
    const mapping = {
      amountMode: 'single' as const,
      mapping: {
        Amount: 'amount' as const,
        Balance: 'skip' as const,
        Date: 'transactionAt' as const,
        Description: 'description' as const,
      },
    };

    const raw = {
      Amount: '10.00',
      Balance: '5000.00',
      Date: '2024-01-15',
      Description: 'Test',
    };

    const result = applyColumnMapping(raw, mapping);

    expect(result).toEqual({
      amountCents: 1000,
      description: 'Test',
      transactionAt: '2024-01-15',
    });
  });
});
