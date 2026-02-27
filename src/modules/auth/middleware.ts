import { createMiddleware } from '@tanstack/react-start';
import { getRequestHeaders } from '@tanstack/react-start/server';

import { auth } from '@/lib/auth';
import { createError, log } from '@/lib/logging/evlog';
import { toError } from '@/lib/validation';

export const authMiddleware = createMiddleware().server(async ({ next }) => {
  const headers = getRequestHeaders();

  let session = null;
  try {
    session = await auth.api.getSession({ headers });
  } catch (error) {
    const cause = toError(error);
    log.error({
      action: 'auth.middleware.session',
      error: cause.message,
      outcome: { success: false },
    });
    throw createError({
      cause,
      fix: 'Please try again in a moment.',
      message: 'Authentication service unavailable.',
      status: 503,
    });
  }

  return await next({ context: { session } });
});

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
