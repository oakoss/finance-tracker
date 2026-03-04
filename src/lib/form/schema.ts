import { type } from 'arktype';

/** Required valid date string (non-empty, parseable by `Date.parse`). */
export const dateString = type('string > 0').narrow(
  (s, ctx) => !Number.isNaN(Date.parse(s)) || ctx.mustBe('a valid date string'),
);

/** Optional date string — empty string pipes to null. */
export const dateOrNull = type('string | null')
  .narrow((s, ctx) => {
    if (s === null || s === '') return true;
    return !Number.isNaN(Date.parse(s)) || ctx.mustBe('a valid date string');
  })
  .pipe((s) => (s === '' ? null : s));

const CURRENCY_CODES = new Set(Intl.supportedValuesOf('currency'));

/** ISO 4217 currency code validated against the Intl API. */
export const currencyCode = type('string > 0').narrow(
  (s, ctx) =>
    CURRENCY_CODES.has(s) || ctx.mustBe('a valid ISO 4217 currency code'),
);
