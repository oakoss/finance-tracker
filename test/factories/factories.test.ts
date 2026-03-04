// @vitest-environment node
import { faker } from '@faker-js/faker';

import { fakeCents, fakeDate, fakeId, FAKER_SEED } from '~test/factories/base';
import { createCategory } from '~test/factories/category.factory';
import { createLedgerAccount } from '~test/factories/ledger-account.factory';
import { createPayee } from '~test/factories/payee.factory';
import { createTag } from '~test/factories/tag.factory';
import { createTransactionTag } from '~test/factories/transaction-tag.factory';
import { createTransaction } from '~test/factories/transaction.factory';
import { createTransfer } from '~test/factories/transfer.factory';
import { createUser } from '~test/factories/user.factory';

beforeEach(() => {
  faker.seed(FAKER_SEED);
});

describe('base helpers', () => {
  it('fakeId returns a UUID string', () => {
    const id = fakeId();
    expect(id).toMatch(
      /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/,
    );
  });

  it('fakeDate returns a Date within 2024', () => {
    const date = fakeDate();
    expect(date.getFullYear()).toBe(2024);
  });

  it('fakeCents returns an integer within range', () => {
    const cents = fakeCents(100, 500);
    expect(Number.isInteger(cents)).toBe(true);
    expect(cents).toBeGreaterThanOrEqual(100);
    expect(cents).toBeLessThanOrEqual(500);
  });

  it('seeded faker produces deterministic output', () => {
    const first = fakeId();
    faker.seed(FAKER_SEED);
    const second = fakeId();
    expect(first).toBe(second);
  });
});

describe('createUser', () => {
  it('returns a complete user object', () => {
    const user = createUser();
    expect(user).toHaveProperty('id');
    expect(user).toHaveProperty('email');
    expect(user).toHaveProperty('name');
    expect(user).toHaveProperty('createdAt');
    expect(user).toHaveProperty('updatedAt');
    expect(user).toHaveProperty('emailVerified');
    expect(user).toHaveProperty('image');
  });

  it('applies overrides', () => {
    const user = createUser({ email: 'test@example.com', name: 'Test User' });
    expect(user.email).toBe('test@example.com');
    expect(user.name).toBe('Test User');
  });
});

describe('createLedgerAccount', () => {
  it('returns a complete account object', () => {
    const account = createLedgerAccount();
    expect(account).toHaveProperty('id');
    expect(account).toHaveProperty('name');
    expect(account).toHaveProperty('type');
    expect(account).toHaveProperty('currency');
    expect(account).toHaveProperty('userId');
    expect(account).toHaveProperty('status');
    expect(account).toHaveProperty('ownerType');
  });

  it('applies overrides', () => {
    const account = createLedgerAccount({
      name: 'My Checking',
      type: 'checking',
    });
    expect(account.name).toBe('My Checking');
    expect(account.type).toBe('checking');
  });
});

describe('createCategory', () => {
  it('returns a complete category object', () => {
    const category = createCategory();
    expect(category).toHaveProperty('id');
    expect(category).toHaveProperty('name');
    expect(category).toHaveProperty('type');
    expect(category).toHaveProperty('userId');
    expect(category.parentId).toBeNull();
  });

  it('applies overrides', () => {
    const category = createCategory({ name: 'Custom', type: 'income' });
    expect(category.name).toBe('Custom');
    expect(category.type).toBe('income');
  });
});

describe('createPayee', () => {
  it('returns a complete payee object', () => {
    const payee = createPayee();
    expect(payee).toHaveProperty('id');
    expect(payee).toHaveProperty('name');
    expect(payee).toHaveProperty('userId');
    expect(payee.normalizedName).toBeNull();
  });

  it('applies overrides', () => {
    const payee = createPayee({ name: 'Acme Corp' });
    expect(payee.name).toBe('Acme Corp');
  });
});

describe('createTag', () => {
  it('returns a complete tag object', () => {
    const tag = createTag();
    expect(tag).toHaveProperty('id');
    expect(tag).toHaveProperty('name');
    expect(tag).toHaveProperty('userId');
  });

  it('applies overrides', () => {
    const tag = createTag({ name: 'custom-tag' });
    expect(tag.name).toBe('custom-tag');
  });
});

describe('createTransaction', () => {
  it('returns a complete transaction object', () => {
    const txn = createTransaction();
    expect(txn).toHaveProperty('id');
    expect(txn).toHaveProperty('accountId');
    expect(txn).toHaveProperty('amountCents');
    expect(txn).toHaveProperty('description');
    expect(txn).toHaveProperty('postedAt');
    expect(txn).toHaveProperty('transactionAt');
    expect(txn).toHaveProperty('direction');
    expect(txn.pending).toBe(false);
    expect(txn.categoryId).toBeNull();
    expect(txn.payeeId).toBeNull();
  });

  it('applies overrides', () => {
    const txn = createTransaction({ amountCents: 5000, description: 'Test' });
    expect(txn.amountCents).toBe(5000);
    expect(txn.description).toBe('Test');
  });
});

describe('createTransactionTag', () => {
  it('returns a complete transaction tag object', () => {
    const tt = createTransactionTag();
    expect(tt).toHaveProperty('id');
    expect(tt).toHaveProperty('tagId');
    expect(tt).toHaveProperty('transactionId');
    expect(tt).toHaveProperty('createdAt');
    expect(tt).toHaveProperty('createdById');
    expect(tt.deletedAt).toBeNull();
  });

  it('applies overrides', () => {
    const tagId = fakeId();
    const transactionId = fakeId();
    const tt = createTransactionTag({ tagId, transactionId });
    expect(tt.tagId).toBe(tagId);
    expect(tt.transactionId).toBe(transactionId);
  });
});

describe('createTransfer', () => {
  it('returns a complete transfer object', () => {
    const transfer = createTransfer();
    expect(transfer).toHaveProperty('id');
    expect(transfer).toHaveProperty('userId');
    expect(transfer).toHaveProperty('fromAccountId');
    expect(transfer).toHaveProperty('toAccountId');
    expect(transfer).toHaveProperty('amountCents');
    expect(transfer).toHaveProperty('transferAt');
    expect(transfer.memo).toBeNull();
  });

  it('applies overrides', () => {
    const transfer = createTransfer({ amountCents: 10_000, memo: 'Savings' });
    expect(transfer.amountCents).toBe(10_000);
    expect(transfer.memo).toBe('Savings');
  });
});
