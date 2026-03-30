# ADR 0021: Release and Deployment Strategy

Date: 2026-03-29
Status: Accepted

## Context

The app has a mature CI pipeline (static analysis, unit, integration,
E2E tests) but no deployment automation. ADR 0006 established Coolify
behind Cloudflare Tunnel as the deployment target, initially using
Nixpacks. We need an automated path from "CI passes on main" to "app
running in production."

## Decision

### Build pack: Dockerfile over Nixpacks

The build requires `varlock typegen` and `paraglide:compile` before
`vite build`. Nixpacks cannot know this. A multi-stage Dockerfile
provides reproducible, versioned builds. Coolify pulls the repo and
builds using the Dockerfile.

### Deploy trigger: continuous on push to main

Every push to main that passes CI triggers a deploy workflow that
hits the Coolify webhook. No semantic versioning or release tags.
The git SHA identifies each deployment. `workflow_dispatch` enables
manual re-deploys and rollbacks.

### Database migrations: Docker entrypoint

The entrypoint runs a programmatic migrator (`drizzle-orm`'s
`migrate()` function) before starting the app. This avoids
installing `drizzle-kit` in the production image. Production
database credentials stay in Coolify's environment (never in CI).
If migration fails, the container exits non-zero and Coolify
retains the previous container.

### Rollback

Coolify retains previous deployments. Rollback via the Coolify UI
or by triggering the deploy workflow manually after reverting on
main.

## Alternatives Considered

- **Nixpacks**: Simpler initial setup but not reproducible and
  cannot run the required pre-build steps.
- **CI-built images pushed to GHCR**: Offloads builds from Coolify
  but requires a "Docker Image" resource type. The existing Coolify
  resource uses the GitHub App, which only supports git-based build
  packs.
- **Tag-based releases with semver**: Adds ceremony without
  benefit for a private, single-tenant app.
- **Migrations in CI**: Requires CI to hold production database
  credentials, worse security posture.

## Consequences

- Positive: Fully automated deploy pipeline, zero manual steps
  after merge.
- Negative: Builds run on the Coolify server.
- Follow-ups: Set `COOLIFY_TOKEN` as an org secret and
  `COOLIFY_WEBHOOK` as a repo variable.
