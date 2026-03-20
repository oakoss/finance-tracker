import arkenv, { type } from 'arkenv';

export const Env = type({
  BETTER_AUTH_SECRET: 'string >= 32',
  BETTER_AUTH_URL: 'string.url',
  'BREVO_API_KEY?': 'string > 0',
  DATABASE_URL: 'string > 0',
  EMAIL_FROM: 'string.email',
  'EMAIL_FROM_NAME?': 'string > 0',
  EMAIL_REPLY_TO: 'string.email',
  // OAuth credentials for social login providers
  GITHUB_CLIENT_ID: 'string > 0',
  GITHUB_CLIENT_SECRET: 'string > 0',
  GOOGLE_CLIENT_ID: 'string > 0',
  GOOGLE_CLIENT_SECRET: 'string > 0',
  // Min 32-char secret for HMAC-SHA256 ID hashing in audit logs
  LOG_HASH_SECRET: "string >= 32 = 'dev-placeholder-secret-do-not-use-in-prod'",
  // Logging (evlog + PostHog via OTLP) — optional; if unset, logs go to stdout only
  'OTEL_EXPORTER_OTLP_ENDPOINT?': 'string.url',
  'OTEL_RESOURCE_ATTRIBUTES?': 'string > 0',
  'OTEL_SERVICE_NAME?': 'string > 0',
  // PostHog — server-side API key for posthog-node (private, not exposed to browser)
  'POSTHOG_API_KEY?': 'string > 0',
  'POSTHOG_HOST?': 'string.url',
  // SMTP transport for local dev / CI (Mailpit); when unset, Brevo API is used
  'SMTP_HOST?': 'string > 0',
  'SMTP_PORT?': '1 <= number <= 65535',
  TRUSTED_ORIGINS: 'string > 0',
  // Client-side vars (VITE_* prefix — available in browser via import.meta.env)
  VITE_CLIENT_LOG_LEVEL: "'debug' | 'info' | 'warn' | 'error' = 'warn'",
  'VITE_PUBLIC_POSTHOG_HOST?': 'string.url',
  'VITE_PUBLIC_POSTHOG_KEY?': 'string > 0',
});

type ValidatedEnv = typeof Env.infer;

// Lazy validation — defers arkenv() until the first property access.
// This allows .env files or test setup to load before validation runs.
let _env: ValidatedEnv | undefined;

function getEnv(): ValidatedEnv {
  if (!_env) {
    if (process.env.SKIP_ENV_VALIDATION === 'true') {
      return process.env as unknown as ValidatedEnv;
    }
    _env = arkenv(Env, {
      coerce: true,
      env: process.env,
      onUndeclaredKey: 'delete',
    });
  }
  return _env;
}

export const env = new Proxy({} as ValidatedEnv, {
  get(_, prop: string) {
    return getEnv()[prop as keyof ValidatedEnv];
  },
});
