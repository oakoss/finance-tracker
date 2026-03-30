#!/bin/sh
set -e

if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL is not set"
  exit 1
fi

echo "Running database migrations..."
node scripts/migrate.mjs

echo "Starting server..."
exec varlock run -- node .output/server/index.mjs
