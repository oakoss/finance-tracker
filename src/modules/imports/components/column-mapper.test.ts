import { describe, expect, it } from 'vitest';

import { validateMapping } from '@/modules/imports/components/column-mapper';

describe('validateMapping', () => {
  describe('single amount mode', () => {
    it('returns no errors when all required fields are mapped', () => {
      const result = validateMapping({
        amountMode: 'single',
        mapping: {
          Amount: 'amount',
          Date: 'transactionAt',
          Details: 'description',
        },
      });

      expect(result.errors).toHaveLength(0);
      expect(result.missingFields.size).toBe(0);
      expect(result.duplicateFields.size).toBe(0);
    });

    it('reports missing description', () => {
      const result = validateMapping({
        amountMode: 'single',
        mapping: { Amount: 'amount', Date: 'transactionAt', Details: 'skip' },
      });

      expect(result.errors).toHaveLength(1);
      expect(result.missingFields).toContain('description');
    });

    it('reports missing amount', () => {
      const result = validateMapping({
        amountMode: 'single',
        mapping: { Date: 'transactionAt', Details: 'description' },
      });

      expect(result.errors).toHaveLength(1);
      expect(result.missingFields).toContain('amount');
    });

    it('reports missing transactionAt', () => {
      const result = validateMapping({
        amountMode: 'single',
        mapping: { Amount: 'amount', Details: 'description' },
      });

      expect(result.errors).toHaveLength(1);
      expect(result.missingFields).toContain('transactionAt');
    });

    it('reports all missing fields at once', () => {
      const result = validateMapping({
        amountMode: 'single',
        mapping: { Col1: 'skip', Col2: 'skip' },
      });

      expect(result.errors).toHaveLength(3);
      expect(result.missingFields).toContain('description');
      expect(result.missingFields).toContain('amount');
      expect(result.missingFields).toContain('transactionAt');
    });
  });

  describe('split amount mode', () => {
    it('returns no errors when all required fields are mapped', () => {
      const result = validateMapping({
        amountMode: 'split',
        mapping: {
          Credit: 'creditAmount',
          Date: 'transactionAt',
          Debit: 'debitAmount',
          Details: 'description',
        },
      });

      expect(result.errors).toHaveLength(0);
      expect(result.missingFields.size).toBe(0);
    });

    it('reports missing debitAmount and creditAmount', () => {
      const result = validateMapping({
        amountMode: 'split',
        mapping: { Date: 'transactionAt', Details: 'description' },
      });

      expect(result.missingFields).toContain('debitAmount');
      expect(result.missingFields).toContain('creditAmount');
      expect(result.errors).toHaveLength(2);
    });
  });

  describe('duplicate detection', () => {
    it('reports duplicate field assignments', () => {
      const result = validateMapping({
        amountMode: 'single',
        mapping: {
          Amount: 'amount',
          Date: 'transactionAt',
          Details: 'description',
          Notes: 'description',
        },
      });

      expect(result.duplicateFields).toContain('description');
      expect(result.errors).toHaveLength(1);
    });

    it('does not flag duplicate skip assignments', () => {
      const result = validateMapping({
        amountMode: 'single',
        mapping: {
          Amount: 'amount',
          Balance: 'skip',
          Date: 'transactionAt',
          Details: 'description',
          Extra: 'skip',
        },
      });

      expect(result.duplicateFields.size).toBe(0);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('mixed errors', () => {
    it('reports both missing and duplicate fields', () => {
      const result = validateMapping({
        amountMode: 'single',
        mapping: {
          Col1: 'description',
          Col2: 'description',
          Date: 'transactionAt',
        },
      });

      expect(result.missingFields).toContain('amount');
      expect(result.duplicateFields).toContain('description');
      expect(result.errors).toHaveLength(2);
    });
  });

  describe('optional fields', () => {
    it('does not require optional fields like memo or categoryName', () => {
      const result = validateMapping({
        amountMode: 'single',
        mapping: {
          Amount: 'amount',
          Date: 'transactionAt',
          Details: 'description',
        },
      });

      expect(result.errors).toHaveLength(0);
      expect(result.missingFields.size).toBe(0);
    });
  });
});
