import type { InferSelectModel } from 'drizzle-orm';

import type {
  categories,
  ledgerAccounts,
  payees,
  transactions,
  users,
} from '@/db/schema';
import type { Db } from '~test/factories/base';

import { insertCategory } from '~test/factories/category.factory';
import { insertLedgerAccount } from '~test/factories/ledger-account.factory';
import { insertPayee } from '~test/factories/payee.factory';
import { insertTransaction } from '~test/factories/transaction.factory';
import { insertUser } from '~test/factories/user.factory';

type FullTransactionContext = {
  account: InferSelectModel<typeof ledgerAccounts>;
  category: InferSelectModel<typeof categories>;
  payee: InferSelectModel<typeof payees>;
  transaction: InferSelectModel<typeof transactions>;
  user: InferSelectModel<typeof users>;
};

export async function createFullTransaction(
  db: Db,
): Promise<FullTransactionContext> {
  const user = await insertUser(db);
  const account = await insertLedgerAccount(db, {
    type: 'checking',
    userId: user.id,
  });
  const category = await insertCategory(db, {
    type: 'expense',
    userId: user.id,
  });
  const payee = await insertPayee(db, { userId: user.id });
  const transaction = await insertTransaction(db, {
    accountId: account.id,
    categoryId: category.id,
    payeeId: payee.id,
  });

  return { account, category, payee, transaction, user };
}
