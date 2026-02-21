#!/bin/bash
set -e

# Determine the database name from environment or odoo config
DB_NAME="${PGDATABASE:-${DB_NAME:-odoo}}"

# Marker file to track if upgrade has been done for this build
MARKER="/tmp/.odoo_upgraded"

if [ ! -f "$MARKER" ]; then
    echo "=== Upgrading custom modules on database '$DB_NAME' ==="
    odoo --no-http --stop-after-init \
        -d "$DB_NAME" \
        -u project_timesheet_time_control \
        2>&1 | tail -20 || echo "Warning: upgrade returned non-zero (module may not be installed yet, will be installed on first access)"
    touch "$MARKER"
    echo "=== Upgrade complete ==="
fi

echo "=== Starting Odoo ==="
exec odoo "$@"
