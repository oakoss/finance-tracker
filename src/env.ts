import arkenv from 'arkenv';
import { type } from 'arkenv/arktype';

export const Env = type({
  BETTER_AUTH_URL: 'string.url',
  DATABASE_URL: 'string > 0',
  BETTER_AUTH_SECRET: 'string >= 32',
  BREVO_API_KEY: 'string > 0',
  EMAIL_FROM: 'string.email',
  'EMAIL_FROM_NAME?': 'string > 0',
  EMAIL_REPLY_TO: 'string.email',
  GITHUB_CLIENT_ID: 'string > 0',
  GITHUB_CLIENT_SECRET: 'string > 0',
  GOOGLE_CLIENT_ID: 'string > 0',
  GOOGLE_CLIENT_SECRET: 'string > 0',
  PASSWORD_MIN_LENGTH: '6 <= number.integer <= 128',
  TRUSTED_ORIGINS: 'string > 0',
  // Logging (evlog + SigNoz via OTLP) — optional; if unset, logs go to stdout only
  'OTEL_EXPORTER_OTLP_ENDPOINT?': 'string.url',
  'OTEL_SERVICE_NAME?': 'string > 0',
  'OTEL_RESOURCE_ATTRIBUTES?': 'string > 0',
  // Min 32-char secret for HMAC-SHA256 ID hashing in audit logs
  LOG_HASH_SECRET: "string >= 32 = 'dev-placeholder-secret-do-not-use-in-prod'",
  // Client-side vars (VITE_* prefix — available in browser via import.meta.env)
  'VITE_APP_TITLE?': 'string > 0',
  VITE_CLIENT_LOGGING_ENABLED: "'true' | 'false' = 'false'",
  VITE_CLIENT_LOG_LEVEL: "'debug' | 'info' | 'warn' | 'error' = 'warn'",
});

export const env = arkenv(Env, {
  // Use process.env only — import.meta.env contains non-string values (DEV: boolean)
  // which are incompatible with arkenv's RuntimeEnvironment (Dict<string>).
  // VITE_* vars are available via import.meta.env in the client via the vite plugin.
  env: process.env,
  coerce: true,
  onUndeclaredKey: 'delete',
});
