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
