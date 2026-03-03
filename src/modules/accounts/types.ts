import { type } from 'arktype';

import {
  accountOwnerTypeEnum,
  accountStatusEnum,
  accountTypeEnum,
  ledgerAccountsSelectSchema,
} from '@/modules/accounts/db/schema';

const termsSchema = type({
  'aprBps?': 'number.integer | null',
  'dueDay?': 'number.integer | null',
  'minPaymentType?': 'string | null',
  'minPaymentValue?': 'number.integer | null',
  'statementDay?': 'number.integer | null',
});

const dateOrNull = type('string | null')
  .narrow((s, ctx) => {
    if (s === null || s === '') return true;
    return !Number.isNaN(Date.parse(s)) || ctx.mustBe('a valid date string');
  })
  .pipe((s) => (s === '' ? null : s));

const TERMS_TYPES = ['credit_card', 'loan'] as const;

export const createAccountBaseSchema = type({
  'accountNumberMask?': 'string | null',
  currency: 'string > 0',
  'initialBalanceCents?': 'number.integer',
  'institution?': 'string | null',
  name: 'string > 0',
  'openedAt?': dateOrNull,
  'ownerType?': type.enumerated(...accountOwnerTypeEnum.enumValues),
  'terms?': termsSchema,
  type: type.enumerated(...accountTypeEnum.enumValues),
});

export const createAccountSchema = createAccountBaseSchema.narrow(
  (data, ctx) => {
    if (
      data.terms &&
      !TERMS_TYPES.includes(data.type as (typeof TERMS_TYPES)[number])
    ) {
      ctx.mustBe('an account type that supports terms (credit_card or loan)');
      return false;
    }
    return true;
  },
);

export type CreateAccountInput = typeof createAccountSchema.infer;

export const updateAccountBaseSchema = type({
  'accountNumberMask?': 'string | null',
  'currency?': 'string > 0',
  id: 'string > 0',
  'institution?': 'string | null',
  'name?': 'string > 0',
  'openedAt?': dateOrNull,
  'ownerType?': type.enumerated(...accountOwnerTypeEnum.enumValues),
  'status?': type.enumerated(...accountStatusEnum.enumValues),
  'terms?': termsSchema,
  'type?': type.enumerated(...accountTypeEnum.enumValues),
});

export const updateAccountSchema = updateAccountBaseSchema.narrow(
  (data, ctx) => {
    if (
      data.terms &&
      data.type &&
      !TERMS_TYPES.includes(data.type as (typeof TERMS_TYPES)[number])
    ) {
      ctx.mustBe('an account type that supports terms (credit_card or loan)');
      return false;
    }
    return true;
  },
);

export type UpdateAccountInput = typeof updateAccountSchema.infer;

export const deleteAccountSchema = ledgerAccountsSelectSchema.pick('id');

export type DeleteAccountInput = typeof deleteAccountSchema.infer;
