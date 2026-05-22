import {
  createCsrfMiddleware,
  type CsrfMiddlewareOptions,
} from '@tanstack/react-start';
import { ENV } from 'varlock/env';

import { log } from '@/lib/logging/evlog';

export function parseTrustedOrigins(raw: string): string[] {
  const entries = raw
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
  if (entries.length === 0) {
    throw new Error(
      'TRUSTED_ORIGINS produced an empty allow-list — set at least one origin.',
    );
  }
  return entries.map((entry) => {
    let url: URL;
    try {
      url = new URL(entry);
    } catch {
      throw new Error(`TRUSTED_ORIGINS contains invalid URL: "${entry}"`);
    }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      throw new Error(
        `TRUSTED_ORIGINS entry "${entry}" must use http:// or https://`,
      );
    }
    return url.origin;
  });
}

// Process-lifetime cache. Module-scope eager parsing leaks `ENV.TRUSTED_ORIGINS`
// into the client bundle (varlock returns `undefined`, crashing hydration on
// `.split(',')`). Runtime env changes require a process restart. Failures are
// cached too — a misconfigured deploy emits `csrf.misconfigured` once instead
// of once per request.
type OriginsCache =
  | { kind: 'ok'; origins: string[] }
  | { error: unknown; kind: 'err' };
let cachedOrigins: OriginsCache | null = null;

export function __resetAllowedOriginsCacheForTests(): void {
  cachedOrigins = null;
}

function getAllowedOrigins(): string[] {
  if (cachedOrigins !== null) {
    if (cachedOrigins.kind === 'ok') return cachedOrigins.origins;
    throw cachedOrigins.error;
  }
  try {
    const origins = parseTrustedOrigins(ENV.TRUSTED_ORIGINS);
    cachedOrigins = { kind: 'ok', origins };
    return origins;
  } catch (error) {
    cachedOrigins = { error, kind: 'err' };
    // The framework doesn't wrap matcher errors — a bare throw produces a
    // generic 500 with no log. Emit before re-throwing so misconfiguration
    // leaves a trace.
    try {
      log.error({
        action: 'csrf.misconfigured',
        error,
        outcome: { success: false },
      });
    } catch (logError) {
      try {
        process.stderr.write(
          `[csrf] failed to emit csrf.misconfigured log: ${String(logError)}; original: ${String(error)}\n`,
        );
      } catch {
        // stderr unavailable.
      }
    }
    throw error;
  }
}

// `Extract<..., (...args: never[]) => unknown>` constrains each option to its
// function arm. Regressing `origin` to an eager `string[]` (the original
// client-bundle bug) or `failureResponse` to a static `Response` fails at
// compile time instead of at runtime.
type CsrfOptionsBoundary = CsrfMiddlewareOptions & {
  failureResponse: Extract<
    CsrfMiddlewareOptions['failureResponse'],
    (...args: never[]) => unknown
  >;
  filter: Extract<
    NonNullable<CsrfMiddlewareOptions['filter']>,
    (...args: never[]) => unknown
  >;
  origin: Extract<
    CsrfMiddlewareOptions['origin'],
    (...args: never[]) => unknown
  >;
};

export const csrfMiddlewareOptions = {
  failureResponse: (ctx) => {
    try {
      const url = new URL(ctx.request.url);
      log.warn({
        action: 'csrf.rejected',
        outcome: {
          method: ctx.request.method,
          origin: ctx.request.headers.get('origin'),
          path: url.pathname,
          referer: ctx.request.headers.get('referer'),
          secFetchSite: ctx.request.headers.get('sec-fetch-site'),
          success: false,
          userAgent: ctx.request.headers.get('user-agent'),
        },
      });
    } catch (logError) {
      // Bypass the structured logger so the rejection still leaves a trace
      // before the 403.
      try {
        process.stderr.write(
          `[csrf] failed to emit csrf.rejected log: ${String(logError)}\n`,
        );
      } catch {
        // stderr unavailable.
      }
    }
    return new Response('Forbidden', { status: 403 });
  },
  // CSRF only applies to server functions. API/webhook routes flow through
  // with handlerType='router' and must implement their own request-origin
  // checks (signature verification, dedicated allow-lists, etc.).
  filter: (ctx) => ctx.handlerType === 'serverFn',
  origin: (value) => getAllowedOrigins().includes(value),
  // Single-domain app: reject anything that isn't strictly same-origin.
  // If we ever split onto subdomains, add 'same-site' here.
  secFetchSite: ['same-origin'],
} satisfies CsrfOptionsBoundary;

// Annotated with the framework's own return type to break the
// `Register.config -> startInstance -> csrfMiddleware -> Register` cycle
// (from the route tree footer's `config: Awaited<ReturnType<typeof
// startInstance.getOptions>>`). `NonNullable<ReturnType<...>>` strips the
// client-side `undefined` arm of the isomorphic stub.
export const csrfMiddleware: NonNullable<
  ReturnType<typeof createCsrfMiddleware>
> = createCsrfMiddleware(csrfMiddlewareOptions);
