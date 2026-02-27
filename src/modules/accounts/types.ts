import { type } from 'arktype';

import {
  accountTermsInsertSchema,
  ledgerAccountsInsertSchema,
  ledgerAccountsSelectSchema,
  ledgerAccountsUpdateSchema,
} from '@/modules/accounts/db/schema';

const termsSchema = accountTermsInsertSchema.pick(
  'aprBps',
  'dueDay',
  'minPaymentType',
  'minPaymentValue',
  'statementDay',
);

const dateOrNull = type('string | null')
  .narrow((s, ctx) => {
    if (s === null || s === '') return true;
    return !Number.isNaN(Date.parse(s)) || ctx.mustBe('a valid date string');
  })
  .pipe((s) => (s === '' ? null : s));

const TERMS_TYPES = ['credit_card', 'loan'] as const;

export const createAccountSchema = ledgerAccountsInsertSchema
  .pick(
    'accountNumberMask',
    'currency',
    'institution',
    'name',
    'ownerType',
    'type',
  )
  .merge(
    type({
      currency: 'string > 0',
      'initialBalanceCents?': 'number.integer',
      name: 'string > 0',
      'openedAt?': dateOrNull,
      'terms?': termsSchema,
    }),
  )
  .narrow((data, ctx) => {
    if (
      data.terms &&
      !TERMS_TYPES.includes(data.type as (typeof TERMS_TYPES)[number])
    ) {
      ctx.mustBe('an account type that supports terms (credit_card or loan)');
      return false;
    }
    return true;
  });

export type CreateAccountInput = typeof createAccountSchema.infer;

export const updateAccountSchema = ledgerAccountsUpdateSchema
  .pick(
    'accountNumberMask',
    'currency',
    'institution',
    'name',
    'ownerType',
    'status',
    'type',
  )
  .merge(
    type({
      'currency?': 'string > 0',
      id: 'string > 0',
      'name?': 'string > 0',
      'openedAt?': dateOrNull,
      'terms?': termsSchema,
    }),
  )
  .narrow((data, ctx) => {
    if (
      data.terms &&
      data.type &&
      !TERMS_TYPES.includes(data.type as (typeof TERMS_TYPES)[number])
    ) {
      ctx.mustBe('an account type that supports terms (credit_card or loan)');
      return false;
    }
    return true;
  });

export type UpdateAccountInput = typeof updateAccountSchema.infer;

export const deleteAccountSchema = ledgerAccountsSelectSchema.pick('id');

export type DeleteAccountInput = typeof deleteAccountSchema.infer;
