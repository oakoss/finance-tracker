import { type } from 'arktype';

import { currencyCode, dateOrNull } from '@/lib/form/schema';
import {
  accountOwnerTypeEnum,
  accountStatusEnum,
  accountTypeEnum,
  ledgerAccountsSelectSchema,
} from '@/modules/accounts/db/schema';

const termsSchema = type({
  'aprBps?': 'number.integer | null',
  'dueDay?': '1 <= number.integer <= 28 | null',
  'minPaymentType?': type.enumerated('percentage', 'fixed').or(type('null')),
  'minPaymentValue?': 'number.integer | null',
  'statementDay?': '1 <= number.integer <= 28 | null',
});

const TERMS_TYPES = ['credit_card', 'loan'] as const;

export const createAccountBaseSchema = type({
  'accountNumberMask?': 'string | null',
  currency: currencyCode,
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
  'currency?': currencyCode,
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
