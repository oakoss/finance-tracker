// @vitest-environment node

import { vi } from 'vitest';

import { getLocale } from '@/paraglide/runtime';

import {
  defaultTimeZone,
  formatDate,
  formatDateTime,
  formatDateTimeFull,
  formatMonthYear,
  formatRelativeTime,
  getUserTimeZone,
  todayISODateString,
  toISODateString,
} from './date';

vi.mock('@/paraglide/runtime', () => ({
  getLocale: vi.fn(() => 'en-US'),
}));

const mockedGetLocale = getLocale as unknown as ReturnType<
  typeof vi.fn<() => string>
>;

beforeEach(() => {
  mockedGetLocale.mockReturnValue('en-US');
});

describe('defaultTimeZone', () => {
  it('defaults to UTC', () => {
    expect(defaultTimeZone).toBe('UTC');
  });
});

describe('toISODateString', () => {
  it('pads single-digit month and day', () => {
    expect(toISODateString(new Date(2024, 0, 5))).toBe('2024-01-05');
  });

  it('handles double-digit month and day', () => {
    expect(toISODateString(new Date(2024, 10, 15))).toBe('2024-11-15');
  });

  it('handles December 31', () => {
    expect(toISODateString(new Date(2024, 11, 31))).toBe('2024-12-31');
  });

  it('handles January 1', () => {
    expect(toISODateString(new Date(2025, 0, 1))).toBe('2025-01-01');
  });

  it('handles leap day', () => {
    expect(toISODateString(new Date(2024, 1, 29))).toBe('2024-02-29');
  });
});

describe('todayISODateString', () => {
  it('returns today in YYYY-MM-DD format', () => {
    const result = todayISODateString();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('uses local time, not UTC', () => {
    const result = todayISODateString();
    const now = new Date();
    const expected = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0'),
    ].join('-');
    expect(result).toBe(expected);
  });
});

describe('formatDate', () => {
  const date = new Date('2025-06-15T12:00:00Z');

  it('formats a date with default locale and timezone', () => {
    const result = formatDate({ value: date });
    expect(result).toBe('Jun 15, 2025');
  });

  it('respects explicit locale', () => {
    const result = formatDate({ locale: 'de-DE', value: date });
    expect(result).toContain('2025');
    expect(result).toContain('15');
  });

  it('respects timezone', () => {
    // Midnight UTC — should show June 14 in US Pacific (UTC-7 in summer)
    const midnight = new Date('2025-06-15T00:00:00Z');
    const result = formatDate({
      timeZone: 'America/Los_Angeles',
      value: midnight,
    });
    expect(result).toContain('14');
  });
});

describe('formatDateTime', () => {
  const date = new Date('2025-06-15T14:30:00Z');

  it('includes time components', () => {
    const result = formatDateTime({ value: date });
    expect(result).toContain('Jun');
    expect(result).toContain('15');
    expect(result).toContain('2025');
    expect(result).toContain('2:30');
    expect(result).toContain('PM');
  });

  it('respects timezone for time display', () => {
    const result = formatDateTime({
      timeZone: 'America/New_York',
      value: date,
    });
    // UTC 14:30 = EDT 10:30
    expect(result).toContain('10:30');
    expect(result).toContain('AM');
  });
});

describe('formatDateTimeFull', () => {
  const date = new Date('2025-06-15T14:30:45Z');

  it('includes seconds', () => {
    const result = formatDateTimeFull({ value: date });
    expect(result).toContain('45');
    expect(result).toContain('2:30');
    expect(result).toContain('PM');
  });

  it('respects timezone', () => {
    const result = formatDateTimeFull({
      timeZone: 'America/New_York',
      value: date,
    });
    expect(result).toContain('10:30');
    expect(result).toContain('45');
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
    const result = formatMonthYear({ locale: 'de-DE', value: date });
    expect(result).toBe('Dezember 2025');
  });

  it('respects timezone for month boundary', () => {
    // Jan 1 UTC midnight — in UTC-8, still December
    const boundary = new Date('2026-01-01T00:00:00Z');
    const result = formatMonthYear({
      timeZone: 'America/Los_Angeles',
      value: boundary,
    });
    expect(result).toContain('December');
    expect(result).toContain('2025');
  });
});

describe('formatRelativeTime', () => {
  const now = new Date('2026-02-24T12:00:00Z');

  it('formats seconds ago', () => {
    const value = new Date('2026-02-24T11:59:30Z');
    const result = formatRelativeTime({ now, value });
    expect(result).toContain('30 seconds ago');
  });

  it('formats minutes ago', () => {
    const value = new Date('2026-02-24T11:55:00Z');
    const result = formatRelativeTime({ now, value });
    expect(result).toContain('5 minutes ago');
  });

  it('formats hours ago', () => {
    const value = new Date('2026-02-24T09:00:00Z');
    const result = formatRelativeTime({ now, value });
    expect(result).toContain('3 hours ago');
  });

  it('formats days ago', () => {
    const value = new Date('2026-02-22T12:00:00Z');
    const result = formatRelativeTime({ now, value });
    expect(result).toContain('2 days ago');
  });

  it('formats months ago', () => {
    const value = new Date('2025-12-24T12:00:00Z');
    const result = formatRelativeTime({ now, value });
    expect(result).toContain('2 months ago');
  });

  it('formats years ago', () => {
    const value = new Date('2024-02-24T12:00:00Z');
    const result = formatRelativeTime({ now, value });
    expect(result).toContain('2 years ago');
  });

  it('formats future times', () => {
    const value = new Date('2026-02-24T15:00:00Z');
    const result = formatRelativeTime({ now, value });
    expect(result).toContain('in 3 hours');
  });

  it('handles just now', () => {
    const result = formatRelativeTime({ now, value: now });
    expect(result).toBe('0 seconds ago');
  });

  it('respects locale', () => {
    const value = new Date('2026-02-24T09:00:00Z');
    const result = formatRelativeTime({ locale: 'de-DE', now, value });
    expect(result).toContain('3');
    expect(result).toContain('Stunden');
  });
});

describe('locale fallback', () => {
  it('falls back to en-US for unrecognized locale', () => {
    const result = formatDate({
      locale: 'fr-FR',
      value: new Date('2025-06-15T12:00:00Z'),
    });
    expect(result).toBe('Jun 15, 2025');
  });

  it('uses getLocale() when no locale provided', () => {
    mockedGetLocale.mockReturnValue('de-DE');
    const result = formatMonthYear({ value: new Date('2025-12-15T12:00:00Z') });
    expect(result).toBe('Dezember 2025');
  });
});

describe('getUserTimeZone', () => {
  it('returns a valid IANA timezone string', () => {
    const tz = getUserTimeZone();
    expect(typeof tz).toBe('string');
    expect(tz.length).toBeGreaterThan(0);
  });
});
