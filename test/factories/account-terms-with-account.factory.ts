import type {
  AccountTerms,
  AccountTermsInsert,
  LedgerAccount,
  LedgerAccountInsert,
} from '@/modules/accounts/db/schema';
import type { User, UserInsert } from '@/modules/auth/db/arktype-schemas';
import type { Db } from '~test/factories/base';

import { insertAccountTerms } from '~test/factories/account-terms.factory';
import { insertLedgerAccount } from '~test/factories/ledger-account.factory';
import { insertUser } from '~test/factories/user.factory';

type AccountTermsWithAccount = {
  account: LedgerAccount;
  terms: AccountTerms;
  user: User;
};

type AccountTermsWithAccountOverrides = {
  account?: Omit<Partial<LedgerAccountInsert>, 'userId'>;
  terms?: Omit<Partial<AccountTermsInsert>, 'accountId'>;
  user?: Partial<UserInsert>;
};

export async function insertAccountTermsWithAccount(
  db: Db,
  overrides?: AccountTermsWithAccountOverrides,
): Promise<AccountTermsWithAccount> {
  const user = await insertUser(db, overrides?.user);
  const account = await insertLedgerAccount(db, {
    userId: user.id,
    ...overrides?.account,
  });
  const terms = await insertAccountTerms(db, {
    accountId: account.id,
    ...overrides?.terms,
  });
  return { account, terms, user };
}
