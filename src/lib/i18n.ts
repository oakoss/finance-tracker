import { getLocale } from '@/paraglide/runtime';

export const defaultCurrency = 'USD';
export const defaultTimeZone = 'UTC';

const numberFormatters = new Map<string, Intl.NumberFormat>();
const dateFormatters = new Map<string, Intl.DateTimeFormat>();
const relativeFormatters = new Map<string, Intl.RelativeTimeFormat>();

const getNumberFormatterKey = (
  locale: string,
  options: Intl.NumberFormatOptions,
) => `${locale}:${JSON.stringify(options)}`;

const getDateFormatterKey = (
  locale: string,
  options: Intl.DateTimeFormatOptions,
) => `${locale}:${JSON.stringify(options)}`;

const getRelativeFormatter = (
  locale: string,
  style: 'long' | 'narrow' | 'short',
) => {
  const key = `${locale}:${style}`;
  const cached = relativeFormatters.get(key);
  if (cached) return cached;
  const formatter = new Intl.RelativeTimeFormat(locale, {
    numeric: 'auto',
    style,
  });
  relativeFormatters.set(key, formatter);
  return formatter;
};

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

export const formatDate = (params: {
  locale?: string;
  timeZone?: string;
  value: Date;
}) => {
  const locale = params.locale ?? getLocale();
  const timeZone = params.timeZone ?? defaultTimeZone;
  const value = params.value;
  const formatter = getDateFormatter(locale, {
    day: '2-digit',
    month: 'short',
    timeZone,
    year: 'numeric',
  });
  return formatter.format(value);
};

export const formatDateTime = (params: {
  locale?: string;
  timeZone?: string;
  value: Date;
}) => {
  const locale = params.locale ?? getLocale();
  const timeZone = params.timeZone ?? defaultTimeZone;
  const value = params.value;
  const formatter = getDateFormatter(locale, {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
    timeZone,
    year: 'numeric',
  });
  return formatter.format(value);
};

export const formatDateTimeFull = (params: {
  locale?: string;
  timeZone?: string;
  value: Date;
}) => {
  const locale = params.locale ?? getLocale();
  const timeZone = params.timeZone ?? defaultTimeZone;
  const value = params.value;
  const formatter = getDateFormatter(locale, {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
    second: '2-digit',
    timeZone,
    year: 'numeric',
  });
  return formatter.format(value);
};

export const formatMonthYear = (params: {
  locale?: string;
  timeZone?: string;
  value: Date;
}) => {
  const locale = params.locale ?? getLocale();
  const timeZone = params.timeZone ?? defaultTimeZone;
  const value = params.value;
  const formatter = getDateFormatter(locale, {
    month: 'long',
    timeZone,
    year: 'numeric',
  });
  return formatter.format(value);
};

const RELATIVE_UNITS: { ms: number; unit: Intl.RelativeTimeFormatUnit }[] = [
  { ms: 31_536_000_000, unit: 'year' },
  { ms: 2_592_000_000, unit: 'month' },
  { ms: 86_400_000, unit: 'day' },
  { ms: 3_600_000, unit: 'hour' },
  { ms: 60_000, unit: 'minute' },
  { ms: 1000, unit: 'second' },
];

export const formatRelativeTime = (params: {
  locale?: string;
  now?: Date;
  style?: 'long' | 'narrow' | 'short';
  value: Date;
}) => {
  const locale = params.locale ?? getLocale();
  const style = params.style ?? 'long';
  const now = params.now ?? new Date();
  const diffMs = params.value.getTime() - now.getTime();
  const absDiff = Math.abs(diffMs);

  for (const { ms, unit } of RELATIVE_UNITS) {
    if (absDiff >= ms) {
      const value = Math.round(diffMs / ms);
      return getRelativeFormatter(locale, style).format(value, unit);
    }
  }

  return getRelativeFormatter(locale, style).format(0, 'second');
};

export const getUserTimeZone = () =>
  Intl.DateTimeFormat().resolvedOptions().timeZone;
