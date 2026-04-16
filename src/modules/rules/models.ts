import { type } from 'arktype';
import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from 'drizzle-arktype';

import {
  merchantRules,
  payeeAliases,
  recurringRules,
} from '@/modules/rules/db/schema';

// ---------------------------------------------------------------------------
// Match predicate (jsonb on merchant_rules.match)
// ---------------------------------------------------------------------------

const matchPredicateBaseSchema = type({
  'accountId?': 'string > 0',
  'amountMaxCents?': 'number.integer',
  'amountMinCents?': 'number.integer',
  'amountOp?': "'gte' | 'lte' | 'eq' | 'between'",
  'direction?': "'debit' | 'credit' | 'both'",
  kind: "'contains' | 'starts_with' | 'ends_with' | 'exact' | 'regex'",
  value: 'string',
});

export const matchPredicateSchema = matchPredicateBaseSchema.narrow(
  (data, ctx) => {
    const hasMin = data.amountMinCents !== undefined;
    const hasMax = data.amountMaxCents !== undefined;
    const hasOp = data.amountOp !== undefined;

    if ((hasMin || hasMax) && !hasOp) {
      ctx.mustBe('amountOp when amountMinCents or amountMaxCents is set');
      return false;
    }
    if (data.amountOp === 'between' && !(hasMin && hasMax)) {
      ctx.mustBe(
        'both amountMinCents and amountMaxCents when amountOp is "between"',
      );
      return false;
    }
    if (data.amountOp === 'gte' && !hasMin) {
      ctx.mustBe('amountMinCents when amountOp is "gte"');
      return false;
    }
    if (data.amountOp === 'lte' && !hasMax) {
      ctx.mustBe('amountMaxCents when amountOp is "lte"');
      return false;
    }
    if (data.amountOp === 'eq' && hasMin === hasMax) {
      // hasMin === hasMax is true when both are set (contradictory)
      // or both are missing — eq needs exactly one bound.
      ctx.mustBe(
        'exactly one of amountMinCents or amountMaxCents when amountOp is "eq"',
      );
      return false;
    }
    if (hasMin && hasMax && data.amountMinCents! > data.amountMaxCents!) {
      ctx.mustBe('amountMinCents <= amountMaxCents');
      return false;
    }
    return true;
  },
);

export type MatchPredicate = typeof matchPredicateSchema.infer;

// ---------------------------------------------------------------------------
// Rule action tagged union (jsonb on merchant_rules.actions)
//
// setTags semantics:
//   - mode: 'append' with empty tagIds is a no-op (skipped by the engine).
//   - mode: 'replace' with empty tagIds clears all tags on matching
//     transactions. This is an intentional "strip tags" operation.
// ---------------------------------------------------------------------------

const setCategoryActionSchema = type({
  categoryId: 'string > 0',
  kind: "'setCategory'",
});

const setPayeeActionSchema = type({
  kind: "'setPayee'",
  payeeId: 'string > 0',
});

const setTagsActionSchema = type({
  kind: "'setTags'",
  mode: "'replace' | 'append'",
  tagIds: '(string > 0)[]',
});

const setExcludedFromBudgetActionSchema = type({
  kind: "'setExcludedFromBudget'",
  value: 'boolean',
});

const setNoteActionSchema = type({ kind: "'setNote'", value: 'string' });

export const ruleActionSchema = setCategoryActionSchema
  .or(setPayeeActionSchema)
  .or(setTagsActionSchema)
  .or(setExcludedFromBudgetActionSchema)
  .or(setNoteActionSchema);

// Mirrors the DB CHECK constraint `merchant_rules_actions_nonempty_check` —
// keep the at-least-one invariant in sync across both layers.
export const ruleActionsSchema = ruleActionSchema.array().atLeastLength(1);

export type RuleAction = typeof ruleActionSchema.infer;
export type RuleActions = typeof ruleActionsSchema.infer;

// ---------------------------------------------------------------------------
// Drizzle-ArkType CRUD schemas
//
// drizzle-arktype does not read `$type<T>()` when generating column
// schemas, so the JSONB columns on merchantRules come through as
// opaque object/array types. Merge the typed match/action schemas back
// in so callers that validate through the insert/update schemas
// enforce the same shape the rules engine expects on read.
// ---------------------------------------------------------------------------

export const payeeAliasesSelectSchema = createSelectSchema(payeeAliases);
export const payeeAliasesInsertSchema = createInsertSchema(payeeAliases);
export const payeeAliasesUpdateSchema = createUpdateSchema(payeeAliases);
export const payeeAliasesDeleteSchema = payeeAliasesSelectSchema.pick('id');

export type PayeeAlias = typeof payeeAliasesSelectSchema.infer;
export type PayeeAliasInsert = typeof payeeAliasesInsertSchema.infer;

export const recurringRulesSelectSchema = createSelectSchema(recurringRules);
export const recurringRulesInsertSchema = createInsertSchema(recurringRules);
export const recurringRulesUpdateSchema = createUpdateSchema(recurringRules);
export const recurringRulesDeleteSchema = recurringRulesSelectSchema.pick('id');

export type RecurringRule = typeof recurringRulesSelectSchema.infer;
export type RecurringRuleInsert = typeof recurringRulesInsertSchema.infer;

export const merchantRulesSelectSchema = createSelectSchema(
  merchantRules,
).merge({ actions: ruleActionsSchema, match: matchPredicateSchema });
export const merchantRulesInsertSchema = createInsertSchema(
  merchantRules,
).merge({ actions: ruleActionsSchema, match: matchPredicateSchema });
export const merchantRulesUpdateSchema = createUpdateSchema(
  merchantRules,
).merge({ 'actions?': ruleActionsSchema, 'match?': matchPredicateSchema });
export const merchantRulesDeleteSchema = merchantRulesSelectSchema.pick('id');

export type MerchantRule = typeof merchantRulesSelectSchema.infer;
export type MerchantRuleInsert = typeof merchantRulesInsertSchema.infer;
