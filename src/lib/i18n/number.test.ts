// @vitest-environment node

import { vi } from 'vitest';

import { getLocale } from '@/paraglide/runtime';

import { defaultCurrency, formatCurrency, formatNumber } from './number';

vi.mock('@/paraglide/runtime', () => ({
  getLocale: vi.fn(() => 'en-US'),
}));

// Widen to accept arbitrary locale strings (Paraglide constrains to available locales)
const mockedGetLocale = getLocale as unknown as ReturnType<
  typeof vi.fn<() => string>
>;

// restoreMocks resets vi.fn(() => 'en-US') to return undefined (not the factory
// default), so we must explicitly set the default before each test.
beforeEach(() => {
  mockedGetLocale.mockReturnValue('en-US');
});

describe('i18n constants', () => {
  it('has expected defaults', () => {
    expect(defaultCurrency).toBe('USD');
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
      currency: 'EUR',
      locale: 'de-DE',
    });
    // German locale uses comma as decimal separator
    expect(result).toContain('10,00');
  });

  it('uses getLocale() when no locale provided', () => {
    mockedGetLocale.mockReturnValue('ja-JP');
    const result = formatCurrency({ amountCents: 100_000, currency: 'JPY' });
    // JPY has no decimal places
    expect(result).toContain('1,000');
  });
});

describe('formatNumber', () => {
  it('formats a number with default locale', () => {
    const result = formatNumber({ value: 1234.5 });
    expect(result).toBe('1,234.5');
  });

  it('formats with explicit locale', () => {
    const result = formatNumber({ locale: 'de-DE', value: 1234.5 });
    expect(result).toContain('1.234,5');
  });

  it('applies Intl options', () => {
    const result = formatNumber({
      options: { style: 'percent' },
      value: 0.85,
    });
    expect(result).toBe('85%');
  });

  it('formats zero', () => {
    expect(formatNumber({ value: 0 })).toBe('0');
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
