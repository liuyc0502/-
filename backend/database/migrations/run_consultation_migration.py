#!/usr/bin/env python3

"""
Run consultation record migrations: table creation and follow-up ALTERs.
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
    print("Consultation Record Table Migration")
    print("=" * 70)

    migration_dir = os.path.dirname(__file__)
    sql_files = [
        os.path.join(migration_dir, 'create_consultation_record_table.sql'),
        os.path.join(migration_dir, 'add_consensus_metrics.sql'),
    ]

    for path in sql_files:
        if not os.path.exists(path):
            print(f"SQL file not found: {path}")
            sys.exit(1)

    # Connect to database
    try:
        print(f"\nConnecting to database: {POSTGRES_DB}@{POSTGRES_HOST}:{POSTGRES_PORT}")
        conn = psycopg2.connect(
            dbname=POSTGRES_DB,
            user=POSTGRES_USER,
            password=NEXENT_POSTGRES_PASSWORD,
            host=POSTGRES_HOST,
            port=POSTGRES_PORT
        )
        conn.autocommit = True
        cursor = conn.cursor()

        print("Connected successfully")

        for sql_file in sql_files:
            with open(sql_file, 'r', encoding='utf-8') as f:
                sql_content = f.read()

            print(f"\n--- {os.path.basename(sql_file)} ---")
            print(f"SQL length: {len(sql_content)} characters")

            print("\nExecuting migration...")
            cursor.execute(sql_content)

            # Fetch verification results (only create script ends with SELECT)
            if cursor.description:
                results = cursor.fetchall()
                if results:
                    print("\nMigration verification:")
                    print("Table Name                       | Column Count")
                    print("-" * 60)
                    for row in results:
                        print(f"{row[0]:32} | {row[1]}")

        print("\nMigration completed successfully!")
        print("\nCreated / updated:")
        print("   1. consultation_record_t  - Multi-agent debate consultation sessions")
        print("   2. consensus_metrics column (JSONB) when applicable")

        print("\nCreated indexes (if new table):")
        print("   - idx_consultation_record_uuid")
        print("   - idx_consultation_record_tenant")
        print("   - idx_consultation_record_conversation")
        print("   - idx_consultation_record_patient")

    except psycopg2.Error as e:
        print(f"\nDatabase error: {e}")
        print(f"Error code: {e.pgcode}")
        print(f"Error message: {e.pgerror}")
        sys.exit(1)

    except Exception as e:
        print(f"\nMigration failed: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals():
            conn.close()
            print("\nDatabase connection closed")

    print("=" * 70)


if __name__ == "__main__":
    main()
