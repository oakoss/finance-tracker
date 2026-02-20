// @vitest-environment node

import { type MockInstance, vi } from 'vitest';

// Mock arkenv — we don't want real validation in unit tests
vi.mock('arkenv', () => ({
  default: vi.fn(),
}));

vi.mock('arkenv/arktype', () => ({
  type: vi.fn((schema: Record<string, string>) => schema),
}));

describe('env lazy proxy', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    vi.resetModules();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('defers validation until first property access', async () => {
    const arkenv = await import('arkenv');
    const mockedArkenv = arkenv.default as unknown as MockInstance;
    mockedArkenv.mockReturnValue({
      DATABASE_URL: 'postgres://localhost/test',
    });

    // Import env — should NOT call arkenv yet
    const { env } = await import('@/configs/env');
    expect(mockedArkenv).not.toHaveBeenCalled();

    // Access a property — NOW it should validate
    const url = env.DATABASE_URL;
    expect(mockedArkenv).toHaveBeenCalledTimes(1);
    expect(url).toBe('postgres://localhost/test');
  });

  it('caches the result after first validation', async () => {
    const arkenv = await import('arkenv');
    const mockedArkenv = arkenv.default as unknown as MockInstance;
    mockedArkenv.mockReturnValue({
      DATABASE_URL: 'postgres://localhost/test',
      BETTER_AUTH_URL: 'http://localhost:3000',
    });

    const { env } = await import('@/configs/env');

    // Access multiple properties
    void env.DATABASE_URL;
    void env.BETTER_AUTH_URL;

    // Should only call arkenv once (cached)
    expect(mockedArkenv).toHaveBeenCalledTimes(1);
  });

  it('skips validation when SKIP_ENV_VALIDATION=true', async () => {
    process.env.SKIP_ENV_VALIDATION = 'true';
    process.env.DATABASE_URL = 'raw-process-env-value';

    const arkenv = await import('arkenv');
    const mockedArkenv = arkenv.default as unknown as MockInstance;

    const { env } = await import('@/configs/env');
    const result = env.DATABASE_URL;

    // Should NOT have called arkenv at all
    expect(mockedArkenv).not.toHaveBeenCalled();
    // Should fall through to process.env
    expect(result).toBe('raw-process-env-value');
  });

  it('passes correct options to arkenv', async () => {
    const arkenv = await import('arkenv');
    const mockedArkenv = arkenv.default as unknown as MockInstance;
    mockedArkenv.mockReturnValue({ DATABASE_URL: 'test' });

    const { env } = await import('@/configs/env');
    void env.DATABASE_URL;

    expect(mockedArkenv).toHaveBeenCalledWith(
      expect.anything(), // the Env schema
      expect.objectContaining({
        env: process.env,
        coerce: true,
        onUndeclaredKey: 'delete',
      }),
    );
  });
});

describe('Env schema export', () => {
  it('exports the Env schema object', async () => {
    const { Env } = await import('@/configs/env');
    expect(Env).toBeDefined();
  });
});
