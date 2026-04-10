import { type } from 'arktype';

/**
 * API contract for updating a user's preferences. All fields are
 * required — the form always submits the full set so "unset" is not a
 * valid state. Runtime validation (e.g., verifying the time zone
 * is a recognized IANA zone) lives in the service layer.
 */
export const updateUserPreferencesSchema = type({
  defaultCurrency: /^[A-Z]{3}$/,
  locale: '2 <= string <= 35',
  timeZone: '1 <= string <= 100',
});

export type UpdateUserPreferencesInput =
  typeof updateUserPreferencesSchema.infer;
