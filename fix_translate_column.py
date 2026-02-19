#!/usr/bin/env python3
"""
Pre-start migration script for Odoo 18 on Railway.
Fixes the ir_model_fields.translate column type mismatch when migrating
from an older Odoo version (where 'translate' was varchar) to Odoo 18
(where 'translate' is boolean).
"""
import os
import sys

try:
    import psycopg2
except ImportError:
    print("[migrate] psycopg2 not available, skipping migration.")
    sys.exit(0)


def get_db_params():
    """Get database connection parameters from environment variables."""
    db_host = os.environ.get("PGHOST") or os.environ.get("DB_HOST", "localhost")
    db_port = os.environ.get("PGPORT") or os.environ.get("DB_PORT", "5432")
    db_user = os.environ.get("PGUSER") or os.environ.get("DB_USER", "odoo")
    db_password = os.environ.get("PGPASSWORD") or os.environ.get("DB_PASSWORD", "")
    db_name = os.environ.get("PGDATABASE") or os.environ.get("DB_NAME", "railway")
    return {
        "host": db_host,
        "port": int(db_port),
        "user": db_user,
        "password": db_password,
        "dbname": db_name,
    }


def fix_translate_column(params):
    """Convert ir_model_fields.translate from varchar to boolean if needed."""
    try:
        conn = psycopg2.connect(**params)
        conn.autocommit = True
        cr = conn.cursor()

        # Check if the translate column exists and its current type
        cr.execute("""
            SELECT data_type
            FROM information_schema.columns
            WHERE table_name = 'ir_model_fields'
              AND column_name = 'translate'
        """)
        row = cr.fetchone()
        if not row:
            print("[migrate] Table ir_model_fields or column translate not found, skipping.")
            cr.close()
            conn.close()
            return

        col_type = row[0]
        if col_type == "boolean":
            print("[migrate] Column 'translate' is already boolean. No migration needed.")
            cr.close()
            conn.close()
            return

        print(f"[migrate] Column 'translate' is '{col_type}', converting to boolean...")
        cr.execute("""
            ALTER TABLE ir_model_fields
            ALTER COLUMN translate TYPE boolean
            USING CASE
                WHEN translate IN ('1', 'true', 'standard') THEN true
                ELSE false
            END
        """)
        print("[migrate] Successfully converted 'translate' column to boolean.")

        cr.close()
        conn.close()

    except psycopg2.OperationalError as e:
        print(f"[migrate] Could not connect to database: {e}")
        print("[migrate] Skipping migration (database may not exist yet).")
    except Exception as e:
        print(f"[migrate] Migration error: {e}")
        print("[migrate] Continuing anyway...")


if __name__ == "__main__":
    params = get_db_params()
    print(f"[migrate] Checking database '{params['dbname']}' at {params['host']}:{params['port']}...")
    fix_translate_column(params)
