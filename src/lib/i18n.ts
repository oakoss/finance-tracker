import { getLocale } from '@/paraglide/runtime';

export const defaultCurrency = 'USD';
export const defaultTimeZone = 'UTC';

const numberFormatters = new Map<string, Intl.NumberFormat>();
const dateFormatters = new Map<string, Intl.DateTimeFormat>();

const getNumberFormatterKey = (
  locale: string,
  options: Intl.NumberFormatOptions,
) => `${locale}:${JSON.stringify(options)}`;

const getDateFormatterKey = (
  locale: string,
  options: Intl.DateTimeFormatOptions,
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

const getDateFormatter = (
  locale: string,
  options: Intl.DateTimeFormatOptions,
) => {
  const key = getDateFormatterKey(locale, options);
  const cached = dateFormatters.get(key);
  if (cached) return cached;
  const formatter = new Intl.DateTimeFormat(locale, options);
  dateFormatters.set(key, formatter);
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
    style: 'currency',
    currency,
  });
  return formatter.format(amountCents / 100);
};

export const formatNumber = (params: {
  value: number;
  locale?: string;
  options?: Intl.NumberFormatOptions;
}) => {
  const locale = params.locale ?? getLocale();
  const options = params.options ?? {};
  const value = params.value;
  const formatter = getNumberFormatter(locale, options);
  return formatter.format(value);
};

export const formatDate = (params: {
  value: Date;
  locale?: string;
  timeZone?: string;
}) => {
  const locale = params.locale ?? getLocale();
  const timeZone = params.timeZone ?? defaultTimeZone;
  const value = params.value;
  const formatter = getDateFormatter(locale, {
    timeZone,
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  });
  return formatter.format(value);
};

export const formatDateTime = (params: {
  value: Date;
  locale?: string;
  timeZone?: string;
}) => {
  const locale = params.locale ?? getLocale();
  const timeZone = params.timeZone ?? defaultTimeZone;
  const value = params.value;
  const formatter = getDateFormatter(locale, {
    timeZone,
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
  return formatter.format(value);
};

export const formatMonthYear = (params: {
  value: Date;
  locale?: string;
  timeZone?: string;
}) => {
  const locale = params.locale ?? getLocale();
  const timeZone = params.timeZone ?? defaultTimeZone;
  const value = params.value;
  const formatter = getDateFormatter(locale, {
    timeZone,
    year: 'numeric',
    month: 'long',
  });
  return formatter.format(value);
};
