#!/usr/bin/env bash
# Recrée la base de test locale (PostgreSQL) avec le schéma, le contenu initial et les données de test.
set -euo pipefail
cd "$(dirname "$0")/../.."
export PGPASSWORD=postgres
psql -h localhost -U postgres -q -c "drop database if exists belavica with (force)" -c "create database belavica"
for f in supabase/migrations/*.sql tests/e2e/fixtures.sql; do
  psql -h localhost -U postgres -d belavica -v ON_ERROR_STOP=1 -q -f "$f"
done
echo "base de test prête"
