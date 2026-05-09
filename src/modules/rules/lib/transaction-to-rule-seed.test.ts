import { transactionToRuleSeed } from '@/modules/rules/lib/transaction-to-rule-seed';

type SeedInput = Parameters<typeof transactionToRuleSeed>[0];

function fakeTransaction(overrides: Partial<SeedInput> = {}): SeedInput {
  return {
    categoryId: 'cat-1',
    description: 'WHOLE FOODS',
    payeeId: 'payee-1',
    ...overrides,
  };
}

describe('transactionToRuleSeed', () => {
  it('builds a contains-match on the description', () => {
    const seed = transactionToRuleSeed(fakeTransaction());
    expect(seed.match).toEqual({ kind: 'contains', value: 'WHOLE FOODS' });
  });

  it('emits setCategory + setPayee when both are present', () => {
    const seed = transactionToRuleSeed(fakeTransaction());
    expect(seed.actions).toEqual([
      { categoryId: 'cat-1', kind: 'setCategory' },
      { kind: 'setPayee', payeeId: 'payee-1' },
    ]);
  });

  it('omits action when category is null', () => {
    const seed = transactionToRuleSeed(fakeTransaction({ categoryId: null }));
    expect(seed.actions).toEqual([{ kind: 'setPayee', payeeId: 'payee-1' }]);
  });

  it('omits action when payee is null', () => {
    const seed = transactionToRuleSeed(fakeTransaction({ payeeId: null }));
    expect(seed.actions).toEqual([
      { categoryId: 'cat-1', kind: 'setCategory' },
    ]);
  });

  it('produces an empty actions array when neither category nor payee is set', () => {
    const seed = transactionToRuleSeed(
      fakeTransaction({ categoryId: null, payeeId: null }),
    );
    expect(seed.actions).toEqual([]);
  });

  it('defaults stage to "default" and isActive to true', () => {
    const seed = transactionToRuleSeed(fakeTransaction());
    expect(seed.stage).toBe('default');
    expect(seed.isActive).toBe(true);
  });
});
