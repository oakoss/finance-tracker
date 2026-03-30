#!/bin/sh
set -e

if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL is not set"
  exit 1
fi

echo "Running database migrations..."
node .output/migrate.mjs

echo "Starting server..."
exec node .output/server/index.mjs
