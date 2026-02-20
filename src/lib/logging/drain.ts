import type { DrainContext, EnrichContext } from 'evlog';
import {
  createRequestSizeEnricher,
  createTraceContextEnricher,
  createUserAgentEnricher,
} from 'evlog/enrichers';
import { createOTLPDrain } from 'evlog/otlp';
import { createDrainPipeline } from 'evlog/pipeline';
import type { NitroApp } from 'nitro/types';

/**
 * Keys that must never be forwarded to the drain (last-line-of-defense).
 * Sanitization at the source is the primary strategy; this is a safety net.
 */
const SENSITIVE_KEYS = new Set([
  'apikey',
  'api_key',
  'authorization',
  'cookie',
  'password',
  'secret',
  'token',
]);

const sanitizeEvent = (
  obj: Record<string, unknown>,
): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      result[key] = '[REDACTED]';
    } else if (
      value !== null &&
      typeof value === 'object' &&
      !Array.isArray(value)
    ) {
      result[key] = sanitizeEvent(value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }
  return result;
};

const enrichers = [
  createUserAgentEnricher(),
  createRequestSizeEnricher(),
  createTraceContextEnricher(),
];

export default function evlogDrainPlugin(nitroApp: NitroApp) {
  const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;

  if (!otlpEndpoint) {
    // eslint-disable-next-line no-console
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
    resourceAttributes: {
      'deployment.environment': environment,
    },
    serviceName: 'finance-tracker',
  });

  // Wrap OTLP drain in a pipeline for batching, retry, and buffer management
  const pipeline = createDrainPipeline<DrainContext>({
    batch: {
      size: 50,
      intervalMs: 5000,
    },
    retry: {
      maxAttempts: 3,
      backoff: 'exponential',
      initialDelayMs: 1000,
      maxDelayMs: 30_000,
    },
    maxBufferSize: 1000,
    onDropped: (events, error) => {
      // eslint-disable-next-line no-console
      console.error(
        `[evlog] dropped ${events.length} event(s) after retries exhausted`,
        error,
      );
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
