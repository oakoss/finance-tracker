// @vitest-environment node

import { vi } from 'vitest';

import { getLocale } from '@/paraglide/runtime';

import {
  defaultCurrency,
  defaultTimeZone,
  formatCurrency,
  formatDate,
  formatDateTime,
  formatMonthYear,
  formatNumber,
} from './i18n';

vi.mock('@/paraglide/runtime', () => ({
  getLocale: vi.fn(() => 'en-US'),
}));

// Widen mock type to accept any locale string (Paraglide types constrain to available locales)
const mockedGetLocale = vi.mocked(getLocale) as unknown as ReturnType<
  typeof vi.fn<() => string>
>;

describe('i18n constants', () => {
  it('has expected defaults', () => {
    expect(defaultCurrency).toBe('USD');
    expect(defaultTimeZone).toBe('UTC');
  });
});

describe('formatCurrency', () => {
  it('formats cents to dollars with default locale and currency', () => {
    const result = formatCurrency({ amountCents: 1299 });
    expect(result).toBe('$12.99');
  });

  it('formats zero cents', () => {
    const result = formatCurrency({ amountCents: 0 });
    expect(result).toBe('$0.00');
  });

  it('formats negative amounts', () => {
    const result = formatCurrency({ amountCents: -500 });
    expect(result).toBe('-$5.00');
  });

  it('respects explicit currency override', () => {
    const result = formatCurrency({ amountCents: 1000, currency: 'EUR' });
    // Intl.NumberFormat with en-US locale and EUR renders the symbol
    expect(result).toContain('10.00');
  });

  it('respects explicit locale override', () => {
    const result = formatCurrency({
      amountCents: 1000,
      locale: 'de-DE',
      currency: 'EUR',
    });
    // German locale uses comma as decimal separator
    expect(result).toContain('10,00');
  });

  it('uses getLocale() when no locale provided', () => {
    mockedGetLocale.mockReturnValue('ja-JP');
    const result = formatCurrency({ amountCents: 100_000, currency: 'JPY' });
    // JPY has no decimal places
    expect(result).toContain('1,000');
    mockedGetLocale.mockReturnValue('en-US');
  });
});

describe('formatNumber', () => {
  it('formats a number with default locale', () => {
    const result = formatNumber({ value: 1234.5 });
    expect(result).toBe('1,234.5');
  });

  it('formats with explicit locale', () => {
    const result = formatNumber({ value: 1234.5, locale: 'de-DE' });
    expect(result).toContain('1.234,5');
  });

  it('applies Intl options', () => {
    const result = formatNumber({
      value: 0.85,
      options: { style: 'percent' },
    });
    expect(result).toBe('85%');
  });

  it('formats zero', () => {
    expect(formatNumber({ value: 0 })).toBe('0');
  });
});

describe('formatDate', () => {
  // Use a fixed date to avoid timezone flakiness
  const date = new Date('2025-06-15T12:00:00Z');

  it('formats a date with default locale and timezone', () => {
    const result = formatDate({ value: date });
    // en-US short month, 2-digit day, numeric year
    expect(result).toBe('Jun 15, 2025');
  });

  it('respects explicit locale', () => {
    const result = formatDate({ value: date, locale: 'de-DE' });
    // German locale uses different month abbreviation
    expect(result).toContain('2025');
    expect(result).toContain('15');
  });

  it('respects timezone', () => {
    // Midnight UTC — should show June 14 in US Pacific (UTC-7 in summer)
    const midnight = new Date('2025-06-15T00:00:00Z');
    const result = formatDate({
      value: midnight,
      timeZone: 'America/Los_Angeles',
    });
    expect(result).toContain('14');
  });
});

describe('formatDateTime', () => {
  const date = new Date('2025-06-15T14:30:00Z');

  it('includes time components', () => {
    const result = formatDateTime({ value: date });
    // Should contain date + time
    expect(result).toContain('Jun');
    expect(result).toContain('15');
    expect(result).toContain('2025');
    expect(result).toContain('2:30');
    expect(result).toContain('PM');
  });

  it('respects timezone for time display', () => {
    const result = formatDateTime({
      value: date,
      timeZone: 'America/New_York',
    });
    // UTC 14:30 = EDT 10:30
    expect(result).toContain('10:30');
    expect(result).toContain('AM');
  });
});

describe('formatMonthYear', () => {
  const date = new Date('2025-12-15T12:00:00Z');

  it('formats month and year only', () => {
    const result = formatMonthYear({ value: date });
    expect(result).toBe('December 2025');
  });

  it('respects locale', () => {
    const result = formatMonthYear({ value: date, locale: 'de-DE' });
    expect(result).toBe('Dezember 2025');
  });

  it('respects timezone for month boundary', () => {
    // Jan 1 UTC midnight — in UTC-8, still December
    const boundary = new Date('2026-01-01T00:00:00Z');
    const result = formatMonthYear({
      value: boundary,
      timeZone: 'America/Los_Angeles',
    });
    expect(result).toContain('December');
    expect(result).toContain('2025');
  });
});

describe('formatter caching', () => {
  it('returns consistent results across repeated calls (cache hit path)', () => {
    const params = { amountCents: 999 };
    const first = formatCurrency(params);
    const second = formatCurrency(params);
    expect(first).toBe(second);
  });
});
