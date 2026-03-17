import { accountTerms } from '@/db/schema';
import { expectPgError } from '~test/assertions';
import { insertAccountTermsWithAccount } from '~test/factories/account-terms-with-account.factory';
import { test } from '~test/integration-setup';

// ---------------------------------------------------------------------------
// DB constraint tests — schema-level, not service-level
// ---------------------------------------------------------------------------

test('accountTerms — rejects duplicate for same account', async ({ db }) => {
  const { account, user } = await insertAccountTermsWithAccount(db, {
    account: { type: 'credit_card' },
  });

  await expectPgError(
    () =>
      db
        .insert(accountTerms)
        .values({
          accountId: account.id,
          aprBps: 1500,
          createdById: user.id,
          dueDay: 1,
          statementDay: 15,
        }),
    { code: '23505', constraint: 'account_terms_account_id_idx' },
  );
});
