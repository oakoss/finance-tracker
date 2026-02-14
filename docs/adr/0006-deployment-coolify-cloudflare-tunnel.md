# ADR 0006: Deploy with Coolify behind Cloudflare Tunnel

Date: 2026-02-13
Status: Accepted

## Context

Deployment target is a self-hosted Coolify server. Ingress is via Cloudflare Tunnel.

Coolify can build and run apps via:

- Nixpacks (auto-detect, generates Dockerfile)
- Dockerfile build pack
- Docker Compose

Cloudflare Tunnel commonly terminates HTTPS at Cloudflare, with HTTP between Cloudflare and origin.

Canonical domain: `finance.oakoss.dev` (redirect `.com` to `.dev`).

## Decision

Deploy using Coolify, with Cloudflare Tunnel as the ingress path.

We will start with Coolify build packs (Nixpacks) unless a Dockerfile is needed for reproducibility.

## Alternatives Considered

- Direct public ingress to Coolify proxy (no tunnel)
- Always use a repo Dockerfile from day one

## Consequences

- Positive: No public ports needed; easy app and DB management in Coolify.
- Negative: Must avoid misconfigured `http`/`https` settings to prevent redirect loops; cookies/auth can require "Full HTTPS/TLS" origin setup.
- Follow-ups: Decide tunnel mode ("All resources" via proxy vs "Single resource" via port mappings), document required Coolify settings, and ensure `BETTER_AUTH_URL` matches the public HTTPS domain.
