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
  // Client-side vars (VITE_* prefix — available in browser via import.meta.env)
  'VITE_APP_TITLE?': 'string > 0',
});

export const env = arkenv(Env, {
  // Use process.env only — import.meta.env contains non-string values (DEV: boolean)
  // which are incompatible with arkenv's RuntimeEnvironment (Dict<string>).
  // VITE_* vars are available via import.meta.env in the client via the vite plugin.
  env: process.env,
  coerce: true,
  onUndeclaredKey: 'delete',
});
