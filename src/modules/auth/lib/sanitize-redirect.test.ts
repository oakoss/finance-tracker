// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { sanitizeRedirect } from '@/modules/auth/lib/sanitize-redirect';

describe('sanitizeRedirect', () => {
  it('returns a valid relative path', () => {
    expect(sanitizeRedirect('/dashboard')).toBe('/dashboard');
  });

  it('returns a nested relative path', () => {
    expect(sanitizeRedirect('/accounts/123')).toBe('/accounts/123');
  });

  it('preserves query params and hash', () => {
    expect(sanitizeRedirect('/transactions?page=2#top')).toBe(
      '/transactions?page=2#top',
    );
  });

  it('rejects protocol-relative URL', () => {
    expect(sanitizeRedirect('//evil.com')).toBe('/dashboard');
  });

  it('rejects absolute URL with https', () => {
    expect(sanitizeRedirect('https://evil.com')).toBe('/dashboard');
  });

  it('rejects absolute URL with http', () => {
    expect(sanitizeRedirect('http://evil.com')).toBe('/dashboard');
  });

  it('rejects javascript: protocol', () => {
    expect(sanitizeRedirect('javascript:alert(1)')).toBe('/dashboard');
  });

  it('returns fallback for undefined', () => {
    expect(sanitizeRedirect()).toBe('/dashboard');
  });

  it('returns fallback for empty string', () => {
    expect(sanitizeRedirect('')).toBe('/dashboard');
  });

  it('rejects backslash-prefixed path', () => {
    expect(sanitizeRedirect(String.raw`/\evil.com`)).toBe('/dashboard');
  });

  it('rejects data: URI', () => {
    expect(sanitizeRedirect('data:text/html,<script>alert(1)</script>')).toBe(
      '/dashboard',
    );
  });

  it('rejects redirect with leading whitespace', () => {
    expect(sanitizeRedirect(' /dashboard')).toBe('/dashboard');
  });

  it('accepts custom fallback', () => {
    expect(sanitizeRedirect(undefined, '/')).toBe('/');
  });

  it('uses custom fallback for rejected values', () => {
    expect(sanitizeRedirect('//evil.com', '/')).toBe('/');
  });
});
