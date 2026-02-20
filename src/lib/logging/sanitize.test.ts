// @vitest-environment node

import { sanitizeEvent } from './sanitize';

describe('sanitizeEvent', () => {
  it('returns an empty object for empty input', () => {
    expect(sanitizeEvent({})).toEqual({});
  });

  it('preserves non-sensitive keys', () => {
    const input = { action: 'login', userId: '123', level: 'info' };
    expect(sanitizeEvent(input)).toEqual(input);
  });

  it('redacts top-level sensitive keys', () => {
    const result = sanitizeEvent({
      password: 'hunter2',
      token: 'abc123',
      secret: 'shhh',
      name: 'visible',
    });
    expect(result).toEqual({
      password: '[REDACTED]',
      token: '[REDACTED]',
      secret: '[REDACTED]',
      name: 'visible',
    });
  });

  it('matches sensitive keys case-insensitively', () => {
    const result = sanitizeEvent({
      Authorization: 'Bearer xxx',
      COOKIE: 'session=abc',
      ApiKey: 'key123',
      API_KEY: 'key456',
    });
    expect(result).toEqual({
      Authorization: '[REDACTED]',
      COOKIE: '[REDACTED]',
      ApiKey: '[REDACTED]',
      API_KEY: '[REDACTED]',
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
      count: 42,
      active: true,
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
