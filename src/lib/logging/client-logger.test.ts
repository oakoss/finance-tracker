import { vi } from 'vitest';

vi.mock('evlog/http', () => ({ createHttpLogDrain: mockCreateHttpLogDrain }));

vi.mock('evlog', () => ({ initLogger: mockInitLogger, log: mockLog }));

// Mirrors the server bundle's varlock shim, which yields `string | undefined`
// off process.env rather than the validated union.
const mockEnv: { CLIENT_LOG_LEVEL?: string | undefined } = {
  CLIENT_LOG_LEVEL: 'warn',
};
vi.mock('varlock/env', () => ({ ENV: mockEnv }));

const mockLog = {
  debug: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
};
const mockInitLogger = vi.fn();
const mockCreateHttpLogDrain = vi.fn(() => 'mock-drain');

// Helper to import a fresh client-logger module with specific env values
const importClientLogger = async (env: { CLIENT_LOG_LEVEL?: string }) => {
  vi.resetModules();

  // Assigned unconditionally so `{}` expresses "unset" rather than
  // inheriting the previous test's value.
  mockEnv.CLIENT_LOG_LEVEL = env.CLIENT_LOG_LEVEL;

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
    mockCreateHttpLogDrain.mockClear();
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

    it('creates an http log drain', async () => {
      const clientLog = await importClientLogger({ CLIENT_LOG_LEVEL: 'debug' });

      clientLog.info({ message: 'trigger init' });

      expect(mockCreateHttpLogDrain).toHaveBeenCalledExactlyOnceWith({
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

  // The server bundle aliases `varlock/env` to a raw process.env proxy, so
  // CLIENT_LOG_LEVEL arrives unvalidated. Without a fallback these collapse
  // to all-zero sampling, silencing everything but error.
  describe('unvalidated CLIENT_LOG_LEVEL', () => {
    const warnRates = { debug: 0, error: 100, info: 0, warn: 100 };

    it('falls back to warn rates when unset', async () => {
      const clientLog = await importClientLogger({});

      clientLog.info({ message: 'init' });

      const initCall = mockInitLogger.mock.calls[0]?.[0];
      expect(initCall?.sampling?.rates).toEqual(warnRates);
    });

    it('falls back to warn rates when unrecognised', async () => {
      const clientLog = await importClientLogger({
        CLIENT_LOG_LEVEL: 'verbose',
      });

      clientLog.info({ message: 'init' });

      const initCall = mockInitLogger.mock.calls[0]?.[0];
      expect(initCall?.sampling?.rates).toEqual(warnRates);
    });

    it('reports the rejected value instead of failing silently', async () => {
      const clientLog = await importClientLogger({
        CLIENT_LOG_LEVEL: 'verbose',
      });

      clientLog.info({ message: 'init' });

      expect(mockLog.warn).toHaveBeenCalledWith({
        action: 'client-logger.init',
        outcome: { configuredLevel: 'verbose', fallbackLevel: 'warn' },
      });
    });

    it('distinguishes unset from a literal "undefined"', async () => {
      const clientLog = await importClientLogger({});

      clientLog.info({ message: 'init' });

      expect(mockLog.warn).toHaveBeenCalledWith({
        action: 'client-logger.init',
        outcome: { configuredLevel: '<unset>', fallbackLevel: 'warn' },
      });
    });

    // A mispasted secret can carry credentials in its opening characters, so
    // truncation is not a sufficient mitigation — the value is withheld.
    it('withholds a rejected value that does not look like a level', async () => {
      const clientLog = await importClientLogger({
        CLIENT_LOG_LEVEL: 'postgres://user:hunter2@db.example.com:5432/finance',
      });

      clientLog.info({ message: 'init' });

      expect(mockLog.warn).toHaveBeenCalledWith({
        action: 'client-logger.init',
        outcome: { configuredLevel: '<withheld>', fallbackLevel: 'warn' },
      });
    });

    // Padding from an env field is likelier than a typo, so it is named
    // rather than withheld — otherwise the operator cannot see the cause.
    it('names a padded value instead of withholding it', async () => {
      const clientLog = await importClientLogger({ CLIENT_LOG_LEVEL: 'warn ' });

      clientLog.info({ message: 'init' });

      expect(mockLog.warn).toHaveBeenCalledWith({
        action: 'client-logger.init',
        outcome: { configuredLevel: '<padded:warn>', fallbackLevel: 'warn' },
      });
    });

    it('stays quiet when the level is valid', async () => {
      const clientLog = await importClientLogger({ CLIENT_LOG_LEVEL: 'debug' });

      clientLog.info({ message: 'init' });

      expect(mockLog.warn).not.toHaveBeenCalled();
    });

    // `in` would accept these off the prototype chain and index to a
    // function, collapsing every rate to 0 without warning.
    it.for(['toString', 'constructor', 'valueOf'])(
      'rejects inherited property name %s',
      async (level) => {
        const clientLog = await importClientLogger({ CLIENT_LOG_LEVEL: level });

        clientLog.info({ message: 'init' });

        const initCall = mockInitLogger.mock.calls[0]?.[0];
        expect(initCall?.sampling?.rates).toEqual(warnRates);
      },
    );
  });

  describe('initialization failure', () => {
    it('reports the level alongside the init error', async () => {
      const consoleError = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      mockInitLogger.mockImplementationOnce(() => {
        throw new Error('boom');
      });

      const clientLog = await importClientLogger({
        CLIENT_LOG_LEVEL: 'verbose',
      });
      clientLog.info({ message: 'init' });

      expect(consoleError).toHaveBeenCalledWith(
        expect.stringContaining('level=verbose'),
        expect.any(Error),
      );
      // No logger to deliver it, so the warn must not be attempted.
      expect(mockLog.warn).not.toHaveBeenCalled();

      consoleError.mockRestore();
    });
  });
});
