import arkenv from 'arkenv';

export const env = arkenv(
  {
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
    'VITE_APP_TITLE?': 'string > 0',
  },
  {
    env: {
      ...process.env,
      ...import.meta.env,
    },
    coerce: true,
    onUndeclaredKey: 'delete',
  },
);
