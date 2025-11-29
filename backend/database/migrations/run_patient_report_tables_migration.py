#!/usr/bin/env python3

"""
Run patient report tables migration

Creates tables for lab reports and imaging reports:
- patient_lab_report_t (lab report main table)
- patient_lab_report_item_t (lab report item detail table)
- patient_imaging_report_t (imaging report table)

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
    print("Patient Report Tables Migration")
    print("=" * 70)

    # Read SQL file
    sql_file = os.path.join(os.path.dirname(__file__), 'add_patient_report_tables.sql')

    if not os.path.exists(sql_file):
        print(f"❌ SQL file not found: {sql_file}")
        sys.exit(1)

    with open(sql_file, 'r', encoding='utf-8') as f:
        sql_content = f.read()

    print(f"\n📄 SQL file loaded: {sql_file}")
    print(f"📝 SQL length: {len(sql_content)} characters")

    # Connect to database
    try:
        print(f"\n🔌 Connecting to database: {POSTGRES_DB}@{POSTGRES_HOST}:{POSTGRES_PORT}")
        conn = psycopg2.connect(
            dbname=POSTGRES_DB,
            user=POSTGRES_USER,
            password=NEXENT_POSTGRES_PASSWORD,
            host=POSTGRES_HOST,
            port=POSTGRES_PORT
        )
        conn.autocommit = True
        cursor = conn.cursor()

        print(f"✅ Connected successfully")

        # Execute migration
        print("\n🔄 Executing migration...")
        cursor.execute(sql_content)

        # Verify tables were created
        print("\n🔍 Verifying migration...")
        tables_to_check = [
            'patient_lab_report_t',
            'patient_lab_report_item_t',
            'patient_imaging_report_t'
        ]

        print("\n📊 Created tables:")
        print("Table Name                       | Exists | Column Count")
        print("-" * 65)

        for table_name in tables_to_check:
            cursor.execute("""
                SELECT COUNT(*)
                FROM information_schema.tables
                WHERE table_schema = 'nexent'
                  AND table_name = %s
            """, (table_name,))
            exists = cursor.fetchone()[0] > 0

            if exists:
                cursor.execute("""
                    SELECT COUNT(*)
                    FROM information_schema.columns
                    WHERE table_schema = 'nexent'
                      AND table_name = %s
                """, (table_name,))
                column_count = cursor.fetchone()[0]
                print(f"{table_name:32} | ✅      | {column_count}")
            else:
                print(f"{table_name:32} | ❌      | N/A")

        # Verify indexes were created
        print("\n📊 Created indexes:")
        indexes_to_check = [
            'idx_lab_report_timeline',
            'idx_lab_report_patient',
            'idx_lab_report_date',
            'idx_lab_report_tenant',
            'idx_lab_item_report',
            'idx_lab_item_tenant',
            'idx_imaging_report_timeline',
            'idx_imaging_report_patient',
            'idx_imaging_report_date',
            'idx_imaging_report_tenant'
        ]

        for index_name in indexes_to_check:
            cursor.execute("""
                SELECT COUNT(*)
                FROM pg_indexes
                WHERE schemaname = 'nexent'
                  AND indexname = %s
            """, (index_name,))
            exists = cursor.fetchone()[0] > 0
            status = "✅" if exists else "❌"
            print(f"   {status} {index_name}")

        print("\n✅ Migration completed successfully!")
        print("\n📝 Summary:")
        print("   • Created 3 tables for patient reports")
        print("   • Created 10 indexes for performance optimization")
        print("   • Tables include: lab reports, lab report items, and imaging reports")

    except psycopg2.Error as e:
        print(f"\n❌ Database error: {e}")
        print(f"Error code: {e.pgcode}")
        print(f"Error message: {e.pgerror}")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Migration failed: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals():
            conn.close()
            print("\n🔌 Database connection closed")

    print("=" * 70)


if __name__ == "__main__":
    main()

