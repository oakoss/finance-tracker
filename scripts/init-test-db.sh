#!/bin/sh
# Creates the test database alongside the default dev database.
# Mounted into /docker-entrypoint-initdb.d/; runs once on first
# container start (when the data volume is empty).
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
  CREATE DATABASE finance_tracker_test;
EOSQL
