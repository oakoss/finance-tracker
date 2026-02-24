import { createMiddleware } from '@tanstack/react-start';
import { getRequestHeaders } from '@tanstack/react-start/server';

import { auth } from '@/lib/auth';
import { log } from '@/lib/logging/evlog';

export const authMiddleware = createMiddleware().server(async ({ next }) => {
  const headers = getRequestHeaders();

  let session = null;
  try {
    session = await auth.api.getSession({ headers });
  } catch (error) {
    log.error({
      action: 'auth.middleware.session',
      error: error instanceof Error ? error.message : String(error),
      outcome: { success: false },
    });
  }

  return await next({ context: { session } });
});
