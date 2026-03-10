import type {
  LedgerAccount,
  LedgerAccountInsert,
} from '@/modules/accounts/models';
import type { User, UserInsert } from '@/modules/auth/models';
import type { Category, CategoryInsert } from '@/modules/categories/models';
import type {
  Payee,
  PayeeInsert,
  Transaction,
  TransactionInsert,
} from '@/modules/transactions/models';

import type { Db } from '~test/factories/base';
import { insertCategory } from '~test/factories/category.factory';
import { insertLedgerAccount } from '~test/factories/ledger-account.factory';
import { insertPayee } from '~test/factories/payee.factory';
import { insertTransaction } from '~test/factories/transaction.factory';
import { insertUser } from '~test/factories/user.factory';

type TransactionWithRelations = {
  account: LedgerAccount;
  category: Category | null;
  payee: Payee | null;
  transaction: Transaction;
  user: User;
};

type TransactionWithRelationsOverrides = {
  account?: Omit<Partial<LedgerAccountInsert>, 'userId'>;
  category?: Omit<Partial<CategoryInsert>, 'userId'>;
  payee?: Omit<Partial<PayeeInsert>, 'userId'>;
  transaction?: Omit<
    Partial<TransactionInsert>,
    'accountId' | 'categoryId' | 'payeeId'
  >;
  user?: Partial<UserInsert>;
  withCategory?: boolean;
  withPayee?: boolean;
};

export async function insertTransactionWithRelations(
  db: Db,
  overrides?: TransactionWithRelationsOverrides,
): Promise<TransactionWithRelations> {
  const {
    account: accountOverrides,
    category: categoryOverrides,
    payee: payeeOverrides,
    transaction: transactionOverrides,
    user: userOverrides,
    withCategory = false,
    withPayee = false,
  } = overrides ?? {};

  const user = await insertUser(db, userOverrides);
  const account = await insertLedgerAccount(db, {
    userId: user.id,
    ...accountOverrides,
  });

  const category = withCategory
    ? await insertCategory(db, { userId: user.id, ...categoryOverrides })
    : null;

  const payee = withPayee
    ? await insertPayee(db, { userId: user.id, ...payeeOverrides })
    : null;

  const transaction = await insertTransaction(db, {
    accountId: account.id,
    categoryId: category?.id ?? null,
    payeeId: payee?.id ?? null,
    ...transactionOverrides,
  });

  return { account, category, payee, transaction, user };
}
