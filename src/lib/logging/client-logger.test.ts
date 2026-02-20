import { vi } from 'vitest';

// Mock evlog and evlog/browser before any imports
const mockLog = {
  debug: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
};
const mockInitLogger = vi.fn();
const mockCreateBrowserLogDrain = vi.fn(() => 'mock-drain');

vi.mock('evlog', () => ({
  initLogger: mockInitLogger,
  log: mockLog,
}));

vi.mock('evlog/browser', () => ({
  createBrowserLogDrain: mockCreateBrowserLogDrain,
}));

// Helper to import a fresh client-logger module with specific env values
const importClientLogger = async (env: {
  DEV?: boolean;
  VITE_CLIENT_LOGGING_ENABLED?: string;
  VITE_CLIENT_LOG_LEVEL?: string;
}) => {
  vi.resetModules();

  // Re-register mocks after resetModules (hoisted mocks survive, but re-registering ensures clean state)
  vi.mock('evlog', () => ({
    initLogger: mockInitLogger,
    log: mockLog,
  }));
  vi.mock('evlog/browser', () => ({
    createBrowserLogDrain: mockCreateBrowserLogDrain,
  }));

  // Stub import.meta.env values before importing the module
  if (env.VITE_CLIENT_LOGGING_ENABLED !== undefined) {
    vi.stubEnv('VITE_CLIENT_LOGGING_ENABLED', env.VITE_CLIENT_LOGGING_ENABLED);
  }
  if (env.VITE_CLIENT_LOG_LEVEL !== undefined) {
    vi.stubEnv('VITE_CLIENT_LOG_LEVEL', env.VITE_CLIENT_LOG_LEVEL);
  }
  // import.meta.env.DEV is a boolean set by Vite/Vitest (true in test mode).
  // vi.stubEnv only handles strings, so we override it directly on the object.
  if (env.DEV !== undefined) {
    import.meta.env.DEV = env.DEV;
  }

  const mod = await import('./client-logger');
  return mod.clientLog;
};

describe('clientLog', () => {
  beforeEach(() => {
    mockLog.debug.mockClear();
    mockLog.error.mockClear();
    mockLog.info.mockClear();
    mockLog.warn.mockClear();
    mockInitLogger.mockClear();
    mockCreateBrowserLogDrain.mockClear();
  });

  describe('when logging is disabled', () => {
    it('does not call log methods when VITE_CLIENT_LOGGING_ENABLED is false and not DEV', async () => {
      const clientLog = await importClientLogger({
        DEV: false,
        VITE_CLIENT_LOGGING_ENABLED: 'false',
        VITE_CLIENT_LOG_LEVEL: 'warn',
      });

      clientLog.debug({ message: 'test' });
      clientLog.info({ message: 'test' });
      clientLog.warn({ message: 'test' });
      clientLog.error({ message: 'test' });

      expect(mockLog.debug).not.toHaveBeenCalled();
      expect(mockLog.info).not.toHaveBeenCalled();
      expect(mockLog.warn).not.toHaveBeenCalled();
      expect(mockLog.error).not.toHaveBeenCalled();
    });

    it('does not call initLogger when disabled', async () => {
      const clientLog = await importClientLogger({
        DEV: false,
        VITE_CLIENT_LOGGING_ENABLED: 'false',
        VITE_CLIENT_LOG_LEVEL: 'warn',
      });

      clientLog.info({ message: 'test' });

      expect(mockInitLogger).not.toHaveBeenCalled();
    });
  });

  describe('when logging is enabled', () => {
    it('calls initLogger on first log call', async () => {
      const clientLog = await importClientLogger({
        VITE_CLIENT_LOGGING_ENABLED: 'true',
        VITE_CLIENT_LOG_LEVEL: 'debug',
      });

      clientLog.info({ message: 'first' });

      expect(mockInitLogger).toHaveBeenCalledTimes(1);
    });

    it('only calls initLogger once (idempotent)', async () => {
      const clientLog = await importClientLogger({
        VITE_CLIENT_LOGGING_ENABLED: 'true',
        VITE_CLIENT_LOG_LEVEL: 'debug',
      });

      clientLog.info({ message: 'first' });
      clientLog.warn({ message: 'second' });
      clientLog.error({ message: 'third' });

      expect(mockInitLogger).toHaveBeenCalledTimes(1);
    });

    it('delegates debug to log.debug', async () => {
      const clientLog = await importClientLogger({
        VITE_CLIENT_LOGGING_ENABLED: 'true',
        VITE_CLIENT_LOG_LEVEL: 'debug',
      });

      clientLog.debug({ message: 'test-debug' });
      expect(mockLog.debug).toHaveBeenCalledWith({ message: 'test-debug' });
    });

    it('delegates info to log.info', async () => {
      const clientLog = await importClientLogger({
        VITE_CLIENT_LOGGING_ENABLED: 'true',
        VITE_CLIENT_LOG_LEVEL: 'debug',
      });

      clientLog.info({ message: 'test-info' });
      expect(mockLog.info).toHaveBeenCalledWith({ message: 'test-info' });
    });

    it('delegates warn to log.warn', async () => {
      const clientLog = await importClientLogger({
        VITE_CLIENT_LOGGING_ENABLED: 'true',
        VITE_CLIENT_LOG_LEVEL: 'debug',
      });

      clientLog.warn({ message: 'test-warn' });
      expect(mockLog.warn).toHaveBeenCalledWith({ message: 'test-warn' });
    });

    it('delegates error to log.error', async () => {
      const clientLog = await importClientLogger({
        VITE_CLIENT_LOGGING_ENABLED: 'true',
        VITE_CLIENT_LOG_LEVEL: 'debug',
      });

      clientLog.error({ message: 'test-error' });
      expect(mockLog.error).toHaveBeenCalledWith({ message: 'test-error' });
    });
  });

  describe('sampling rates based on VITE_CLIENT_LOG_LEVEL', () => {
    it('enables all levels when minLevel is debug', async () => {
      const clientLog = await importClientLogger({
        VITE_CLIENT_LOGGING_ENABLED: 'true',
        VITE_CLIENT_LOG_LEVEL: 'debug',
      });

      clientLog.info({ message: 'init' });

      const initCall = mockInitLogger.mock.calls[0]?.[0];
      expect(initCall?.sampling?.rates).toEqual({
        debug: 100,
        error: 100,
        info: 100,
        warn: 100,
      });
    });

    it('disables debug when minLevel is info', async () => {
      const clientLog = await importClientLogger({
        VITE_CLIENT_LOGGING_ENABLED: 'true',
        VITE_CLIENT_LOG_LEVEL: 'info',
      });

      clientLog.info({ message: 'init' });

      const initCall = mockInitLogger.mock.calls[0]?.[0];
      expect(initCall?.sampling?.rates).toEqual({
        debug: 0,
        error: 100,
        info: 100,
        warn: 100,
      });
    });

    it('disables debug and info when minLevel is warn', async () => {
      const clientLog = await importClientLogger({
        VITE_CLIENT_LOGGING_ENABLED: 'true',
        VITE_CLIENT_LOG_LEVEL: 'warn',
      });

      clientLog.info({ message: 'init' });

      const initCall = mockInitLogger.mock.calls[0]?.[0];
      expect(initCall?.sampling?.rates).toEqual({
        debug: 0,
        error: 100,
        info: 0,
        warn: 100,
      });
    });

    it('only enables error when minLevel is error', async () => {
      const clientLog = await importClientLogger({
        VITE_CLIENT_LOGGING_ENABLED: 'true',
        VITE_CLIENT_LOG_LEVEL: 'error',
      });

      clientLog.info({ message: 'init' });

      const initCall = mockInitLogger.mock.calls[0]?.[0];
      expect(initCall?.sampling?.rates).toEqual({
        debug: 0,
        error: 100,
        info: 0,
        warn: 0,
      });
    });

    it('always enables error regardless of minLevel', async () => {
      // error rate is hardcoded to 100, not based on minLevel comparison
      const clientLog = await importClientLogger({
        VITE_CLIENT_LOGGING_ENABLED: 'true',
        VITE_CLIENT_LOG_LEVEL: 'error',
      });

      clientLog.error({ message: 'init' });

      const initCall = mockInitLogger.mock.calls[0]?.[0];
      expect(initCall?.sampling?.rates?.error).toBe(100);
    });
  });

  describe('initialization', () => {
    it('creates a browser log drain', async () => {
      const clientLog = await importClientLogger({
        VITE_CLIENT_LOGGING_ENABLED: 'true',
        VITE_CLIENT_LOG_LEVEL: 'debug',
      });

      clientLog.info({ message: 'trigger init' });

      expect(mockCreateBrowserLogDrain).toHaveBeenCalledTimes(1);
      expect(mockCreateBrowserLogDrain).toHaveBeenCalledWith({
        drain: { endpoint: '' },
        pipeline: {
          batch: { intervalMs: 3000, size: 20 },
        },
      });
    });

    it('passes the drain to initLogger', async () => {
      const clientLog = await importClientLogger({
        VITE_CLIENT_LOGGING_ENABLED: 'true',
        VITE_CLIENT_LOG_LEVEL: 'debug',
      });

      clientLog.info({ message: 'trigger init' });

      const initCall = mockInitLogger.mock.calls[0]?.[0];
      expect(initCall?.drain).toBe('mock-drain');
      expect(initCall?.pretty).toBe(true);
    });
  });
});
