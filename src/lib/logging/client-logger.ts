import { initLogger, log } from 'evlog';
import { createBrowserLogDrain } from 'evlog/browser';

type LogLevel = 'debug' | 'error' | 'info' | 'warn';

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  error: 3,
  info: 1,
  warn: 2,
};

// import.meta.env is fully typed via src/vite-env.d.ts — no casts needed
const minLevel: LogLevel = import.meta.env.VITE_CLIENT_LOG_LEVEL;

let initialized = false;

const ensureClientLogger = (): void => {
  if (initialized) return;
  initialized = true;

  try {
    // createBrowserLogDrain handles batching and page-hide flush automatically.
    // No remote endpoint is configured — dev-only console output via pretty mode.
    // To enable remote ingestion later, set drain.endpoint to a server ingest URL.
    const drain = createBrowserLogDrain({
      drain: { endpoint: '' },
      pipeline: {
        batch: { intervalMs: 3000, size: 20 },
      },
    });

    initLogger({
      drain,
      pretty: true,
      sampling: {
        rates: {
          debug:
            LOG_LEVEL_PRIORITY[minLevel] <= LOG_LEVEL_PRIORITY.debug ? 100 : 0,
          error: 100,
          info:
            LOG_LEVEL_PRIORITY[minLevel] <= LOG_LEVEL_PRIORITY.info ? 100 : 0,
          warn:
            LOG_LEVEL_PRIORITY[minLevel] <= LOG_LEVEL_PRIORITY.warn ? 100 : 0,
        },
      },
    });
  } catch (error) {
    // Logger failed to initialize. Flag stays true to prevent retry loops.
    // Falls back to console so the failure is observable in DevTools.
    // eslint-disable-next-line no-console
    console.error('[client-logger] Failed to initialize:', error);
  }
};

/**
 * Client-side logger.
 * All levels always initialize the logger; sampling rates controlled
 * by VITE_CLIENT_LOG_LEVEL (default: warn) determine which emit.
 * Error is always sampled at 100%.
 */
export const clientLog = {
  debug: (...args: Parameters<typeof log.debug>) => {
    ensureClientLogger();
    log.debug(...args);
  },
  error: (...args: Parameters<typeof log.error>) => {
    ensureClientLogger();
    log.error(...args);
  },
  info: (...args: Parameters<typeof log.info>) => {
    ensureClientLogger();
    log.info(...args);
  },
  warn: (...args: Parameters<typeof log.warn>) => {
    ensureClientLogger();
    log.warn(...args);
  },
};
