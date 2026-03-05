import { expect } from 'vitest';

import { accountTerms, creditCardCatalog } from '@/db/schema';
import { throwIfConstraintViolation } from '@/lib/db/pg-error';
import { expectPgError } from '~test/assertions';
import { insertAccountTermsWithAccount } from '~test/factories/account-terms-with-account.factory';
import { insertCreditCardCatalog } from '~test/factories/credit-card-catalog.factory';
import { test } from '~test/integration-setup';

// ---------------------------------------------------------------------------
// DB constraint tests (schema-level, not service-level)
// ---------------------------------------------------------------------------

test('create — rejects duplicate accountTerms for same account', async ({
  db,
}) => {
  const { account, user } = await insertAccountTermsWithAccount(db, {
    account: { type: 'credit_card' },
  });

  await expectPgError(
    () =>
      db.insert(accountTerms).values({
        accountId: account.id,
        aprBps: 1500,
        createdById: user.id,
        dueDay: 1,
        statementDay: 15,
      }),
    { code: '23505', constraint: 'account_terms_account_id_idx' },
  );
});

test('create — throwIfConstraintViolation returns 409 for duplicate terms', async ({
  db,
}) => {
  const { account, user } = await insertAccountTermsWithAccount(db, {
    account: { type: 'credit_card' },
  });

  let caught: unknown;
  try {
    await db.insert(accountTerms).values({
      accountId: account.id,
      aprBps: 1500,
      createdById: user.id,
      dueDay: 1,
      statementDay: 15,
    });
  } catch (error) {
    caught = error;
  }

  if (caught === undefined) {
    expect.fail('Expected a Postgres constraint violation');
  }

  expect(() =>
    throwIfConstraintViolation(caught, 'accountTerms.create'),
  ).toThrow(
    expect.objectContaining({
      fix: 'This account already has terms. Edit existing terms.',
      status: 409,
    }),
  );
});

// ---------------------------------------------------------------------------
// Credit card catalog (no service — simple read)
// ---------------------------------------------------------------------------

test('get-credit-card-catalog — returns sorted by issuer + name', async ({
  db,
}) => {
  await insertCreditCardCatalog(db, { issuer: 'Chase', name: 'Sapphire' });
  await insertCreditCardCatalog(db, { issuer: 'Amex', name: 'Gold' });
  await insertCreditCardCatalog(db, { issuer: 'Chase', name: 'Freedom' });

  const rows = await db
    .select()
    .from(creditCardCatalog)
    .orderBy(creditCardCatalog.issuer, creditCardCatalog.name);

  expect(rows.length).toBeGreaterThanOrEqual(3);
  expect(rows[0].issuer).toBe('Amex');
  expect(rows[1].issuer).toBe('Chase');
  expect(rows[1].name).toBe('Freedom');
  expect(rows[2].name).toBe('Sapphire');
});
