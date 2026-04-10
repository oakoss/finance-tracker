import { createMiddleware } from '@tanstack/react-start';
import { getRequestHeaders } from '@tanstack/react-start/server';

import { auth } from '@/lib/auth/server';
import { toError } from '@/lib/form/validation';
import { createError, log } from '@/lib/logging/evlog';
import { hashId } from '@/lib/logging/hash';

async function loadSession() {
  const headers = getRequestHeaders();

  return auth.api.getSession({ headers }).catch((error) => {
    const cause = toError(error);
    log.error({
      action: 'auth.middleware.session',
      error: cause.message,
      outcome: { stack: cause.stack, success: false },
    });
    throw createError({
      cause,
      fix: 'Please try again in a moment.',
      message: 'Authentication service unavailable.',
      status: 503,
    });
  });
}

export const authMiddleware = createMiddleware().server(async ({ next }) => {
  const session = await loadSession();
  return next({ context: { session } });
});

/**
 * Pure check for the verified-mutation gate. Throws 401 if there is
 * no session, 403 if the session's user hasn't verified their email.
 * Extracted from `verifiedMutationMiddleware` so it is unit-testable
 * without the middleware runtime.
 */
export function requireVerifiedSession(
  session: Awaited<ReturnType<typeof auth.api.getSession>> | null,
): void {
  if (!session?.user) {
    log.warn({
      action: 'auth.unauthorized',
      outcome: { reason: 'no_session' },
    });
    throw createError({
      fix: 'Please log in again.',
      message: 'Unauthorized',
      status: 401,
      why: 'No active session.',
    });
  }

  if (!session.user.emailVerified) {
    log.warn({
      action: 'auth.unverified_mutation_blocked',
      user: { idHash: hashId(session.user.id) },
    });
    throw createError({
      fix: 'Check your inbox for a verification link, or resend it from the banner at the top of the app.',
      message: 'Please verify your email before making changes.',
      status: 403,
      why: 'This action is blocked until your email is verified.',
    });
  }
}

/**
 * Middleware for server functions that mutate data. Requires an
 * authenticated session and a verified email. Reads and self-service
 * flows stay on `authMiddleware` so an unverified user is never
 * trapped — a typo'd email is always recoverable and they can
 * always leave or export their data. The authoritative exempt
 * list lives in `src/modules/auth/middleware-chain.test.ts`.
 */
export const verifiedMutationMiddleware = createMiddleware().server(
  async ({ next }) => {
    const session = await loadSession();
    requireVerifiedSession(session);
    return next({ context: { session } });
  },
);

export function requireUserId(context: {
  session: Awaited<ReturnType<typeof auth.api.getSession>> | null;
}): string {
  const userId = context.session?.user?.id;
  if (!userId) {
    log.warn({
      action: 'auth.unauthorized',
      outcome: { reason: 'no_session' },
    });
    throw createError({
      fix: 'Please log in again.',
      message: 'Unauthorized',
      status: 401,
      why: 'No active session.',
    });
  }
  return userId;
}
