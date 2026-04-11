# syntax=docker/dockerfile:1.10

# --- varlock binary ---
# Keep version in sync with the `varlock` entry in package.json.
FROM ghcr.io/dmno-dev/varlock:0.7.2 AS varlock

# --- base ---
FROM node:24.14.1-alpine@sha256:01743339035a5c3c11a373cd7c83aeab6ed1457b55da6a69e014a95ac4e4700b AS base
RUN corepack enable pnpm
WORKDIR /app

# --- deps ---
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# --- build ---
FROM deps AS build
COPY . .
ENV APP_ENV=test
# The build RUN needs two kinds of env vars:
#   1. Every @public var in .env.schema, because varlock's vite
#      plugin inlines them into the client bundle during
#      `pnpm build` (POSTHOG_KEY, BETTER_AUTH_URL, etc.).
#   2. POSTHOG_PERSONAL_API_KEY + POSTHOG_PROJECT_ID for the
#      sourcemap upload plugin in vite.config.ts.
#
# Do NOT add explicit `--mount=type=secret` flags here. Coolify's
# "Use Docker Build Secrets" rewriter (enabled on the app's
# Environment Variables page) injects mounts for every build var
# onto each RUN — but it skips any RUN that already has its own
# `--mount=type=secret`. The check is in coollabsio/coolify at
# `app/Jobs/ApplicationDeploymentJob.php`:
#     if (str_contains($line, '--mount=type=secret') || …) {
#         return $line;  // untouched
#     }
# A single explicit mount starves this step of every other build
# var Coolify would inject, which silently ships the client
# bundle with `.env.schema` test defaults (empty POSTHOG_KEY →
# Rolldown's minifier dead-code-eliminates the PostHogProvider
# branch since `const key = ""` is always falsy).
#
# To verify after a deploy: fetch the production client bundle
# (`main-*.js` from the site root) and grep for `phc_` — the
# real POSTHOG_KEY prefix. Zero matches means this trap has
# re-triggered.
#
# Local `docker build` outside Coolify has no secret-mount path
# for the two PostHog vars and cannot upload sourcemaps; that's
# intentional. Coolify is the only authoritative upload source
# (CI workflows also intentionally skip — see ci.yml). A plain
# local build still succeeds: vite.config.ts's env-gate skips
# the sourcemap plugin when the vars are unset, and varlock
# falls back to the `APP_ENV=test` defaults in `.env.schema`.
#
# Do NOT convert these to ARG/ENV either — that would leak the
# values into image layer metadata.
RUN pnpm exec varlock typegen \
 && pnpm paraglide:compile \
 && pnpm build

# --- production ---
# Nitro bundles the app into .output/. Only drizzle-orm + pg needed
# for the programmatic migration script.
FROM node:24.14.1-alpine@sha256:01743339035a5c3c11a373cd7c83aeab6ed1457b55da6a69e014a95ac4e4700b AS production
COPY --from=varlock /usr/local/bin/varlock /usr/local/bin/varlock
RUN apk add --no-cache tini curl \
 && addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nodejs
WORKDIR /app
RUN mkdir -p src && chown nodejs:nodejs src

ENV NODE_ENV=production
ENV NITRO_PORT=3000

# Migration deps (keep versions in sync with package.json)
COPY --from=build --chown=nodejs:nodejs /app/drizzle/ ./drizzle/
COPY --chown=nodejs:nodejs scripts/migrate.mjs ./scripts/
RUN npm install --no-save drizzle-orm@0.45.2 pg@8.20.0

COPY --from=build --chown=nodejs:nodejs /app/.env.schema ./.env.schema
COPY --from=build --chown=nodejs:nodejs /app/.output ./.output
COPY --chown=nodejs:nodejs scripts/docker-entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

USER nodejs
EXPOSE 3000
ENTRYPOINT ["tini", "--"]
CMD ["/entrypoint.sh"]
