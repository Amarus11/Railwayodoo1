#!/bin/bash
set -e

# ---- Database connection setup (same as official Odoo entrypoint) ----
if [ -v PASSWORD_FILE ]; then
    PASSWORD="$(< $PASSWORD_FILE)"
fi

: "${HOST:=${DB_PORT_5432_TCP_ADDR:='db'}}"
: "${PORT:=${DB_PORT_5432_TCP_PORT:=5432}}"
: "${USER:=${DB_ENV_POSTGRES_USER:=${POSTGRES_USER:='odoo'}}}"
: "${PASSWORD:=${DB_ENV_POSTGRES_PASSWORD:=${POSTGRES_PASSWORD:='odoo'}}}"

DB_ARGS=()
check_config() {
    param="$1"
    value="$2"
    if grep -q -E "^\s*\b${param}\b\s*=" "$ODOO_RC" ; then
        value=$(grep -E "^\s*\b${param}\b\s*=" "$ODOO_RC" | cut -d " " -f3 | sed 's/["\r\n]//g')
    fi
    DB_ARGS+=("--${param}")
    DB_ARGS+=("${value}")
}
check_config "db_host" "$HOST"
check_config "db_port" "$PORT"
check_config "db_user" "$USER"
check_config "db_password" "$PASSWORD"

# Wait for PostgreSQL
wait-for-psql.py ${DB_ARGS[@]} --timeout=30

# ---- Auto-upgrade custom modules once per container start ----
DB_NAME="${PGDATABASE:-${DB_NAME:-odoo}}"
MARKER="/tmp/.odoo_upgraded"

if [ ! -f "$MARKER" ]; then
    echo "=== Upgrading custom modules on database '$DB_NAME' ==="
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
