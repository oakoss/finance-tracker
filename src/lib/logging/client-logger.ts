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
const isEnabled: boolean =
  import.meta.env.VITE_CLIENT_LOGGING_ENABLED === 'true' || import.meta.env.DEV;

const minLevel: LogLevel = import.meta.env.VITE_CLIENT_LOG_LEVEL;

let initialized = false;

const ensureClientLogger = (): void => {
  if (initialized || !isEnabled) return;

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
        info: LOG_LEVEL_PRIORITY[minLevel] <= LOG_LEVEL_PRIORITY.info ? 100 : 0,
        warn: LOG_LEVEL_PRIORITY[minLevel] <= LOG_LEVEL_PRIORITY.warn ? 100 : 0,
      },
    },
  });

  initialized = true;
};

/**
 * Client-side logger.
 * Enabled in development by default.
 * In production, requires VITE_CLIENT_LOGGING_ENABLED=true.
 * Minimum level controlled by VITE_CLIENT_LOG_LEVEL (default: warn).
 *
 * Usage:
 *   clientLog.warn({ action: 'checkout', message: 'cart empty' })
 *   clientLog.error({ action: 'auth', error: 'token_expired' })
 */
export const clientLog = {
  debug: (...args: Parameters<typeof log.debug>) => {
    ensureClientLogger();
    if (isEnabled) log.debug(...args);
  },
  error: (...args: Parameters<typeof log.error>) => {
    ensureClientLogger();
    if (isEnabled) log.error(...args);
  },
  info: (...args: Parameters<typeof log.info>) => {
    ensureClientLogger();
    if (isEnabled) log.info(...args);
  },
  warn: (...args: Parameters<typeof log.warn>) => {
    ensureClientLogger();
    if (isEnabled) log.warn(...args);
  },
};
