import { expect } from 'vitest';

import { parsePgError } from '@/lib/db/pg-error';

/**
 * Assert that `fn` throws a Postgres constraint error matching the
 * expected code and constraint name.
 */
export async function expectPgError(
  fn: () => Promise<unknown>,
  expected: { code: string; constraint: string },
): Promise<void> {
  let caught: unknown;
  try {
    await fn();
    expect.fail('Expected a Postgres constraint violation');
  } catch (error) {
    caught = error;
  }

  const pg = parsePgError(caught);
  expect(pg).not.toBeNull();
  expect(pg!.code).toBe(expected.code);
  expect(pg!.constraint).toBe(expected.constraint);
}
