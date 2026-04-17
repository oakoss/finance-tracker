import { type } from 'arktype';

import { ruleStageEnum } from '@/modules/rules/db/schema';
import {
  matchPredicateSchema,
  merchantRulesDeleteSchema,
  ruleActionsSchema,
} from '@/modules/rules/models';

// `priority` is deliberately not exposed on create/update. It is owned
// by `reorderMerchantRulesService` which assigns dense 0..N-1 atomically
// across a stage. Create auto-appends to the end of the target stage;
// a stage change on update does the same for the destination stage.
export const createMerchantRuleSchema = type({
  actions: ruleActionsSchema,
  'isActive?': 'boolean',
  match: matchPredicateSchema,
  'stage?': type.enumerated(...ruleStageEnum.enumValues),
});

export type CreateMerchantRuleInput = typeof createMerchantRuleSchema.infer;

export const updateMerchantRuleSchema = type({
  'actions?': ruleActionsSchema,
  id: 'string > 0',
  'isActive?': 'boolean',
  'match?': matchPredicateSchema,
  'stage?': type.enumerated(...ruleStageEnum.enumValues),
});

export type UpdateMerchantRuleInput = typeof updateMerchantRuleSchema.infer;

export const reorderMerchantRulesSchema = type({
  orderedIds: '(string > 0)[]',
  stage: type.enumerated(...ruleStageEnum.enumValues),
}).narrow((data, ctx) => {
  if (data.orderedIds.length === 0) {
    ctx.mustBe('a non-empty orderedIds list');
    return false;
  }
  if (new Set(data.orderedIds).size !== data.orderedIds.length) {
    ctx.mustBe('orderedIds without duplicates');
    return false;
  }
  return true;
});

export type ReorderMerchantRulesInput = typeof reorderMerchantRulesSchema.infer;

export const toggleMerchantRuleSchema = type({ id: 'string > 0' });

export type ToggleMerchantRuleInput = typeof toggleMerchantRuleSchema.infer;

export const deleteMerchantRuleSchema = merchantRulesDeleteSchema;

export type DeleteMerchantRuleInput = typeof deleteMerchantRuleSchema.infer;

export const previewApplyMerchantRuleSchema = type({ id: 'string > 0' });

export type PreviewApplyMerchantRuleInput =
  typeof previewApplyMerchantRuleSchema.infer;

// Live preview bypasses the save-draft round-trip for unsaved rules.
export const previewMatchMerchantRuleSchema = matchPredicateSchema;

export type PreviewMatchMerchantRuleInput =
  typeof previewMatchMerchantRuleSchema.infer;

// Cap NOT IN list so huge payloads can't blow the 10s apply timeout.
export const APPLY_MERCHANT_RULE_EXCLUDE_MAX = 5000;

export const applyMerchantRuleSchema = type({
  'excludeTransactionIds?': '(string > 0)[]',
  id: 'string > 0',
}).narrow((data, ctx) => {
  const excludes = data.excludeTransactionIds;
  if (excludes === undefined) return true;
  if (excludes.length > APPLY_MERCHANT_RULE_EXCLUDE_MAX) {
    ctx.mustBe(
      `excludeTransactionIds with at most ${APPLY_MERCHANT_RULE_EXCLUDE_MAX} entries`,
    );
    return false;
  }
  if (new Set(excludes).size !== excludes.length) {
    ctx.mustBe('excludeTransactionIds without duplicates');
    return false;
  }
  return true;
});

export type ApplyMerchantRuleInput = typeof applyMerchantRuleSchema.infer;

export const undoRuleRunSchema = type({ runId: 'string > 0' });

export type UndoRuleRunInput = typeof undoRuleRunSchema.infer;
