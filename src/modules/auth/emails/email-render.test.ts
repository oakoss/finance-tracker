// @vitest-environment node

import type { ReactElement } from 'react';

import { render } from 'react-email';
import { vi } from 'vitest';

import { getLocale, setLocale } from '@/paraglide/runtime';

import { renderEmail } from './email-render';

vi.mock('react-email', () => ({
  render: vi.fn((_el: ReactElement, opts?: { plainText?: boolean }) =>
    Promise.resolve(opts?.plainText ? 'plain text' : '<html>rendered</html>'),
  ),
}));

vi.mock('@/paraglide/runtime', () => ({
  baseLocale: 'en-US',
  getLocale: vi.fn(() => 'en-US'),
  setLocale: vi.fn(() => Promise.resolve()),
}));

vi.mock('@/lib/logging/evlog', () => ({
  createError: (opts: { message: string }) => new Error(opts.message),
}));

const mockedGetLocale = getLocale as unknown as ReturnType<
  typeof vi.fn<() => string>
>;
const mockedSetLocale = setLocale as unknown as ReturnType<
  typeof vi.fn<(locale: string) => Promise<void>>
>;
const mockedRender = render as unknown as ReturnType<typeof vi.fn>;

/** Wire setLocale to update getLocale's return value, tracking calls. */
function trackLocaleChanges() {
  const calls: string[] = [];
  mockedSetLocale.mockImplementation((locale: string) => {
    calls.push(locale);
    mockedGetLocale.mockReturnValue(locale);
    return Promise.resolve();
  });
  return calls;
}

beforeEach(() => {
  mockedGetLocale.mockReturnValue('en-US');
});

describe('renderEmail', () => {
  const element = null as unknown as ReactElement;

  it('returns html and text', async () => {
    const result = await renderEmail(element);

    expect(result.html).toBe('<html>rendered</html>');
    expect(result.text).toBe('plain text');
  });

  describe('subject callback', () => {
    it('returns undefined when no callback provided', async () => {
      const result = await renderEmail(element);

      expect(result.subject).toBeUndefined();
    });

    it('returns subject from callback', async () => {
      const result = await renderEmail(element, {
        subject: () => 'Test subject',
      });

      expect(result.subject).toBe('Test subject');
    });

    it('runs callback in target locale', async () => {
      trackLocaleChanges();
      let localeAtCallTime: string | undefined;

      const result = await renderEmail(element, {
        locale: 'de' as ReturnType<typeof getLocale>,
        subject: () => {
          localeAtCallTime = mockedGetLocale();
          return `Subject in ${localeAtCallTime}`;
        },
      });

      expect(localeAtCallTime).toBe('de');
      expect(result.subject).toBe('Subject in de');
    });

    it('runs callback when locale matches current', async () => {
      const result = await renderEmail(element, {
        locale: 'en-US' as ReturnType<typeof getLocale>,
        subject: () => 'Same locale subject',
      });

      expect(result.subject).toBe('Same locale subject');
      expect(mockedSetLocale).not.toHaveBeenCalled();
    });

    it('restores locale when callback throws', async () => {
      const calls = trackLocaleChanges();

      await expect(
        renderEmail(element, {
          locale: 'fr' as ReturnType<typeof getLocale>,
          subject: () => {
            throw new Error('subject boom');
          },
        }),
      ).rejects.toThrow('Email render failed.');

      expect(calls).toEqual(['fr', 'en-US']);
    });
  });

  describe('locale management', () => {
    it('does not call setLocale when locale matches current', async () => {
      await renderEmail(element, {
        locale: 'en-US' as ReturnType<typeof getLocale>,
      });

      expect(mockedSetLocale).not.toHaveBeenCalled();
    });

    it('sets and restores locale when different', async () => {
      const calls = trackLocaleChanges();

      await renderEmail(element, {
        locale: 'fr' as ReturnType<typeof getLocale>,
      });

      expect(calls).toEqual(['fr', 'en-US']);
    });

    it('passes reload: false to setLocale', async () => {
      trackLocaleChanges();

      await renderEmail(element, {
        locale: 'fr' as ReturnType<typeof getLocale>,
      });

      expect(mockedSetLocale).toHaveBeenCalledWith('fr', { reload: false });
      expect(mockedSetLocale).toHaveBeenCalledWith('en-US', { reload: false });
    });

    it('falls back to baseLocale when getLocale returns undefined', async () => {
      mockedGetLocale.mockReturnValue(
        undefined as unknown as ReturnType<typeof getLocale>,
      );
      const calls = trackLocaleChanges();

      await renderEmail(element, {
        locale: 'fr' as ReturnType<typeof getLocale>,
      });

      expect(calls[0]).toBe('fr');
      expect(calls[1]).toBe('en-US');
    });
  });

  describe('error handling', () => {
    it('restores locale when render throws', async () => {
      mockedRender.mockRejectedValueOnce(new Error('render boom'));
      const calls = trackLocaleChanges();

      await expect(
        renderEmail(element, { locale: 'fr' as ReturnType<typeof getLocale> }),
      ).rejects.toThrow('Email render failed.');

      expect(calls).toEqual(['fr', 'en-US']);
    });

    it('throws when initial setLocale fails', async () => {
      mockedSetLocale.mockRejectedValueOnce(new Error('locale boom'));

      await expect(
        renderEmail(element, { locale: 'fr' as ReturnType<typeof getLocale> }),
      ).rejects.toThrow('Failed to set email locale.');
    });

    it('throws when locale restore fails after successful render', async () => {
      mockedSetLocale
        .mockResolvedValueOnce()
        .mockRejectedValueOnce(new Error('reset boom'));

      await expect(
        renderEmail(element, { locale: 'fr' as ReturnType<typeof getLocale> }),
      ).rejects.toThrow('Failed to reset email locale.');
    });

    it('throws compound error when both render and restore fail', async () => {
      mockedRender.mockRejectedValueOnce(new Error('render boom'));
      mockedSetLocale
        .mockResolvedValueOnce()
        .mockRejectedValueOnce(new Error('reset boom'));

      await expect(
        renderEmail(element, { locale: 'fr' as ReturnType<typeof getLocale> }),
      ).rejects.toThrow('Email render failed and locale reset failed.');
    });
  });
});
