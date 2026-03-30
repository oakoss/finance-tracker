# syntax=docker/dockerfile:1

# --- base ---
FROM node:24-alpine@sha256:01743339035a5c3c11a373cd7c83aeab6ed1457b55da6a69e014a95ac4e4700b AS base
RUN corepack enable pnpm
WORKDIR /app

# --- deps ---
FROM base AS deps
COPY package.json pnpm-lock.yaml .npmrc ./
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# --- build ---
FROM deps AS build
COPY . .
RUN pnpm exec varlock typegen \
 && pnpm paraglide:compile \
 && pnpm build \
 && pnpm exec esbuild scripts/migrate.mjs \
      --bundle --platform=node --format=esm --minify \
      --external:pg-native --outfile=.output/migrate.mjs

# --- production ---
# Nitro bundles the app into .output/. The migration script is also
# bundled (drizzle-orm + pg inlined). No npm install needed.
FROM node:24-alpine@sha256:01743339035a5c3c11a373cd7c83aeab6ed1457b55da6a69e014a95ac4e4700b AS production
RUN apk add --no-cache tini \
 && addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nodejs
WORKDIR /app

ENV NODE_ENV=production
ENV NITRO_PORT=3000

COPY --from=build --chown=nodejs:nodejs /app/drizzle/ ./drizzle/
COPY --from=build --chown=nodejs:nodejs /app/.output ./.output
COPY --chown=nodejs:nodejs scripts/docker-entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

USER nodejs
EXPOSE 3000
ENTRYPOINT ["tini", "--"]
CMD ["/entrypoint.sh"]
