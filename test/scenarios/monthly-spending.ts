import { faker } from '@faker-js/faker';

import type {
  categoriesSelectSchema,
  ledgerAccountsSelectSchema,
  payeesSelectSchema,
  transactionsSelectSchema,
  usersSelectSchema,
} from '@/db/schema';

import { type Db, fakeCents } from '~test/factories/base';
import { insertCategory } from '~test/factories/category.factory';
import { insertLedgerAccount } from '~test/factories/ledger-account.factory';
import { insertPayee } from '~test/factories/payee.factory';
import { insertTransaction } from '~test/factories/transaction.factory';
import { insertUser } from '~test/factories/user.factory';

const CATEGORY_NAMES = [
  'Groceries',
  'Dining Out',
  'Transportation',
  'Entertainment',
  'Utilities',
];

const PAYEE_NAMES = ['Whole Foods', 'Shell Gas', 'Netflix'];

type MonthlySpendingContext = {
  account: typeof ledgerAccountsSelectSchema.infer;
  categories: (typeof categoriesSelectSchema.infer)[];
  payees: (typeof payeesSelectSchema.infer)[];
  transactions: (typeof transactionsSelectSchema.infer)[];
  user: typeof usersSelectSchema.infer;
};

export async function createMonthlySpending(
  db: Db,
): Promise<MonthlySpendingContext> {
  const user = await insertUser(db);
  const account = await insertLedgerAccount(db, {
    type: 'checking',
    userId: user.id,
  });

  const cats = await Promise.all(
    CATEGORY_NAMES.map((name) =>
      insertCategory(db, { name, type: 'expense', userId: user.id }),
    ),
  );

  const pays = await Promise.all(
    PAYEE_NAMES.map((name) => insertPayee(db, { name, userId: user.id })),
  );

  const txns: (typeof transactionsSelectSchema.infer)[] = [];
  for (let day = 1; day <= 30; day++) {
    const date = new Date(`2024-06-${String(day).padStart(2, '0')}T12:00:00Z`);
    const txn = await insertTransaction(db, {
      accountId: account.id,
      amountCents: fakeCents(500, 15_000),
      categoryId: faker.helpers.arrayElement(cats).id,
      description: `Day ${day} purchase`,
      payeeId: faker.helpers.arrayElement(pays).id,
      postedAt: date,
      transactionAt: date,
    });
    txns.push(txn);
  }

  return {
    account,
    categories: cats,
    payees: pays,
    transactions: txns,
    user,
  };
}
