import { getLocale } from '@/paraglide/runtime';

export const defaultCurrency = 'USD';

const numberFormatters = new Map<string, Intl.NumberFormat>();

const getNumberFormatterKey = (
  locale: string,
  options: Intl.NumberFormatOptions,
) => `${locale}:${JSON.stringify(options)}`;

const getNumberFormatter = (
  locale: string,
  options: Intl.NumberFormatOptions,
) => {
  const key = getNumberFormatterKey(locale, options);
  const cached = numberFormatters.get(key);
  if (cached) return cached;
  const formatter = new Intl.NumberFormat(locale, options);
  numberFormatters.set(key, formatter);
  return formatter;
};

export const formatCurrency = (params: {
  amountCents: number;
  currency?: string;
  locale?: string;
}) => {
  const locale = params.locale ?? getLocale();
  const currency = params.currency ?? defaultCurrency;
  const amountCents = params.amountCents;
  const formatter = getNumberFormatter(locale, {
    currency,
    style: 'currency',
  });
  return formatter.format(amountCents / 100);
};

export const formatNumber = (params: {
  locale?: string;
  options?: Intl.NumberFormatOptions;
  value: number;
}) => {
  const locale = params.locale ?? getLocale();
  const options = params.options ?? {};
  const value = params.value;
  const formatter = getNumberFormatter(locale, options);
  return formatter.format(value);
};
