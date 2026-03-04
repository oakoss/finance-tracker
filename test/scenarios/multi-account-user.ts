import type { LedgerAccount } from '@/modules/accounts/models';
import type { User } from '@/modules/auth/models';
import type { Db } from '~test/factories/base';

import { insertLedgerAccount } from '~test/factories/ledger-account.factory';
import { insertUser } from '~test/factories/user.factory';

type MultiAccountUserContext = {
  checking: LedgerAccount;
  creditCard: LedgerAccount;
  savings: LedgerAccount;
  user: User;
};

export async function createMultiAccountUser(
  db: Db,
): Promise<MultiAccountUserContext> {
  const user = await insertUser(db);

  const checking = await insertLedgerAccount(db, {
    name: 'Primary Checking',
    type: 'checking',
    userId: user.id,
  });
  const savings = await insertLedgerAccount(db, {
    name: 'High Yield Savings',
    type: 'savings',
    userId: user.id,
  });
  const creditCard = await insertLedgerAccount(db, {
    name: 'Rewards Credit Card',
    type: 'credit_card',
    userId: user.id,
  });

  return { checking, creditCard, savings, user };
}
