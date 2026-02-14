import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { tanstackStartCookies } from 'better-auth/tanstack-start';

import { appConfig } from '@/configs/app';
import { db } from '@/db';
import { env } from '@/env';
import {
  sendResetPasswordEmail,
  sendVerificationEmail,
} from '@/modules/auth/email-service';

export const auth = betterAuth({
  appName: appConfig.name,
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, {
    provider: 'pg',
    usePlural: true,
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: env.PASSWORD_MIN_LENGTH,
    resetPasswordTokenExpiresIn: 60 * 60 * 2,
    sendResetPassword: async ({ user, url }) =>
      sendResetPasswordEmail({ user, url }),
    revokeSessionsOnPasswordReset: true,
  },
  emailVerification: {
    sendOnSignUp: true,
    sendOnSignIn: true,
    sendVerificationEmail: async ({ user, url }) =>
      sendVerificationEmail({ user, url }),
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
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ['email-password', 'google', 'github'],
      allowDifferentEmails: false,
      allowUnlinkingAll: false,
    },
    encryptOAuthTokens: process.env.NODE_ENV === 'production',
  },
  user: {
    changeEmail: {
      enabled: true,
      sendChangeEmailConfirmation: async ({ url, user }) =>
        sendVerificationEmail({
          url,
          user: {
            email: user.email,
            name: user.name,
          },
        }),
    },
    deleteUser: {
      enabled: true,
      sendDeleteAccountVerification: async ({ url, user }) =>
        sendVerificationEmail({
          url,
          user: {
            email: user.email,
            name: user.name,
          },
        }),
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    freshAge: 60 * 60 * 24,
    updateAge: 60 * 60 * 24,
  },
  rateLimit: {
    enabled: process.env.NODE_ENV === 'production',
    window: 60,
    max: 100,
  },
  trustedOrigins: env.TRUSTED_ORIGINS.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  experimental: {
    joins: true,
  },
  advanced: {
    ipAddress: {
      ipAddressHeaders: ['cf-connecting-ip'],
    },
    database: {
      generateId: 'uuid',
    },
  },
  plugins: [tanstackStartCookies()],
});

export type Auth = typeof auth;
export type AuthSession = typeof auth.$Infer.Session;
