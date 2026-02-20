# ADR 0020: Logging — evlog + SigNoz

Date: 2026-02-20
Status: Accepted

## Context

We need structured, request-scoped logging for incident debugging and audit
traceability across the finance domain. Requirements:

- One log per request with full context (not scattered line-by-line logs).
- Audit trail for auth and finance actions per ADR 0015.
- PII-safe: hashed IDs, no tokens or secrets in logs.
- Centralized log aggregation with search and retention.
- Self-hosted to avoid vendor lock-in and control data residency.
- Works with TanStack Start (Nitro v3).

## Decision

- **Logger**: [evlog](https://evlog.dev) — wide-event model, Nitro v3 native,
  OTLP adapter, structured errors.
- **Sink**: [SigNoz](https://signoz.io) — open-source, OTLP-native, one-click
  on Coolify, handles multiple services and environments in a single instance.
- **Transport**: OTLP HTTP (`evlog/otlp`) via `createDrainPipeline` (batched,
  retried, flushed on shutdown).
- **Enrichers**: user agent, request size, trace context (built-in evlog).
- **Hashing**: HMAC-SHA256 with per-environment `LOG_HASH_SECRET` for user and
  entity IDs in audit events.

## Alternatives Considered

- **Pino / Winston / tslog**: traditional line-by-line loggers; no built-in
  request context aggregation or Nitro integration.
- **OpenTelemetry SDK directly**: vendor-neutral but heavier setup; evlog's
  OTLP adapter gives us OTEL compatibility without the boilerplate.
- **Grafana + Loki**: strong option but not a one-click Coolify service; would
  require manual Docker Compose setup of Loki + shipper + Grafana.
- **Dozzle**: real-time container log viewer only; no retention, search, or
  multi-app aggregation.
- **Axiom / Better Stack**: hosted options; rejected to keep data self-hosted.

## Consequences

- Positive: One structured log per request with full context for incident
  debugging. Audit events always kept regardless of sampling. Self-hosted,
  open-source, multi-environment in one SigNoz instance.
- Negative: SigNoz is heavier than a simple log shipper; requires its own
  Coolify resources. evlog is relatively new (no TanStack Start official
  example yet).
- Follow-ups: Add typed wide-event fields per domain. Set up SigNoz alerts
  (error rate, latency). Enable client log ingestion endpoint if needed.
  Consider preview environment log handling when previews are introduced.
