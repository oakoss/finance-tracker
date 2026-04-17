import { expect } from 'vitest';

import {
  foldActions,
  type TransactionBeforeRow,
} from '@/modules/rules/services/fold-actions';

const row = (
  overrides: Partial<TransactionBeforeRow> = {},
): TransactionBeforeRow => ({
  categoryId: null,
  id: 'tx-1',
  memo: null,
  payeeId: null,
  ...overrides,
});

describe('foldActions — setCategory', () => {
  it('records before.categoryId = existing, patch = target', () => {
    const result = foldActions(
      [{ categoryId: 'cat-new', kind: 'setCategory' }],
      row({ categoryId: 'cat-old' }),
    );
    expect(result.before).toStrictEqual({ categoryId: 'cat-old' });
    expect(result.patch).toStrictEqual({ categoryId: 'cat-new' });
  });

  it('skips no-op when row already has target category', () => {
    const result = foldActions(
      [{ categoryId: 'cat-1', kind: 'setCategory' }],
      row({ categoryId: 'cat-1' }),
    );
    expect(result.before).toBeUndefined();
    expect(result.patch).toStrictEqual({});
  });

  it('last write wins; before captures pre-run value only', () => {
    const result = foldActions(
      [
        { categoryId: 'cat-mid', kind: 'setCategory' },
        { categoryId: 'cat-final', kind: 'setCategory' },
      ],
      row({ categoryId: 'cat-orig' }),
    );
    expect(result.before).toStrictEqual({ categoryId: 'cat-orig' });
    expect(result.patch).toStrictEqual({ categoryId: 'cat-final' });
  });

  it('treats round-trip back to original value as a full no-op', () => {
    // [setCategory(B), setCategory(A)] on a row already at A: final value
    // equals original, so no patch, no before, no spurious affected entry.
    const result = foldActions(
      [
        { categoryId: 'cat-B', kind: 'setCategory' },
        { categoryId: 'cat-A', kind: 'setCategory' },
      ],
      row({ categoryId: 'cat-A' }),
    );
    expect(result.before).toBeUndefined();
    expect(result.patch).toStrictEqual({});
  });
});

describe('foldActions — setPayee', () => {
  it('records before.payeeId and patches to target', () => {
    const result = foldActions(
      [{ kind: 'setPayee', payeeId: 'p-new' }],
      row({ payeeId: 'p-old' }),
    );
    expect(result.before).toStrictEqual({ payeeId: 'p-old' });
    expect(result.patch).toStrictEqual({ payeeId: 'p-new' });
  });

  it('skips no-op when payee already matches', () => {
    const result = foldActions(
      [{ kind: 'setPayee', payeeId: 'p-1' }],
      row({ payeeId: 'p-1' }),
    );
    expect(result.before).toBeUndefined();
    expect(result.patch).toStrictEqual({});
  });
});

describe('foldActions — setNote (maps to memo)', () => {
  it('captures before.note = existing memo, patches memo', () => {
    const result = foldActions(
      [{ kind: 'setNote', value: 'imported' }],
      row({ memo: 'prev' }),
    );
    expect(result.before).toStrictEqual({ note: 'prev' });
    expect(result.patch).toStrictEqual({ memo: 'imported' });
  });

  it('skips no-op when memo equals target note', () => {
    const result = foldActions(
      [{ kind: 'setNote', value: 'same' }],
      row({ memo: 'same' }),
    );
    expect(result.before).toBeUndefined();
    expect(result.patch).toStrictEqual({});
  });

  it('captures before.note = null when memo starts null', () => {
    const result = foldActions(
      [{ kind: 'setNote', value: 'new' }],
      row({ memo: null }),
    );
    expect(result.before).toStrictEqual({ note: null });
    expect(result.patch).toStrictEqual({ memo: 'new' });
  });

  it('setNote round-trip back to original memo is a no-op', () => {
    const result = foldActions(
      [
        { kind: 'setNote', value: 'detour' },
        { kind: 'setNote', value: 'orig' },
      ],
      row({ memo: 'orig' }),
    );
    expect(result.before).toBeUndefined();
    expect(result.patch).toStrictEqual({});
  });
});

describe('foldActions — setTags', () => {
  it('append mode collects tagIds under append plan', () => {
    const result = foldActions(
      [{ kind: 'setTags', mode: 'append', tagIds: ['a', 'b'] }],
      row(),
    );
    expect(result.tagPlan).toStrictEqual({
      kind: 'append',
      tagIds: ['a', 'b'],
    });
  });

  it('append with empty tagIds is a no-op', () => {
    const result = foldActions(
      [{ kind: 'setTags', mode: 'append', tagIds: [] }],
      row(),
    );
    expect(result.tagPlan).toStrictEqual({ kind: 'none' });
  });

  it('replace mode carries tagIds under replace plan', () => {
    const result = foldActions(
      [{ kind: 'setTags', mode: 'replace', tagIds: ['x'] }],
      row(),
    );
    expect(result.tagPlan).toStrictEqual({ kind: 'replace', tagIds: ['x'] });
  });

  it('replace overrides earlier append; later append augments replace', () => {
    const result = foldActions(
      [
        { kind: 'setTags', mode: 'append', tagIds: ['a'] },
        { kind: 'setTags', mode: 'replace', tagIds: ['x'] },
        { kind: 'setTags', mode: 'append', tagIds: ['y'] },
      ],
      row(),
    );
    expect(result.tagPlan).toStrictEqual({
      kind: 'replace',
      tagIds: ['x', 'y'],
    });
  });

  it('deduplicates overlapping append ids', () => {
    const result = foldActions(
      [
        { kind: 'setTags', mode: 'append', tagIds: ['a', 'b'] },
        { kind: 'setTags', mode: 'append', tagIds: ['b', 'c'] },
      ],
      row(),
    );
    expect(result.tagPlan).toStrictEqual({
      kind: 'append',
      tagIds: ['a', 'b', 'c'],
    });
  });

  it('deduplicates intra-action tagIds (defense-in-depth)', () => {
    // The validator narrows against duplicates; this covers a corrupt or
    // legacy row that slipped past validation.
    const replaceResult = foldActions(
      [{ kind: 'setTags', mode: 'replace', tagIds: ['a', 'a', 'b'] }],
      row(),
    );
    expect(replaceResult.tagPlan).toStrictEqual({
      kind: 'replace',
      tagIds: ['a', 'b'],
    });

    const appendResult = foldActions(
      [{ kind: 'setTags', mode: 'append', tagIds: ['x', 'x'] }],
      row(),
    );
    expect(appendResult.tagPlan).toStrictEqual({
      kind: 'append',
      tagIds: ['x'],
    });
  });
});

describe('foldActions — mixed', () => {
  it('combines field patch with tag plan', () => {
    const result = foldActions(
      [
        { categoryId: 'cat-1', kind: 'setCategory' },
        { kind: 'setTags', mode: 'append', tagIds: ['t-1'] },
      ],
      row(),
    );
    expect(result.patch).toStrictEqual({ categoryId: 'cat-1' });
    expect(result.tagPlan).toStrictEqual({ kind: 'append', tagIds: ['t-1'] });
  });

  it('all-no-op actions produce empty plan', () => {
    const result = foldActions(
      [
        { categoryId: 'cat-1', kind: 'setCategory' },
        { kind: 'setPayee', payeeId: 'p-1' },
        { kind: 'setNote', value: 'n' },
      ],
      row({ categoryId: 'cat-1', memo: 'n', payeeId: 'p-1' }),
    );
    expect(result.before).toBeUndefined();
    expect(result.patch).toStrictEqual({});
    expect(result.tagPlan).toStrictEqual({ kind: 'none' });
  });
});

describe('foldActions — setExcludedFromBudget', () => {
  it('throws 501 — must be rejected upstream by the apply pipeline', () => {
    expect(() =>
      foldActions([{ kind: 'setExcludedFromBudget', value: true }], row()),
    ).toThrow(/exclude from budget/);
  });
});
