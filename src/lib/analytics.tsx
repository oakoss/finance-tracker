import { PostHogProvider as Provider } from '@posthog/react';

import { analyticsConfig } from '@/configs/analytics';

const key = import.meta.env.VITE_PUBLIC_POSTHOG_KEY;
const host = import.meta.env.VITE_PUBLIC_POSTHOG_HOST;

const options = {
  api_host: host ?? analyticsConfig.posthogProxyPath,
  person_profiles: 'identified_only' as const,
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
