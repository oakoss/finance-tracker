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
# PostHog sourcemap upload runs during `pnpm build` when both env
# vars are set (see vite.config.ts). BuildKit secret mounts expose
# the values to this one RUN command only — they're never written
# to any image layer, layer metadata, or build cache. Coolify
# configures the two secrets (`posthog_personal_api_key`,
# `posthog_project_id`) in its build-secrets UI. If either is
# missing at build time, the mount still succeeds with an empty
# string and vite.config.ts skips the plugin via its env-gate.
RUN --mount=type=secret,id=posthog_personal_api_key,env=POSTHOG_PERSONAL_API_KEY,required=false \
    --mount=type=secret,id=posthog_project_id,env=POSTHOG_PROJECT_ID,required=false \
    pnpm exec varlock typegen \
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
