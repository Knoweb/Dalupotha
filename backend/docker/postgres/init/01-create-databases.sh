#!/bin/bash
# PostgreSQL initialization script
# Creates separate databases for each Dalupotha microservice
# Runs automatically on FIRST container start only

set -e

echo ">>> Creating Dalupotha microservice databases..."

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE DATABASE auth_db;
    CREATE DATABASE collection_db;
    CREATE DATABASE finance_db;
    CREATE DATABASE inventory_db;
    CREATE DATABASE notification_db;
    CREATE DATABASE staffing_db;
EOSQL

echo ">>> All 6 Dalupotha databases created successfully."

# Override pg_hba.conf to allow all connections without password
# This is SAFE for local development — do NOT use in production
echo ">>> Setting pg_hba.conf to trust all connections (local dev mode)..."
cat > "$PGDATA/pg_hba.conf" << 'HBAEOF'
# Dalupotha Local Dev — trust all connections (no password required)
local   all   all                trust
host    all   all   0.0.0.0/0   trust
host    all   all   ::/0        trust
HBAEOF

echo ">>> pg_hba.conf configured. PostgreSQL ready."
