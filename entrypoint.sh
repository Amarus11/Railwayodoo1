#!/bin/bash
set -e

# ---- Map Railway env vars to Odoo connection params ----
DB_HOST="${ODOO_DATABASE_HOST:-${HOST:-db}}"
DB_PORT="${ODOO_DATABASE_PORT:-${PORT:-5432}}"
DB_USER="${ODOO_DATABASE_USER:-${USER:-odoo}}"
DB_PASS="${ODOO_DATABASE_PASSWORD:-${PASSWORD:-odoo}}"
DB_NAME="${ODOO_DATABASE_NAME:-${PGDATABASE:-odoo}}"

DB_ARGS=("--db_host" "$DB_HOST" "--db_port" "$DB_PORT" "--db_user" "$DB_USER" "--db_password" "$DB_PASS")

# ---- Wait for PostgreSQL ----
echo "=== Waiting for PostgreSQL at $DB_HOST:$DB_PORT ==="
for i in $(seq 1 30); do
    if python3 -c "
import psycopg2, sys
try:
    conn = psycopg2.connect(host='$DB_HOST', port=$DB_PORT, user='$DB_USER', password='$DB_PASS', dbname='$DB_NAME')
    conn.close()
    sys.exit(0)
except Exception:
    sys.exit(1)
" 2>/dev/null; then
        echo "PostgreSQL is ready."
        break
    fi
    echo "Waiting for PostgreSQL... ($i/30)"
    sleep 2
done

# ---- Auto-upgrade custom modules once per container start ----
MARKER="/tmp/.odoo_upgraded"

if [ ! -f "$MARKER" ]; then
    echo "=== Upgrading project_timesheet_time_control on '$DB_NAME' ==="
    odoo --no-http --stop-after-init \
        -d "$DB_NAME" \
        -u project_timesheet_time_control \
        "${DB_ARGS[@]}" \
        2>&1 | tail -30 || echo "Warning: upgrade returned non-zero (module may not be installed yet)"
    touch "$MARKER"
    echo "=== Upgrade complete ==="
fi

# ---- Start Odoo normally ----
echo "=== Starting Odoo ==="
exec odoo "$@" "${DB_ARGS[@]}"
