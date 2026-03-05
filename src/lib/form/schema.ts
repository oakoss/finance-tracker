import { type } from 'arktype';

const ISO_DATE_PREFIX = /^\d{4}-\d{2}-\d{2}/;

function isValidDateString(s: string): boolean {
  return ISO_DATE_PREFIX.test(s) && !Number.isNaN(Date.parse(s));
}

/** Required valid date string (non-empty, ISO-8601 prefix, parseable). */
export const dateString = type('string > 0').narrow(
  (s, ctx) => isValidDateString(s) || ctx.mustBe('a valid date string'),
);

/** Optional date string — empty string pipes to null. */
export const dateOrNull = type('string | null')
  .narrow((s, ctx) => {
    if (s === null || s === '') return true;
    return isValidDateString(s) || ctx.mustBe('a valid date string');
  })
  .pipe((s) => (s === '' ? null : s));

const CURRENCY_CODES = new Set(Intl.supportedValuesOf('currency'));

/** ISO 4217 currency code validated against the Intl API. */
export const currencyCode = type('string > 0').narrow(
  (s, ctx) =>
    CURRENCY_CODES.has(s) || ctx.mustBe('a valid ISO 4217 currency code'),
);
