#!/usr/bin/env python3

"""
Run consultation record table migration
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

    # Read SQL file
    sql_file = os.path.join(os.path.dirname(__file__), 'create_consultation_record_table.sql')

    if not os.path.exists(sql_file):
        print(f"SQL file not found: {sql_file}")
        sys.exit(1)

    with open(sql_file, 'r', encoding='utf-8') as f:
        sql_content = f.read()

    print(f"\nSQL file loaded: {sql_file}")
    print(f"SQL length: {len(sql_content)} characters")

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

        # Execute migration
        print("\nExecuting migration...")
        cursor.execute(sql_content)

        # Fetch verification results
        if cursor.description:
            results = cursor.fetchall()
            if results:
                print("\nMigration verification:")
                print("Table Name                       | Column Count")
                print("-" * 60)
                for row in results:
                    print(f"{row[0]:32} | {row[1]}")

        print("\nMigration completed successfully!")
        print("\nCreated table:")
        print("   1. consultation_record_t  - Multi-agent debate consultation sessions")

        print("\nCreated indexes:")
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
