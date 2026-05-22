// @vitest-environment node

import {
  type CsrfMiddlewareOptions,
  isCsrfRequestAllowed,
} from '@tanstack/react-start';

import { log } from '@/lib/logging/evlog';
import {
  __resetAllowedOriginsCacheForTests,
  csrfMiddlewareOptions,
  parseTrustedOrigins,
} from '@/lib/start/csrf';

// Hoisted to module top by vitest — production reads ENV.TRUSTED_ORIGINS
// from the mocked module, so allow-list assertions are independent of the
// developer's `.env.local` PORT setting.
vi.mock('varlock/env', () => ({
  ENV: { TRUSTED_ORIGINS: 'http://localhost:3000' },
}));

// Derive the test fixture context shape from the framework's middleware
// surface so a framework rename (`request` -> `req`, etc.) fails the
// compile here rather than passing tests against stale shapes.
type CsrfFailureFn = Extract<
  CsrfMiddlewareOptions['failureResponse'],
  (...args: never[]) => unknown
>;
type FrameworkCtx = Parameters<CsrfFailureFn>[0];
type TestCtx = Pick<FrameworkCtx, 'request'> & { handlerType: 'serverFn' };

function buildCtx(url: string, headers: Record<string, string> = {}): TestCtx {
  return {
    handlerType: 'serverFn',
    request: new Request(url, { headers, method: 'POST' }),
  };
}

beforeEach(() => {
  __resetAllowedOriginsCacheForTests();
});

describe('parseTrustedOrigins', () => {
  it('parses a single canonical origin', () => {
    expect(parseTrustedOrigins('https://app.example')).toEqual([
      'https://app.example',
    ]);
  });

  it('splits comma-separated origins', () => {
    expect(parseTrustedOrigins('https://a.example,https://b.example')).toEqual([
      'https://a.example',
      'https://b.example',
    ]);
  });

  it('trims surrounding whitespace', () => {
    expect(
      parseTrustedOrigins('  https://a.example , https://b.example  '),
    ).toEqual(['https://a.example', 'https://b.example']);
  });

  it('drops empty entries from trailing or repeated commas', () => {
    expect(parseTrustedOrigins('https://a.example,,')).toEqual([
      'https://a.example',
    ]);
  });

  it('throws when the input is blank', () => {
    expect(() => parseTrustedOrigins('   ')).toThrow(/empty allow-list/);
  });

  it('throws when an entry is not a parseable URL', () => {
    expect(() => parseTrustedOrigins('not-a-url')).toThrow(/invalid URL/);
  });

  it('throws when an entry uses a non-web scheme', () => {
    expect(() => parseTrustedOrigins('ftp://x.example')).toThrow(
      /must use http:\/\/ or https:\/\//,
    );
  });

  it('rejects opaque-origin schemes with the scheme-specific message', () => {
    expect(() => parseTrustedOrigins('htp://bad')).toThrow(
      /must use http:\/\/ or https:\/\//,
    );
  });

  it('normalizes mixed-case scheme and host to lowercase', () => {
    expect(parseTrustedOrigins('HTTPS://APP.EXAMPLE')).toEqual([
      'https://app.example',
    ]);
  });

  it('normalizes a trailing slash to the canonical origin', () => {
    expect(parseTrustedOrigins('https://app.example/')).toEqual([
      'https://app.example',
    ]);
  });

  it('strips path/query/fragment to canonical origin', () => {
    expect(parseTrustedOrigins('https://app.example/login?x=1#frag')).toEqual([
      'https://app.example',
    ]);
  });

  it('strips a default port when normalizing', () => {
    expect(parseTrustedOrigins('https://app.example:443')).toEqual([
      'https://app.example',
    ]);
  });
});

describe('csrfMiddlewareOptions.filter', () => {
  it('runs CSRF validation only for serverFn requests', () => {
    expect(
      csrfMiddlewareOptions.filter({ handlerType: 'serverFn' } as never),
    ).toBe(true);
    expect(
      csrfMiddlewareOptions.filter({ handlerType: 'router' } as never),
    ).toBe(false);
  });
});

describe('csrfMiddlewareOptions.failureResponse', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(log, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('logs the rejection with full forensic context and returns a 403', async () => {
    const ctx = buildCtx('https://app.example/_serverFn/x?q=1', {
      origin: 'https://evil.example',
      referer: 'https://evil.example/page',
      'sec-fetch-site': 'cross-site',
      'user-agent': 'Mozilla/5.0 test',
    });

    const response = csrfMiddlewareOptions.failureResponse(ctx as never);

    expect(response).toBeInstanceOf(Response);
    expect(response.status).toBe(403);
    expect(await response.text()).toBe('Forbidden');
    expect(warnSpy).toHaveBeenCalledWith({
      action: 'csrf.rejected',
      outcome: {
        method: 'POST',
        origin: 'https://evil.example',
        path: '/_serverFn/x',
        referer: 'https://evil.example/page',
        secFetchSite: 'cross-site',
        success: false,
        userAgent: 'Mozilla/5.0 test',
      },
    });
  });

  it('emits null fields when the rejected request omits headers', () => {
    const ctx = buildCtx('https://app.example/_serverFn/x');

    csrfMiddlewareOptions.failureResponse(ctx as never);

    expect(warnSpy).toHaveBeenCalledWith({
      action: 'csrf.rejected',
      outcome: {
        method: 'POST',
        origin: null,
        path: '/_serverFn/x',
        referer: null,
        secFetchSite: null,
        success: false,
        userAgent: null,
      },
    });
  });

  it('writes a stderr trace and still returns 403 when the logger throws', () => {
    warnSpy.mockImplementation(() => {
      throw new Error('logger broken');
    });
    const stderrSpy = vi
      .spyOn(process.stderr, 'write')
      .mockImplementation(() => true);
    const ctx = buildCtx('https://app.example/_serverFn/x');

    const response = csrfMiddlewareOptions.failureResponse(ctx as never);

    expect(response.status).toBe(403);
    expect(stderrSpy).toHaveBeenCalledWith(
      expect.stringMatching(/^\[csrf\] failed to emit csrf\.rejected log:/),
    );

    stderrSpy.mockRestore();
  });
});

describe('isCsrfRequestAllowed against the exported csrfMiddlewareOptions', () => {
  it('rejects requests carrying Sec-Fetch-Site: same-site', async () => {
    const ctx = buildCtx('http://localhost:3000/_serverFn/x', {
      'sec-fetch-site': 'same-site',
    });
    await expect(
      isCsrfRequestAllowed(csrfMiddlewareOptions, ctx as never),
    ).resolves.toBe(false);
  });

  it('rejects Origin values outside the allow-list', async () => {
    const ctx = buildCtx('http://localhost:3000/_serverFn/x', {
      origin: 'https://evil.example',
    });
    await expect(
      isCsrfRequestAllowed(csrfMiddlewareOptions, ctx as never),
    ).resolves.toBe(false);
  });

  it('allows the configured origin via the matcher', async () => {
    const ctx = buildCtx('http://localhost:3000/_serverFn/x', {
      origin: 'http://localhost:3000',
    });
    await expect(
      isCsrfRequestAllowed(csrfMiddlewareOptions, ctx as never),
    ).resolves.toBe(true);
  });
});

describe('getAllowedOrigins failure cache', () => {
  it('logs csrf.misconfigured once across repeated calls on misconfig', async () => {
    vi.resetModules();
    vi.doMock('varlock/env', () => ({ ENV: { TRUSTED_ORIGINS: 'not-a-url' } }));
    const errorSpy = vi.spyOn(log, 'error').mockImplementation(() => {});

    const mod = await import('@/lib/start/csrf');
    mod.__resetAllowedOriginsCacheForTests();
    const badCtx = buildCtx('http://localhost:3000/_serverFn/x', {
      origin: 'https://attacker.example',
    });

    await expect(
      isCsrfRequestAllowed(mod.csrfMiddlewareOptions, badCtx as never),
    ).rejects.toThrow(/invalid URL/);
    await expect(
      isCsrfRequestAllowed(mod.csrfMiddlewareOptions, badCtx as never),
    ).rejects.toThrow(/invalid URL/);
    await expect(
      isCsrfRequestAllowed(mod.csrfMiddlewareOptions, badCtx as never),
    ).rejects.toThrow(/invalid URL/);

    expect(errorSpy).toHaveBeenCalledExactlyOnceWith({
      action: 'csrf.misconfigured',
      error: expect.any(Error),
      outcome: { success: false },
    });

    errorSpy.mockRestore();
    vi.doUnmock('varlock/env');
    vi.resetModules();
  });
});

describe('isCsrfRequestAllowed with explicit fixture options', () => {
  const fixtureOptions: CsrfMiddlewareOptions = {
    filter: (ctx) => ctx.handlerType === 'serverFn',
    origin: ['https://app.example'],
  };

  it('allows requests carrying Sec-Fetch-Site: same-origin', async () => {
    const ctx = buildCtx('https://app.example/_serverFn/x', {
      'sec-fetch-site': 'same-origin',
    });
    await expect(
      isCsrfRequestAllowed(fixtureOptions, ctx as never),
    ).resolves.toBe(true);
  });

  it('rejects requests carrying Sec-Fetch-Site: cross-site', async () => {
    const ctx = buildCtx('https://app.example/_serverFn/x', {
      'sec-fetch-site': 'cross-site',
    });
    await expect(
      isCsrfRequestAllowed(fixtureOptions, ctx as never),
    ).resolves.toBe(false);
  });

  it('allows when Origin matches the explicit allow-list', async () => {
    const ctx = buildCtx('https://app.example/_serverFn/x', {
      origin: 'https://app.example',
    });
    await expect(
      isCsrfRequestAllowed(fixtureOptions, ctx as never),
    ).resolves.toBe(true);
  });

  it('rejects when Origin is outside the allow-list', async () => {
    const ctx = buildCtx('https://app.example/_serverFn/x', {
      origin: 'https://evil.example',
    });
    await expect(
      isCsrfRequestAllowed(fixtureOptions, ctx as never),
    ).resolves.toBe(false);
  });

  it('falls back to Referer when Sec-Fetch-Site and Origin are absent', async () => {
    const goodCtx = buildCtx('https://app.example/_serverFn/x', {
      referer: 'https://app.example/page',
    });
    const badCtx = buildCtx('https://app.example/_serverFn/x', {
      referer: 'https://evil.example/page',
    });
    await expect(
      isCsrfRequestAllowed(fixtureOptions, goodCtx as never),
    ).resolves.toBe(true);
    await expect(
      isCsrfRequestAllowed(fixtureOptions, badCtx as never),
    ).resolves.toBe(false);
  });

  it('rejects when Referer is unparseable', async () => {
    const ctx = buildCtx('https://app.example/_serverFn/x', {
      referer: 'not-a-valid-url',
    });
    await expect(
      isCsrfRequestAllowed(fixtureOptions, ctx as never),
    ).resolves.toBe(false);
  });

  it('rejects when every origin signal header is missing', async () => {
    const ctx = buildCtx('https://app.example/_serverFn/x');
    await expect(
      isCsrfRequestAllowed(fixtureOptions, ctx as never),
    ).resolves.toBe(false);
  });
});
