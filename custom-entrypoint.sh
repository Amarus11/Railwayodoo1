#!/bin/bash
set -e

echo "[entrypoint] Running pre-start migration..."
python3 /mnt/extra-addons/fix_translate_column.py

echo "[entrypoint] Starting Odoo..."
exec /entrypoint.sh "$@"
