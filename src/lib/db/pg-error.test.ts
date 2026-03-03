// @vitest-environment node

import { EvlogError, log } from 'evlog';
import { vi } from 'vitest';

import {
  parsePgError,
  pgErrorFields,
  throwIfConstraintViolation,
} from './pg-error';

/** Helper: call throwIfConstraintViolation and return the thrown EvlogError. */
function catchConstraintError(error: unknown): EvlogError {
  try {
    throwIfConstraintViolation(error, 'test.action');
  } catch (error_) {
    if (error_ instanceof EvlogError) return error_;
    throw error_;
  }
  throw new Error('Expected throwIfConstraintViolation to throw');
}

// ---------------------------------------------------------------------------
// parsePgError
// ---------------------------------------------------------------------------

describe('parsePgError', () => {
  it('returns null for non-objects', () => {
    expect(parsePgError('string')).toBeNull();
    expect(parsePgError(42)).toBeNull();
    expect(parsePgError(null)).toBeNull();
  });

  it('returns null for objects without a code', () => {
    expect(parsePgError({})).toBeNull();
    expect(parsePgError({ message: 'boom' })).toBeNull();
  });

  it('returns null for non-string codes', () => {
    expect(parsePgError({ code: 12_345 })).toBeNull();
  });

  it('returns null for unrelated PG codes', () => {
    expect(parsePgError({ code: '42P01' })).toBeNull();
  });

  it('parses unique violation (23505)', () => {
    const result = parsePgError({
      code: '23505',
      constraint: 'categories_user_name_idx',
      table: 'categories',
    });
    expect(result).toEqual({
      code: '23505',
      constraint: 'categories_user_name_idx',
      table: 'categories',
    });
  });

  it('parses FK violation (23503)', () => {
    const result = parsePgError({
      code: '23503',
      constraint: 'transactions_account_id_fkey',
      table: 'transactions',
    });
    expect(result).toEqual({
      code: '23503',
      constraint: 'transactions_account_id_fkey',
      table: 'transactions',
    });
  });

  it('handles missing optional fields', () => {
    const result = parsePgError({ code: '23505' });
    expect(result).toEqual({
      code: '23505',
      constraint: undefined,
      table: undefined,
    });
  });

  it('unwraps Drizzle wrapper via error.cause', () => {
    const pgError = {
      code: '23505',
      constraint: 'categories_user_name_idx',
      table: 'categories',
    };
    const wrapper = new Error('Drizzle error');
    wrapper.cause = pgError;

    const result = parsePgError(wrapper);
    expect(result).toEqual({
      code: '23505',
      constraint: 'categories_user_name_idx',
      table: 'categories',
    });
  });
});

// ---------------------------------------------------------------------------
// throwIfConstraintViolation
// ---------------------------------------------------------------------------

describe('throwIfConstraintViolation', () => {
  it('no-ops for non-PG errors', () => {
    expect(() =>
      throwIfConstraintViolation(new Error('boom'), 'test.action'),
    ).not.toThrow();
    expect(() => throwIfConstraintViolation(null, 'test.action')).not.toThrow();
  });

  it('throws 409 with specific message for known unique constraint', () => {
    const error = {
      code: '23505',
      constraint: 'categories_user_name_idx',
      table: 'categories',
    };

    const err = catchConstraintError(error);
    expect(err.status).toBe(409);
    expect(err.fix).toBe('A category with this name already exists.');
  });

  it('throws 409 with generic message for unknown unique constraint', () => {
    const err = catchConstraintError({
      code: '23505',
      constraint: 'some_unknown_idx',
    });
    expect(err.status).toBe(409);
    expect(err.fix).toBe('A record with these values already exists.');
  });

  it('throws 409 with generic message when constraint is undefined', () => {
    const err = catchConstraintError({ code: '23505' });
    expect(err.status).toBe(409);
    expect(err.fix).toBe('A record with these values already exists.');
  });

  it('throws 409 for account_terms_account_id_idx', () => {
    const err = catchConstraintError({
      code: '23505',
      constraint: 'account_terms_account_id_idx',
    });
    expect(err.status).toBe(409);
    expect(err.fix).toBe(
      'This account already has terms. Edit existing terms.',
    );
  });

  it('throws 409 for transactions_account_external_id_idx', () => {
    const err = catchConstraintError({
      code: '23505',
      constraint: 'transactions_account_external_id_idx',
    });
    expect(err.status).toBe(409);
    expect(err.fix).toBe('This transaction has already been imported.');
  });

  it('throws 409 for transactions_account_fingerprint_idx', () => {
    const err = catchConstraintError({
      code: '23505',
      constraint: 'transactions_account_fingerprint_idx',
    });
    expect(err.status).toBe(409);
    expect(err.fix).toBe('This transaction has already been imported.');
  });

  it('throws 422 for FK violations', () => {
    const err = catchConstraintError({
      code: '23503',
      constraint: 'transactions_account_id_fkey',
    });
    expect(err.status).toBe(422);
    expect(err.fix).toContain('referenced record');
  });

  it('handles Drizzle-wrapped errors via error.cause', () => {
    const pgError = { code: '23505', constraint: 'categories_user_name_idx' };
    const wrapper = new Error('Drizzle error');
    wrapper.cause = pgError;

    const err = catchConstraintError(wrapper);
    expect(err.status).toBe(409);
    expect(err.fix).toBe('A category with this name already exists.');
  });

  it('passes caller action to log.warn for unique violation', () => {
    const warnSpy = vi.spyOn(log, 'warn').mockImplementation(() => {});
    catchConstraintError({
      code: '23505',
      constraint: 'categories_user_name_idx',
    });
    expect(warnSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'test.action',
        outcome: { success: false },
      }),
    );
    warnSpy.mockRestore();
  });

  it('passes caller action to log.warn for FK violation', () => {
    const warnSpy = vi.spyOn(log, 'warn').mockImplementation(() => {});
    catchConstraintError({
      code: '23503',
      constraint: 'transactions_account_id_fkey',
    });
    expect(warnSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'test.action',
        outcome: { success: false },
      }),
    );
    warnSpy.mockRestore();
  });

  it('includes user.idHash in log.warn when provided', () => {
    const warnSpy = vi.spyOn(log, 'warn').mockImplementation(() => {});
    try {
      throwIfConstraintViolation(
        { code: '23505', constraint: 'categories_user_name_idx' },
        'test.action',
        'hashed-user-id',
      );
    } catch {
      // expected
    }
    expect(warnSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        user: { idHash: 'hashed-user-id' },
      }),
    );
    warnSpy.mockRestore();
  });

  it('omits user field from log.warn when userIdHash not provided', () => {
    const warnSpy = vi.spyOn(log, 'warn').mockImplementation(() => {});
    catchConstraintError({
      code: '23505',
      constraint: 'categories_user_name_idx',
    });
    const callArg = warnSpy.mock.calls[0]?.[0];
    expect(callArg).not.toHaveProperty('user');
    warnSpy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// pgErrorFields
// ---------------------------------------------------------------------------

describe('pgErrorFields', () => {
  it('returns empty object for non-PG errors', () => {
    expect(pgErrorFields(new Error('boom'))).toEqual({});
    expect(pgErrorFields(null)).toEqual({});
  });

  it('returns PG fields for constraint violations', () => {
    const error = {
      code: '23505',
      constraint: 'categories_user_name_idx',
      table: 'categories',
    };
    expect(pgErrorFields(error)).toEqual({
      pgCode: '23505',
      pgConstraint: 'categories_user_name_idx',
      pgTable: 'categories',
    });
  });

  it('returns PG fields for non-constraint PG errors', () => {
    expect(pgErrorFields({ code: '42P01', table: 'missing_table' })).toEqual({
      pgCode: '42P01',
      pgConstraint: undefined,
      pgTable: 'missing_table',
    });
  });

  it('handles missing optional fields', () => {
    expect(pgErrorFields({ code: '23503' })).toEqual({
      pgCode: '23503',
      pgConstraint: undefined,
      pgTable: undefined,
    });
  });

  it('unwraps Drizzle wrapper via error.cause', () => {
    const pgError = {
      code: '23505',
      constraint: 'categories_user_name_idx',
      table: 'categories',
    };
    const wrapper = new Error('Drizzle error');
    wrapper.cause = pgError;

    expect(pgErrorFields(wrapper)).toEqual({
      pgCode: '23505',
      pgConstraint: 'categories_user_name_idx',
      pgTable: 'categories',
    });
  });
});
