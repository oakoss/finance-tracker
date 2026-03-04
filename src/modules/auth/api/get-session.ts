import { createServerFn } from '@tanstack/react-start';
import { getRequestHeaders } from '@tanstack/react-start/server';

import { auth } from '@/lib/auth/server';
import { createError, log } from '@/lib/logging/evlog';

export const getSession = createServerFn({ method: 'GET' }).handler(
  async () => {
    const headers = getRequestHeaders();

    try {
      return await auth.api.getSession({ headers });
    } catch (error) {
      log.error({
        action: 'auth.session.fetch',
        error: error instanceof Error ? error.message : String(error),
        outcome: { success: false },
      });
      throw createError({
        cause: error instanceof Error ? error : new Error(String(error)),
        fix: 'Try refreshing the page. If the problem persists, clear your cookies and sign in again.',
        message: 'Unable to verify your session.',
        status: 500,
        why: error instanceof Error ? error.message : String(error),
      });
    }
  },
);
