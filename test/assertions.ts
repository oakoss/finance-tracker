import { and, eq } from 'drizzle-orm';
import { expect } from 'vitest';

import type { Db } from '~test/factories/base';

import { auditLogs } from '@/db/schema';
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

/**
 * Insert an audit log entry and assert it was written correctly.
 */
export async function expectAuditLogEntry(
  db: Db,
  entry: {
    action: 'create' | 'delete' | 'update';
    actorId: string;
    afterData?: Record<string, unknown>;
    beforeData?: Record<string, unknown>;
    recordId: string;
    tableName: string;
  },
): Promise<void> {
  await db.insert(auditLogs).values(entry);

  const logs = await db
    .select()
    .from(auditLogs)
    .where(
      and(
        eq(auditLogs.recordId, entry.recordId),
        eq(auditLogs.tableName, entry.tableName),
        eq(auditLogs.action, entry.action),
      ),
    );

  expect(logs).toHaveLength(1);
  expect(logs[0].action).toBe(entry.action);
  expect(logs[0].actorId).toBe(entry.actorId);
}
