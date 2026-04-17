import type { RuleAction, RuleRunUndo } from '@/modules/rules/models';

import { createError } from '@/lib/logging/evlog';

export type TransactionBeforeRow = {
  categoryId: null | string;
  id: string;
  memo: null | string;
  payeeId: null | string;
};

type UndoBefore = RuleRunUndo['transactions'][number]['before'];

export type FoldedActions = {
  before: UndoBefore;
  patch: {
    categoryId?: null | string;
    memo?: null | string;
    payeeId?: null | string;
  };
  tagPlan: TagPlan;
};

export type TagPlan =
  | { kind: 'append'; tagIds: string[] }
  | { kind: 'none' }
  | { kind: 'replace'; tagIds: string[] };

export function foldActions(
  actions: RuleAction[],
  row: TransactionBeforeRow,
): FoldedActions {
  const patch: FoldedActions['patch'] = {};
  const before: Record<string, unknown> = {};
  let tagPlan: TagPlan = { kind: 'none' };

  for (const action of actions) {
    switch (action.kind) {
      case 'setCategory': {
        if (
          row.categoryId === action.categoryId &&
          patch.categoryId === undefined
        ) {
          continue;
        }
        if (patch.categoryId === undefined && !('categoryId' in before)) {
          before.categoryId = row.categoryId;
        }
        patch.categoryId = action.categoryId;
        break;
      }
      case 'setExcludedFromBudget': {
        throw createError({
          fix: 'Remove the "exclude from budget" action from this rule. Support is coming soon.',
          message:
            'The "exclude from budget" action is not yet supported at apply time.',
          status: 501,
          why: 'setExcludedFromBudget reached foldActions without being filtered by the apply pipeline.',
        });
      }
      case 'setNote': {
        if (row.memo === action.value && patch.memo === undefined) continue;
        if (patch.memo === undefined && !('note' in before)) {
          before.note = row.memo;
        }
        patch.memo = action.value;
        break;
      }
      case 'setPayee': {
        if (row.payeeId === action.payeeId && patch.payeeId === undefined) {
          continue;
        }
        if (patch.payeeId === undefined && !('payeeId' in before)) {
          before.payeeId = row.payeeId;
        }
        patch.payeeId = action.payeeId;
        break;
      }
      case 'setTags': {
        // Dedupe intra-action tagIds defensively — the validator narrows
        // against this but corrupted/legacy rows could bypass it.
        const actionIds = [...new Set(action.tagIds)];
        if (action.mode === 'replace') {
          tagPlan = { kind: 'replace', tagIds: actionIds };
        } else if (actionIds.length > 0) {
          if (tagPlan.kind === 'replace') {
            tagPlan = {
              kind: 'replace',
              tagIds: [...new Set([...tagPlan.tagIds, ...actionIds])],
            };
          } else if (tagPlan.kind === 'append') {
            tagPlan = {
              kind: 'append',
              tagIds: [...new Set([...tagPlan.tagIds, ...actionIds])],
            };
          } else {
            tagPlan = { kind: 'append', tagIds: actionIds };
          }
        }
        break;
      }
    }
  }

  // Final-value no-op sweep: a sequence like [setCategory(B), setCategory(A)]
  // on a row already at A leaves patch.categoryId === A. Drop the patch and
  // before entries so apply doesn't record a spurious change.
  if (patch.categoryId !== undefined && patch.categoryId === row.categoryId) {
    delete patch.categoryId;
    delete before.categoryId;
  }
  if (patch.payeeId !== undefined && patch.payeeId === row.payeeId) {
    delete patch.payeeId;
    delete before.payeeId;
  }
  if (patch.memo !== undefined && patch.memo === row.memo) {
    delete patch.memo;
    delete before.note;
  }

  return {
    before: Object.keys(before).length > 0 ? (before as UndoBefore) : undefined,
    patch,
    tagPlan,
  };
}
