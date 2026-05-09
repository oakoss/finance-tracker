import type { RuleAction } from '@/modules/rules/models';

import {
  DEFAULT_RULE_FORM_VALUES,
  type RuleFormValues,
} from '@/modules/rules/components/rule-form';

type TransactionSeedInput = {
  categoryId: null | string;
  description: string;
  payeeId: null | string;
};

/**
 * Build a `RuleFormValues` seed from a transaction so the rule editor can
 * open prefilled with a contains-match on the description and the
 * transaction's category/payee as default actions.
 */
export function transactionToRuleSeed(
  txn: TransactionSeedInput,
): RuleFormValues {
  const actions: RuleAction[] = [];
  if (txn.categoryId) {
    actions.push({ categoryId: txn.categoryId, kind: 'setCategory' });
  }
  if (txn.payeeId) {
    actions.push({ kind: 'setPayee', payeeId: txn.payeeId });
  }
  return {
    ...DEFAULT_RULE_FORM_VALUES,
    actions,
    match: { kind: 'contains', value: txn.description },
  };
}
