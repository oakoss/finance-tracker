import { initLogger, log } from 'evlog';
import { createHttpLogDrain } from 'evlog/http';
import { ENV } from 'varlock/env';

// Derived from the env schema rather than restated: adding a level to
// CLIENT_LOG_LEVEL's enum in .env.schema then fails the `satisfies` below
// until it gets a priority. Restating the union let the two drift, and a
// level with no priority silently drops its sampling rate to zero.
type LogLevel = typeof ENV.CLIENT_LOG_LEVEL;

const LOG_LEVEL_PRIORITY = {
  debug: 0,
  error: 3,
  info: 1,
  warn: 2,
} satisfies Record<LogLevel, number>;

const DEFAULT_LOG_LEVEL: LogLevel = 'warn';

// The declared type is not runtime evidence: the Nitro server bundle aliases
// `varlock/env` to a bare process.env proxy (src/lib/varlock-env-shim.ts),
// so this arrives unvalidated and possibly undefined. Left unchecked, an
// unrecognised value indexes LOG_LEVEL_PRIORITY to undefined and every
// `undefined <= n` is false — silently zeroing debug/info/warn while errors
// keep flowing, which reads as healthy.
// `Object.hasOwn`, not `in`: `in` walks the prototype chain, so a value of
// `toString` or `constructor` would pass and then index to a function,
// reproducing the zeroed sampling this guard exists to prevent.
const isLogLevel = (value: unknown): value is LogLevel =>
  typeof value === 'string' && Object.hasOwn(LOG_LEVEL_PRIORITY, value);

// Reports the value's shape, not its content. A rejected level may be a
// mispaste (CLIENT_LOG_LEVEL=$DATABASE_URL); today it only reaches the
// console, but session replay can capture that and a log drain may be wired
// later, so treat it as a leak surface. Truncating isn't enough — a
// credential can sit in the first few characters.
//
// Padding is reported separately because a trailing-space value is a likelier
// misconfiguration than a typo, and marking it withheld would hide the one
// thing the operator needs to see.
const describeRejectedLevel = (value: unknown): string => {
  if (value === undefined) return '<unset>';
  if (typeof value !== 'string') return '<withheld>';
  const trimmed = value.trim();
  if (!/^[a-zA-Z]{1,10}$/.test(trimmed)) return '<withheld>';
  return trimmed === value ? value : `<padded:${trimmed}>`;
};

// Typed `unknown` deliberately. Taking the declared type here would narrow the
// guard's false branch to `never`, leaving the fallback and the warning below
// looking like dead code — the opposite of what the shim makes true.
const configuredLevel: unknown = ENV.CLIENT_LOG_LEVEL;
const minLevel = isLogLevel(configuredLevel)
  ? configuredLevel
  : DEFAULT_LOG_LEVEL;

let initialized = false;

const ensureClientLogger = (): void => {
  if (initialized) return;
  initialized = true;

  let ready = false;

  try {
    // Empty endpoint disables HTTP transport; pretty mode handles dev output.
    const drain = createHttpLogDrain({
      drain: { endpoint: '' },
      pipeline: { batch: { intervalMs: 3000, size: 20 } },
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

    ready = true;
  } catch (error) {
    // `initialized` stays true to prevent retry loops. Falls back to console
    // so the failure is observable in DevTools, and carries the level too
    // since the warn below cannot run without a logger.
    console.error(
      `[client-logger] Failed to initialize (level=${describeRejectedLevel(configuredLevel)}):`,
      error,
    );
  }

  // Outside the init try so a throw here is not misreported as an init
  // failure, but still guarded: callers include the root error boundary,
  // where analytics must never break the error UI.
  if (ready && !isLogLevel(configuredLevel)) {
    try {
      log.warn({
        action: 'client-logger.init',
        outcome: {
          configuredLevel: describeRejectedLevel(configuredLevel),
          fallbackLevel: DEFAULT_LOG_LEVEL,
        },
      });
    } catch (error) {
      console.error('[client-logger] Failed to report rejected level:', error);
    }
  }
};

/**
 * Client-side logger.
 * All levels always initialize the logger; sampling rates controlled
 * by CLIENT_LOG_LEVEL (falling back to warn if unset or unrecognised)
 * determine which emit. Error is always sampled at 100%.
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
