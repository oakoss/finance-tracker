import { type } from 'arktype';

export const createPayeeSchema = type({ name: '0 < string <= 200' });

export type CreatePayeeInput = typeof createPayeeSchema.infer;

// Bound the raw input as a DoS guard; the real user-facing length
// rule (and the matching DB CHECK) operates on the trimmed value the
// service stores.
export const createPayeeAliasSchema = type({
  alias: '0 < string <= 1000',
  payeeId: 'string > 0',
}).narrow((data, ctx) => {
  const trimmed = data.alias.trim();
  if (trimmed.length === 0) {
    ctx.mustBe('a non-blank alias');
    return false;
  }
  if (trimmed.length > 200) {
    ctx.mustBe('an alias of at most 200 characters');
    return false;
  }
  return true;
});

export type CreatePayeeAliasInput = typeof createPayeeAliasSchema.infer;

export const deletePayeeAliasSchema = type({ id: 'string > 0' });

export type DeletePayeeAliasInput = typeof deletePayeeAliasSchema.infer;

export const listPayeeAliasesSchema = type({ payeeId: 'string > 0' });

export type ListPayeeAliasesInput = typeof listPayeeAliasesSchema.infer;
