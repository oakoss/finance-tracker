import { PostHog } from 'posthog-node';
import { ENV } from 'varlock/env';

import { analyticsConfig } from '@/configs/analytics';
import { log } from '@/lib/logging/evlog';

let client: PostHog | null = null;

/**
 * Lazy-initialized server-side PostHog client. Returns null when
 * POSTHOG_KEY is unset (local dev, CI) or if initialization
 * fails. Configured for serverless: flushes immediately after
 * each event.
 */
export function getPostHogServer(): PostHog | null {
  if (client) return client;

  const key = ENV.POSTHOG_KEY;
  if (!key) return null;

  try {
    client = new PostHog(key, {
      enableExceptionAutocapture: true,
      flushAt: 1,
      flushInterval: 0,
      host: ENV.POSTHOG_HOST ?? analyticsConfig.posthogDefaultHost,
    });
  } catch (error) {
    log.error({
      action: 'analytics.server.init',
      error: error instanceof Error ? error.message : String(error),
      outcome: { success: false },
    });
    return null;
  }

  return client;
}
