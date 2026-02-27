import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { tanstackStartCookies } from 'better-auth/tanstack-start';

import { appConfig } from '@/configs/app';
import { env } from '@/configs/env';
import { db } from '@/db';
import {
  sendResetPasswordEmail,
  sendVerificationEmail,
} from '@/modules/auth/emails/email-service';

export const auth = betterAuth({
  account: {
    accountLinking: {
      allowDifferentEmails: false,
      allowUnlinkingAll: false,
      enabled: true,
      trustedProviders: ['email-password', 'google', 'github'],
    },
    encryptOAuthTokens: process.env.NODE_ENV === 'production',
  },
  advanced: {
    database: {
      generateId: 'uuid',
    },
    ipAddress: {
      ipAddressHeaders: ['cf-connecting-ip'],
    },
  },
  appName: appConfig.name,
  baseURL: env.BETTER_AUTH_URL,
  database: drizzleAdapter(db, {
    provider: 'pg',
    usePlural: true,
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: appConfig.passwordMinLength,
    requireEmailVerification: true,
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
  experimental: {
    joins: true,
  },
  plugins: [tanstackStartCookies()],
  rateLimit: {
    enabled: process.env.NODE_ENV === 'production',
    max: 100,
    window: 60,
  },
  secret: env.BETTER_AUTH_SECRET,
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    freshAge: 60 * 60 * 24,
    updateAge: 60 * 60 * 24,
  },
  socialProviders: {
    github: {
      clientId: env.GITHUB_CLIENT_ID,
      clientSecret: env.GITHUB_CLIENT_SECRET,
      mapProfileToUser: (profile) => ({
        image: profile.avatar_url,
        name: profile.name,
      }),
    },
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      mapProfileToUser: (profile) => ({
        image: profile.picture,
        name: profile.name,
      }),
    },
  },
  trustedOrigins: env.TRUSTED_ORIGINS.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  user: {
    changeEmail: {
      enabled: true,
      sendChangeEmailConfirmation: async ({ url, user }, request) =>
        sendVerificationEmail({
          cookie: request?.headers.get('cookie') ?? null,
          url,
          user: {
            email: user.email,
            id: user.id,
            name: user.name,
          },
        }),
    },
    deleteUser: {
      enabled: true,
      sendDeleteAccountVerification: async ({ url, user }, request) =>
        sendVerificationEmail({
          cookie: request?.headers.get('cookie') ?? null,
          url,
          user: {
            email: user.email,
            id: user.id,
            name: user.name,
          },
        }),
    },
  },
});

export type Auth = typeof auth;
export type AuthSession = typeof auth.$Infer.Session;
