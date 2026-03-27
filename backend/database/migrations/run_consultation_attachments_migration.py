#!/usr/bin/env python3

"""
Run consultation attachments column migration
"""

import os
import sys
import psycopg2

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../'))

from consts.const import POSTGRES_DB, POSTGRES_USER, NEXENT_POSTGRES_PASSWORD, POSTGRES_HOST, POSTGRES_PORT


def main():
    """Execute the migration"""
    print("=" * 70)
    print("Consultation Attachments Column Migration")
    print("=" * 70)

    sql_file = os.path.join(os.path.dirname(__file__), 'add_consultation_attachments.sql')

    if not os.path.exists(sql_file):
        print(f"SQL file not found: {sql_file}")
        sys.exit(1)

    with open(sql_file, 'r', encoding='utf-8') as f:
        sql = f.read()

    try:
        conn = psycopg2.connect(
            dbname=POSTGRES_DB,
            user=POSTGRES_USER,
            password=NEXENT_POSTGRES_PASSWORD,
            host=POSTGRES_HOST,
            port=POSTGRES_PORT,
        )
        conn.autocommit = True
        cursor = conn.cursor()

        print("Executing migration...")
        cursor.execute(sql)

        # Check notices
        for notice in conn.notices:
            print(f"  {notice.strip()}")

        print("Migration completed successfully!")

        cursor.close()
        conn.close()

    except Exception as e:
        print(f"Migration failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
