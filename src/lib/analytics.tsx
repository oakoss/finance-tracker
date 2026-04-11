import { PostHogProvider as Provider } from 'posthog-js/react';
import { ENV } from 'varlock/env';

import { analyticsConfig } from '@/configs/analytics';

const key = ENV.POSTHOG_KEY;

// Always route client events through the app's own `/api/ingest/*`
// proxy (src/routes/api/ingest/$.ts). Sending them direct to
// posthog.com gets them blocked by ad-blocker rules (uBlock Origin,
// Brave Shields, Firefox ETP strict) that treat the host as a
// tracker. The proxy runs on the same origin, so nothing blocks it;
// the upstream host is resolved server-side from `ENV.POSTHOG_HOST`.
//
// Do NOT reintroduce a `host ?? proxyPath` fallback here — any
// truthy `POSTHOG_HOST` inlined at build time silently defeats the
// proxy (which is how we got here in the first place).
const options = {
  api_host: analyticsConfig.posthogProxyPath,
  capture_exceptions: {
    capture_console_errors: false,
    capture_unhandled_errors: true,
    capture_unhandled_rejections: true,
  },
  defaults: '2026-01-30' as const,
  person_profiles: 'identified_only' as const,
  session_recording: { maskAllInputs: true, maskTextContent: true },
  ui_host: analyticsConfig.posthogUiHost,
};

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  if (!key) return children;

  return (
    <Provider apiKey={key} options={options}>
      {children}
    </Provider>
  );
}
