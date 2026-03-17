import type { DrainContext, EnrichContext } from 'evlog';
import type { NitroApp } from 'nitro/types';

import {
  createRequestSizeEnricher,
  createTraceContextEnricher,
  createUserAgentEnricher,
} from 'evlog/enrichers';
import { createOTLPDrain } from 'evlog/otlp';
import { createDrainPipeline } from 'evlog/pipeline';

import { sanitizeEvent } from './sanitize';

const enrichers = [
  createUserAgentEnricher(),
  createRequestSizeEnricher(),
  createTraceContextEnricher(),
];

export default function evlogDrainPlugin(nitroApp: NitroApp) {
  const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;

  if (!otlpEndpoint) {
    console.warn(
      '[evlog] OTEL_EXPORTER_OTLP_ENDPOINT is not set — logs will not be drained to SigNoz.',
    );
    return;
  }

  const environment =
    process.env.OTEL_RESOURCE_ATTRIBUTES?.split(',')
      .find((attr) => attr.startsWith('deployment.environment='))
      ?.split('=')[1] ?? 'development';

  const otlpDrain = createOTLPDrain({
    endpoint: otlpEndpoint,
    resourceAttributes: { 'deployment.environment': environment },
    serviceName: 'finance-tracker',
  });

  // Wrap OTLP drain in a pipeline for batching, retry, and buffer management
  const pipeline = createDrainPipeline<DrainContext>({
    batch: { intervalMs: 5000, size: 50 },
    maxBufferSize: 1000,
    onDropped: (events, error) => {
      console.error(
        `[evlog] dropped ${events.length} event(s) after retries exhausted`,
        error,
      );
    },
    retry: {
      backoff: 'exponential',
      initialDelayMs: 1000,
      maxAttempts: 3,
      maxDelayMs: 30_000,
    },
  });

  const drain = pipeline(async (batch) => {
    for (const ctx of batch) {
      const sanitized: DrainContext = {
        ...ctx,
        event: sanitizeEvent(
          ctx.event as unknown as Record<string, unknown>,
        ) as typeof ctx.event,
      };
      await otlpDrain(sanitized);
    }
  });

  if (!nitroApp.hooks) return;

  // Enrich events with user agent, request size, and trace context
  nitroApp.hooks.hook('evlog:enrich', (ctx: EnrichContext) => {
    for (const enricher of enrichers) enricher(ctx);
  });

  // Drain to SigNoz via pipeline (batched + retried + sanitized)
  nitroApp.hooks.hook('evlog:drain', drain);

  // Flush remaining buffered events on server shutdown
  nitroApp.hooks.hook('close', async () => {
    await drain.flush();
  });
}
