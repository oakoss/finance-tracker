import type {
  LedgerAccount,
  LedgerAccountInsert,
} from '@/modules/accounts/models';
import type { User, UserInsert } from '@/modules/auth/models';
import type { Db } from '~test/factories/base';

import { insertLedgerAccount } from '~test/factories/ledger-account.factory';
import { insertUser } from '~test/factories/user.factory';

type AccountWithUser = {
  account: LedgerAccount;
  user: User;
};

type AccountWithUserOverrides = {
  account?: Omit<Partial<LedgerAccountInsert>, 'userId'>;
  user?: Partial<UserInsert>;
};

export async function insertAccountWithUser(
  db: Db,
  overrides?: AccountWithUserOverrides,
): Promise<AccountWithUser> {
  const user = await insertUser(db, overrides?.user);
  const account = await insertLedgerAccount(db, {
    userId: user.id,
    ...overrides?.account,
  });
  return { account, user };
}
