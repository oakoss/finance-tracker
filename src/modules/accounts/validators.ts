import { type } from 'arktype';

import { currencyCode, dateOrNull } from '@/lib/form/schema';
import {
  accountMinPaymentTypeEnum,
  accountOwnerTypeEnum,
  accountStatusEnum,
  accountTypeEnum,
} from '@/modules/accounts/db/schema';
import { ledgerAccountsDeleteSchema } from '@/modules/accounts/models';

const termsSchema = type({
  'aprBps?': '0 <= number.integer <= 100000 | null',
  'dueDay?': '1 <= number.integer <= 28 | null',
  'minPaymentType?': type
    .enumerated(...accountMinPaymentTypeEnum.enumValues)
    .or(type('null')),
  'minPaymentValue?': 'number.integer >= 0 | null',
  'statementDay?': '1 <= number.integer <= 28 | null',
}).narrow((data, ctx) => {
  const hasType =
    data.minPaymentType !== null && data.minPaymentType !== undefined;
  const hasValue =
    data.minPaymentValue !== null && data.minPaymentValue !== undefined;
  if (hasType !== hasValue) {
    ctx.mustBe('providing both minPaymentType and minPaymentValue, or neither');
    return false;
  }
  if (
    data.minPaymentType === 'percentage' &&
    data.minPaymentValue !== null &&
    data.minPaymentValue !== undefined &&
    data.minPaymentValue > 10_000
  ) {
    ctx.mustBe('a percentage value of at most 10000 (100%)');
    return false;
  }
  return true;
});

const TERMS_TYPES: ReadonlySet<string> = new Set(['credit_card', 'loan']);

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
    if (data.terms && !TERMS_TYPES.has(data.type)) {
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
    if (data.terms && data.type && !TERMS_TYPES.has(data.type)) {
      ctx.mustBe('an account type that supports terms (credit_card or loan)');
      return false;
    }
    return true;
  },
);

export type UpdateAccountInput = typeof updateAccountSchema.infer;

export const deleteAccountSchema = ledgerAccountsDeleteSchema;

export type DeleteAccountInput = typeof deleteAccountSchema.infer;
