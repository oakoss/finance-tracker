// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { autoDetectMapping } from '@/modules/imports/lib/auto-detect-mapping';

describe('autoDetectMapping', () => {
  it('detects standard single-amount CSV headers', () => {
    const result = autoDetectMapping(['Date', 'Description', 'Amount']);

    expect(result.amountMode).toBe('single');
    expect(result.mapping).toEqual({
      Amount: 'amount',
      Date: 'transactionAt',
      Description: 'description',
    });
  });

  it('detects split debit/credit mode', () => {
    const result = autoDetectMapping([
      'Date',
      'Description',
      'Debit',
      'Credit',
    ]);

    expect(result.amountMode).toBe('split');
    expect(result.mapping).toEqual({
      Credit: 'creditAmount',
      Date: 'transactionAt',
      Debit: 'debitAmount',
      Description: 'description',
    });
  });

  it('maps category and payee columns', () => {
    const result = autoDetectMapping([
      'Transaction Date',
      'Description',
      'Amount',
      'Category',
      'Payee',
    ]);

    expect(result.mapping.Category).toBe('categoryName');
    expect(result.mapping.Payee).toBe('payeeName');
  });

  it('maps memo/notes column', () => {
    const result = autoDetectMapping(['Date', 'Description', 'Amount', 'Memo']);

    expect(result.mapping.Memo).toBe('memo');
  });

  it('marks unrecognized headers as skip', () => {
    const result = autoDetectMapping([
      'Date',
      'Description',
      'Amount',
      'Balance',
      'Reference Number',
    ]);

    expect(result.mapping.Balance).toBe('skip');
    expect(result.mapping['Reference Number']).toBe('skip');
  });

  it('handles case-insensitive headers', () => {
    const result = autoDetectMapping(['DATE', 'description', 'AMOUNT']);

    expect(result.mapping).toEqual({
      AMOUNT: 'amount',
      DATE: 'transactionAt',
      description: 'description',
    });
  });

  it('handles bank CSV with posted date variant', () => {
    const result = autoDetectMapping([
      'Posted Date',
      'Description',
      'Debit Amount',
      'Credit Amount',
    ]);

    expect(result.amountMode).toBe('split');
    expect(result.mapping['Posted Date']).toBe('transactionAt');
    expect(result.mapping['Debit Amount']).toBe('debitAmount');
    expect(result.mapping['Credit Amount']).toBe('creditAmount');
  });

  it('handles empty headers array', () => {
    const result = autoDetectMapping([]);

    expect(result.amountMode).toBe('single');
    expect(result.mapping).toEqual({});
  });

  it('maps Memo to memo, not description', () => {
    const result = autoDetectMapping(['Date', 'Memo', 'Amount']);

    expect(result.mapping.Memo).toBe('memo');
  });

  it('does not assign the same target field to multiple headers', () => {
    const result = autoDetectMapping([
      'Date',
      'Transaction Date',
      'Description',
      'Amount',
    ]);

    const targetValues = Object.values(result.mapping);
    const nonSkip = targetValues.filter((v) => v !== 'skip');
    expect(new Set(nonSkip).size).toBe(nonSkip.length);
  });

  it('detects money in/out as split mode', () => {
    const result = autoDetectMapping([
      'Date',
      'Description',
      'Money Out',
      'Money In',
    ]);

    expect(result.amountMode).toBe('split');
    expect(result.mapping['Money Out']).toBe('debitAmount');
    expect(result.mapping['Money In']).toBe('creditAmount');
  });
});
