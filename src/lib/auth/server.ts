import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { betterAuth } from 'better-auth';
import { tanstackStartCookies } from 'better-auth/tanstack-start';
import { ENV } from 'varlock/env';

import { appConfig } from '@/configs/app';
import { db } from '@/db';
import { log } from '@/lib/logging/evlog';
import { hashId } from '@/lib/logging/hash';
import {
  sendResetPasswordEmail,
  sendVerificationEmail,
} from '@/modules/auth/emails/email-service';
import { bootstrapUserPreferences } from '@/modules/preferences/services/bootstrap';

export const auth = betterAuth({
  account: {
    accountLinking: {
      allowDifferentEmails: false,
      allowUnlinkingAll: false,
      enabled: true,
      trustedProviders: ['email-password', 'google', 'github'],
    },
    encryptOAuthTokens: ENV.APP_ENV === 'production',
  },
  advanced: {
    database: { generateId: 'uuid' },
    ipAddress: { ipAddressHeaders: ['cf-connecting-ip', 'x-forwarded-for'] },
  },
  appName: appConfig.name,
  baseURL: ENV.BETTER_AUTH_URL,
  database: drizzleAdapter(db, { provider: 'pg', usePlural: true }),
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          // Best-effort bootstrap of user_preferences on sign-up.
          // Failures are logged but do not block account creation —
          // the lazy bootstrap in getUserPreferences will retry on
          // first read, and the in-memory fallback keeps the app
          // functional if both paths fail.
          try {
            await bootstrapUserPreferences(db, user.id);
            log.info({
              action: 'preferences.bootstrap',
              outcome: { source: 'auth_hook', success: true },
              user: { idHash: hashId(user.id) },
            });
          } catch (error) {
            log.error({
              action: 'preferences.bootstrap',
              error,
              outcome: { source: 'auth_hook', success: false },
              user: { idHash: hashId(user.id) },
            });
          }
        },
      },
    },
  },
  emailAndPassword: {
    enabled: true,
    minPasswordLength: appConfig.passwordMinLength,
    requireEmailVerification: false,
    resetPasswordTokenExpiresIn: 60 * 60 * 2,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ url, user }, request) =>
      sendResetPasswordEmail({
        cookie: request?.headers.get('cookie') ?? null,
        url,
        user,
      }),
  },
  emailVerification: {
    sendOnSignIn: true,
    sendOnSignUp: true,
    sendVerificationEmail: async ({ url, user }, request) =>
      sendVerificationEmail({
        cookie: request?.headers.get('cookie') ?? null,
        url,
        user,
      }),
  },
  experimental: { joins: true },
  plugins: [tanstackStartCookies()],
  rateLimit: { enabled: ENV.APP_ENV === 'production', max: 100, window: 60 },
  secret: ENV.BETTER_AUTH_SECRET,
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    freshAge: 60 * 60 * 24,
    updateAge: 60 * 60 * 24,
  },
  socialProviders: {
    github: {
      clientId: ENV.GITHUB_CLIENT_ID,
      clientSecret: ENV.GITHUB_CLIENT_SECRET,
      mapProfileToUser: (profile) => ({
        image: profile.avatar_url,
        name: profile.name,
      }),
    },
    google: {
      clientId: ENV.GOOGLE_CLIENT_ID,
      clientSecret: ENV.GOOGLE_CLIENT_SECRET,
      mapProfileToUser: (profile) => ({
        image: profile.picture,
        name: profile.name,
      }),
    },
  },
  trustedOrigins: ENV.TRUSTED_ORIGINS.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  user: {
    changeEmail: {
      enabled: true,
      sendChangeEmailConfirmation: async ({ url, user }, request) =>
        sendVerificationEmail({
          cookie: request?.headers.get('cookie') ?? null,
          url,
          user: { email: user.email, id: user.id, name: user.name },
        }),
    },
    deleteUser: { enabled: false },
  },
});

export type Auth = typeof auth;
export type AuthSession = typeof auth.$Infer.Session;
