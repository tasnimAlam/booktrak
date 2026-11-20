#!/bin/sh
# One DB role per service, each limited to its own schema.
# A .sh (not .sql) because it needs the passwords from env. Runs after 01/02, on first start only.
set -eu
psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  -v auth_pw="$AUTH_DB_PASSWORD" -v books_pw="$BOOKS_DB_PASSWORD" <<'SQL'
CREATE ROLE auth_svc LOGIN PASSWORD :'auth_pw';
ALTER ROLE auth_svc SET search_path = auth;
GRANT USAGE ON SCHEMA auth TO auth_svc;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA auth TO auth_svc;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA auth TO auth_svc;

CREATE ROLE books_svc LOGIN PASSWORD :'books_pw';
ALTER ROLE books_svc SET search_path = books;
GRANT USAGE ON SCHEMA books TO books_svc;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA books TO books_svc;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA books TO books_svc;
SQL
