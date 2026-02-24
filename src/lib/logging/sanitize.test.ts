// @vitest-environment node

import { sanitizeEvent } from './sanitize';

describe('sanitizeEvent', () => {
  it('returns an empty object for empty input', () => {
    expect(sanitizeEvent({})).toEqual({});
  });

  it('preserves non-sensitive keys', () => {
    const input = { action: 'login', level: 'info', userId: '123' };
    expect(sanitizeEvent(input)).toEqual(input);
  });

  it('redacts top-level sensitive keys', () => {
    const result = sanitizeEvent({
      name: 'visible',
      password: 'hunter2',
      secret: 'shhh',
      token: 'abc123',
    });
    expect(result).toEqual({
      name: 'visible',
      password: '[REDACTED]',
      secret: '[REDACTED]',
      token: '[REDACTED]',
    });
  });

  it('matches sensitive keys case-insensitively', () => {
    const result = sanitizeEvent({
      API_KEY: 'key456',
      ApiKey: 'key123',
      Authorization: 'Bearer xxx',
      COOKIE: 'session=abc',
    });
    expect(result).toEqual({
      API_KEY: '[REDACTED]',
      ApiKey: '[REDACTED]',
      Authorization: '[REDACTED]',
      COOKIE: '[REDACTED]',
    });
  });

  it('recursively sanitizes nested objects', () => {
    const result = sanitizeEvent({
      user: { name: 'Alice', password: 'secret123' },
      meta: { deep: { token: 'xyz', action: 'read' } },
    });
    expect(result).toEqual({
      user: { name: 'Alice', password: '[REDACTED]' },
      meta: { deep: { token: '[REDACTED]', action: 'read' } },
    });
  });

  it('passes arrays through unchanged', () => {
    const input = { tags: ['a', 'b', 'c'], counts: [1, 2, 3] };
    expect(sanitizeEvent(input)).toEqual(input);
  });

  it('handles null values without recursing', () => {
    const input = { data: null, name: 'test' };
    expect(sanitizeEvent(input)).toEqual(input);
  });

  it('preserves primitive value types', () => {
    const input = {
      active: true,
      count: 42,
      label: 'hello',
      missing: undefined,
    };
    expect(sanitizeEvent(input)).toEqual(input);
  });

  it('does not mutate the original object', () => {
    const input = { password: 'secret', safe: 'ok' };
    const copy = { ...input };
    sanitizeEvent(input);
    expect(input).toEqual(copy);
  });
});
