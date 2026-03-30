import { createFileRoute } from '@tanstack/react-router';
import { ENV } from 'varlock/env';

import { analyticsConfig } from '@/configs/analytics';
import { log } from '@/lib/logging/evlog';

function getPostHogHost() {
  return ENV.POSTHOG_HOST ?? analyticsConfig.posthogDefaultHost;
}

async function proxy({ request }: { request: Request }) {
  try {
    const posthogHost = getPostHogHost();
    const url = new URL(request.url);
    const path = url.pathname.replace(analyticsConfig.posthogProxyPath, '');
    const target = `${posthogHost}${path}${url.search}`;

    const headers = new Headers(request.headers);
    headers.set('host', new URL(posthogHost).host);
    headers.delete('authorization');
    headers.delete('cookie');

    const response = await fetch(target, {
      body: request.body,
      // @ts-expect-error -- duplex required for streaming body in Node
      duplex: 'half',
      headers,
      method: request.method,
      signal: AbortSignal.timeout(10_000),
    });

    const responseHeaders = new Headers(response.headers);
    responseHeaders.delete('content-encoding');
    responseHeaders.delete('content-length');
    responseHeaders.delete('set-cookie');

    return new Response(response.body, {
      headers: responseHeaders,
      status: response.status,
    });
  } catch (error) {
    log.error({
      action: 'analytics.proxy',
      error: error instanceof Error ? error.message : String(error),
      outcome: { success: false },
    });
    return new Response(null, { status: 502 });
  }
}

export const Route = createFileRoute('/api/ingest/$')({
  server: { handlers: { GET: proxy, POST: proxy } },
});
