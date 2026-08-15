import { and, eq } from 'drizzle-orm';
import { expect } from 'vitest';

import { auditLogs } from '@/db/schema';
import {
  accountBalanceSnapshots,
  accountTerms,
} from '@/modules/accounts/db/schema';
import { createAccountService } from '@/modules/accounts/services/create-account';
import { asDb } from '~test/db';
import { insertUser } from '~test/factories/user.factory';
import { test } from '~test/integration-setup';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function validCreateInput(overrides?: Record<string, unknown>) {
  return {
    currency: 'USD',
    name: 'Test Account',
    type: 'checking' as const,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// createAccountService
// ---------------------------------------------------------------------------

test('create — inserts account with required fields and defaults', async ({
  serviceDb,
}) => {
  const user = await insertUser(serviceDb);

  const result = await createAccountService(
    asDb(serviceDb),
    user.id,
    validCreateInput(),
  );

  expect(result.id).toBeDefined();
  expect(result.name).toBe('Test Account');
  expect(result.currency).toBe('USD');
  expect(result.type).toBe('checking');
  expect(result.status).toBe('active');
  expect(result.userId).toBe(user.id);
});

test('create — inserts terms for credit card', async ({ serviceDb }) => {
  const user = await insertUser(serviceDb);

  const result = await createAccountService(
    asDb(serviceDb),
    user.id,
    validCreateInput({
      terms: { aprBps: 2499, dueDay: 15, statementDay: 20 },
      type: 'credit_card',
    }),
  );

  const [terms] = await serviceDb
    .select()
    .from(accountTerms)
    .where(eq(accountTerms.accountId, result.id));

  expect(terms.aprBps).toBe(2499);
  expect(terms.dueDay).toBe(15);
  expect(terms.statementDay).toBe(20);
});

test('create — inserts initial balance snapshot', async ({ serviceDb }) => {
  const user = await insertUser(serviceDb);

  const result = await createAccountService(
    asDb(serviceDb),
    user.id,
    validCreateInput({ initialBalanceCents: 50_000 }),
  );

  const [snapshot] = await serviceDb
    .select()
    .from(accountBalanceSnapshots)
    .where(eq(accountBalanceSnapshots.accountId, result.id));

  expect(snapshot.balanceCents).toBe(50_000);
  expect(snapshot.source).toBe('manual');
});

test('create — coerces openedAt string to Date', async ({ serviceDb }) => {
  const user = await insertUser(serviceDb);

  const result = await createAccountService(
    asDb(serviceDb),
    user.id,
    validCreateInput({ openedAt: '2024-03-15' }),
  );

  expect(result.openedAt).toBeInstanceOf(Date);
});

test('create — writes audit log entry', async ({ serviceDb }) => {
  const user = await insertUser(serviceDb);

  const result = await createAccountService(
    asDb(serviceDb),
    user.id,
    validCreateInput(),
  );

  const logs = await serviceDb
    .select()
    .from(auditLogs)
    .where(
      and(
        eq(auditLogs.recordId, result.id),
        eq(auditLogs.tableName, 'ledger_accounts'),
        eq(auditLogs.action, 'create'),
      ),
    );

  expect(logs).toHaveLength(1);
  expect(logs[0].actorId).toBe(user.id);
});
