import { vi } from 'vitest';

vi.mock('evlog/browser', () => ({
  createBrowserLogDrain: mockCreateBrowserLogDrain,
}));

vi.mock('evlog', () => ({ initLogger: mockInitLogger, log: mockLog }));

const mockEnv = { CLIENT_LOG_LEVEL: 'warn' as string };
vi.mock('varlock/env', () => ({ ENV: mockEnv }));

const mockLog = {
  debug: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
};
const mockInitLogger = vi.fn();
const mockCreateBrowserLogDrain = vi.fn(() => 'mock-drain');

// Helper to import a fresh client-logger module with specific env values
const importClientLogger = async (env: { CLIENT_LOG_LEVEL?: string }) => {
  vi.resetModules();

  if (env.CLIENT_LOG_LEVEL !== undefined) {
    mockEnv.CLIENT_LOG_LEVEL = env.CLIENT_LOG_LEVEL;
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

  describe('initialization', () => {
    it('calls initLogger on first log call', async () => {
      const clientLog = await importClientLogger({ CLIENT_LOG_LEVEL: 'debug' });

      clientLog.info({ message: 'first' });

      expect(mockInitLogger).toHaveBeenCalledOnce();
    });

    it('only calls initLogger once (idempotent)', async () => {
      const clientLog = await importClientLogger({ CLIENT_LOG_LEVEL: 'debug' });

      clientLog.info({ message: 'first' });
      clientLog.warn({ message: 'second' });
      clientLog.error({ message: 'third' });

      expect(mockInitLogger).toHaveBeenCalledOnce();
    });

    it('creates a browser log drain', async () => {
      const clientLog = await importClientLogger({ CLIENT_LOG_LEVEL: 'debug' });

      clientLog.info({ message: 'trigger init' });

      expect(mockCreateBrowserLogDrain).toHaveBeenCalledExactlyOnceWith({
        drain: { endpoint: '' },
        pipeline: { batch: { intervalMs: 3000, size: 20 } },
      });
    });

    it('passes the drain to initLogger', async () => {
      const clientLog = await importClientLogger({ CLIENT_LOG_LEVEL: 'debug' });

      clientLog.info({ message: 'trigger init' });

      const initCall = mockInitLogger.mock.calls[0]?.[0];
      expect(initCall?.drain).toBe('mock-drain');
      expect(initCall?.pretty).toBe(true);
    });
  });

  describe('delegation', () => {
    it('delegates debug to log.debug', async () => {
      const clientLog = await importClientLogger({ CLIENT_LOG_LEVEL: 'debug' });

      clientLog.debug({ message: 'test-debug' });
      expect(mockLog.debug).toHaveBeenCalledWith({ message: 'test-debug' });
    });

    it('delegates info to log.info', async () => {
      const clientLog = await importClientLogger({ CLIENT_LOG_LEVEL: 'debug' });

      clientLog.info({ message: 'test-info' });
      expect(mockLog.info).toHaveBeenCalledWith({ message: 'test-info' });
    });

    it('delegates warn to log.warn', async () => {
      const clientLog = await importClientLogger({ CLIENT_LOG_LEVEL: 'debug' });

      clientLog.warn({ message: 'test-warn' });
      expect(mockLog.warn).toHaveBeenCalledWith({ message: 'test-warn' });
    });

    it('delegates error to log.error', async () => {
      const clientLog = await importClientLogger({ CLIENT_LOG_LEVEL: 'debug' });

      clientLog.error({ message: 'test-error' });
      expect(mockLog.error).toHaveBeenCalledWith({ message: 'test-error' });
    });
  });

  describe('sampling rates based on CLIENT_LOG_LEVEL', () => {
    it('enables all levels when minLevel is debug', async () => {
      const clientLog = await importClientLogger({ CLIENT_LOG_LEVEL: 'debug' });

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
      const clientLog = await importClientLogger({ CLIENT_LOG_LEVEL: 'info' });

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
      const clientLog = await importClientLogger({ CLIENT_LOG_LEVEL: 'warn' });

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
      const clientLog = await importClientLogger({ CLIENT_LOG_LEVEL: 'error' });

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
      const clientLog = await importClientLogger({ CLIENT_LOG_LEVEL: 'error' });

      clientLog.error({ message: 'init' });

      const initCall = mockInitLogger.mock.calls[0]?.[0];
      expect(initCall?.sampling?.rates?.error).toBe(100);
    });
  });
});
