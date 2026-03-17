import { faker } from '@faker-js/faker';

import type { LedgerAccount } from '@/modules/accounts/models';
import type { User } from '@/modules/auth/models';
import type { Category } from '@/modules/categories/models';
import type { Payee, Transaction } from '@/modules/transactions/models';

import { categories, payees, transactions } from '@/db/schema';
import { type Db, fakeCents } from '~test/factories/base';
import { insertLedgerAccount } from '~test/factories/ledger-account.factory';
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
  account: LedgerAccount;
  categories: Category[];
  payees: Payee[];
  transactions: Transaction[];
  user: User;
};

export async function createMonthlySpending(
  db: Db,
): Promise<MonthlySpendingContext> {
  const user = await insertUser(db);
  const account = await insertLedgerAccount(db, {
    type: 'checking',
    userId: user.id,
  });

  const cats = await db
    .insert(categories)
    .values(
      CATEGORY_NAMES.map((name) => ({
        name,
        type: 'expense' as const,
        userId: user.id,
      })),
    )
    .returning();

  const pays = await db
    .insert(payees)
    .values(PAYEE_NAMES.map((name) => ({ name, userId: user.id })))
    .returning();

  const txns = await db
    .insert(transactions)
    .values(
      Array.from({ length: 30 }, (_, i) => {
        const day = i + 1;
        const date = new Date(
          `2024-06-${String(day).padStart(2, '0')}T12:00:00Z`,
        );
        return {
          accountId: account.id,
          amountCents: fakeCents(500, 15_000),
          categoryId: faker.helpers.arrayElement(cats).id,
          description: `Day ${day} purchase`,
          payeeId: faker.helpers.arrayElement(pays).id,
          postedAt: date,
          transactionAt: date,
        };
      }),
    )
    .returning();

  return { account, categories: cats, payees: pays, transactions: txns, user };
}
