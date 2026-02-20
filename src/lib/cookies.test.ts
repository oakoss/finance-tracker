// @vitest-environment node

import {
  appendSetCookieHeaders,
  createClientCookies,
  createServerCookies,
  serializeServerCookie,
  setClientCookie,
  setServerCookie,
} from './cookies';

describe('createClientCookies', () => {
  it('returns a Cookies instance with default path', () => {
    const cookies = createClientCookies();
    expect(cookies).toBeDefined();
    // universal-cookie instances have a get/set interface
    expect(typeof cookies.get).toBe('function');
    expect(typeof cookies.set).toBe('function');
  });
});

describe('createServerCookies', () => {
  it('parses a cookie header string', () => {
    const cookies = createServerCookies('session=abc123; theme=dark');
    expect(cookies.get('session')).toBe('abc123');
    expect(cookies.get('theme')).toBe('dark');
  });

  it('handles null cookie header', () => {
    const cookies = createServerCookies(null);
    expect(cookies.get('anything')).toBeUndefined();
  });

  it('handles undefined cookie header', () => {
    // eslint-disable-next-line unicorn/no-useless-undefined
    const cookies = createServerCookies(undefined);
    expect(cookies.get('anything')).toBeUndefined();
  });

  it('handles empty string cookie header', () => {
    const cookies = createServerCookies('');
    expect(cookies.get('anything')).toBeUndefined();
  });
});

describe('setClientCookie', () => {
  it('does not throw when setting a cookie', () => {
    // In node environment, document.cookie doesn't exist but universal-cookie
    // handles this gracefully
    expect(() => setClientCookie('test', 'value')).not.toThrow();
  });
});

describe('setServerCookie', () => {
  it('returns a Cookies instance with the new value set', () => {
    const cookies = setServerCookie('session=old', 'session', 'new');
    expect(cookies.get('session')).toBe('new');
  });

  it('preserves existing cookies while adding new ones', () => {
    const cookies = setServerCookie('existing=keep', 'added', 'val');
    expect(cookies.get('existing')).toBe('keep');
    expect(cookies.get('added')).toBe('val');
  });
});

describe('serializeServerCookie', () => {
  it('returns an array with one serialized cookie string', () => {
    const result = serializeServerCookie('name', 'value');
    expect(result).toHaveLength(1);
    expect(result[0]).toContain('name=value');
  });

  it('includes path option in serialized string', () => {
    const result = serializeServerCookie('name', 'value', { path: '/app' });
    expect(result[0]).toContain('Path=/app');
  });

  it('includes httpOnly and secure options', () => {
    const result = serializeServerCookie('token', 'secret', {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
    });
    const cookie = result[0];
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('Secure');
    expect(cookie).toContain('SameSite=Strict');
  });

  it('includes maxAge', () => {
    const result = serializeServerCookie('s', 'v', { maxAge: 3600 });
    expect(result[0]).toContain('Max-Age=3600');
  });
});

describe('appendSetCookieHeaders', () => {
  it('appends Set-Cookie headers to a Headers object', () => {
    const headers = new Headers();
    appendSetCookieHeaders(headers, ['a=1', 'b=2']);
    const all = headers.getSetCookie();
    expect(all).toHaveLength(2);
    expect(all).toContain('a=1');
    expect(all).toContain('b=2');
  });

  it('does nothing with empty array', () => {
    const headers = new Headers();
    appendSetCookieHeaders(headers, []);
    expect(headers.getSetCookie()).toHaveLength(0);
  });

  it('preserves existing Set-Cookie headers', () => {
    const headers = new Headers();
    headers.append('Set-Cookie', 'existing=yes');
    appendSetCookieHeaders(headers, ['new=added']);
    const all = headers.getSetCookie();
    expect(all).toHaveLength(2);
    expect(all).toContain('existing=yes');
    expect(all).toContain('new=added');
  });
});
