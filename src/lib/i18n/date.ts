import { TZDate } from '@date-fns/tz';
import { format, formatDistanceStrict, type Locale } from 'date-fns';
import { de, enUS } from 'date-fns/locale';

import { getLocale } from '@/paraglide/runtime';

export const defaultTimeZone = 'UTC';

const LOCALE_MAP: Record<string, Locale> = { 'de-DE': de, 'en-US': enUS };

function resolveDateFnsLocale(locale?: string): Locale {
  const key = locale ?? getLocale();
  return LOCALE_MAP[key] ?? enUS;
}

// -- Conversion helpers --

export const toISODateString = (date: Date): string =>
  format(date, 'yyyy-MM-dd');

export const todayISODateString = (): string => toISODateString(new Date());

// -- Display formatters --

export const formatDate = (params: {
  locale?: string;
  timeZone?: string;
  value: Date;
}) => {
  const locale = resolveDateFnsLocale(params.locale);
  const timeZone = params.timeZone ?? defaultTimeZone;
  const tzDate = new TZDate(params.value, timeZone);
  return format(tzDate, 'MMM dd, yyyy', { locale });
};

export const formatDateTime = (params: {
  locale?: string;
  timeZone?: string;
  value: Date;
}) => {
  const locale = resolveDateFnsLocale(params.locale);
  const timeZone = params.timeZone ?? defaultTimeZone;
  const tzDate = new TZDate(params.value, timeZone);
  return format(tzDate, 'MMM dd, yyyy, hh:mm a', { locale });
};

export const formatDateTimeFull = (params: {
  locale?: string;
  timeZone?: string;
  value: Date;
}) => {
  const locale = resolveDateFnsLocale(params.locale);
  const timeZone = params.timeZone ?? defaultTimeZone;
  const tzDate = new TZDate(params.value, timeZone);
  return format(tzDate, 'MMM dd, yyyy, hh:mm:ss a', { locale });
};

export const formatMonthYear = (params: {
  locale?: string;
  timeZone?: string;
  value: Date;
}) => {
  const locale = resolveDateFnsLocale(params.locale);
  const timeZone = params.timeZone ?? defaultTimeZone;
  const tzDate = new TZDate(params.value, timeZone);
  return format(tzDate, 'MMMM yyyy', { locale });
};

export const formatRelativeTime = (params: {
  locale?: string;
  now?: Date;
  value: Date;
}) => {
  const locale = resolveDateFnsLocale(params.locale);
  const now = params.now ?? new Date();
  return formatDistanceStrict(params.value, now, { addSuffix: true, locale });
};

export const getUserTimeZone = (): string =>
  Intl.DateTimeFormat().resolvedOptions().timeZone || defaultTimeZone;
