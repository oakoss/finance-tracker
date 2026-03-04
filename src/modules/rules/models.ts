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

export const merchantRulesSelectSchema = createSelectSchema(merchantRules);
export const merchantRulesInsertSchema = createInsertSchema(merchantRules);
export const merchantRulesUpdateSchema = createUpdateSchema(merchantRules);
export const merchantRulesDeleteSchema = merchantRulesSelectSchema.pick('id');

export type MerchantRule = typeof merchantRulesSelectSchema.infer;
export type MerchantRuleInsert = typeof merchantRulesInsertSchema.infer;
