#!/usr/bin/env python3
"""
Run patient management tables migration
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
    print("Patient Management Tables Migration")
    print("=" * 70)

    # Read SQL file
    sql_file = os.path.join(os.path.dirname(__file__), 'create_patient_management_tables.sql')

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

        # Fetch verification results
        if cursor.description:
            results = cursor.fetchall()
            if results:
                print("\n📊 Migration verification:")
                print("Table Name                       | Column Count")
                print("-" * 60)
                for row in results:
                    print(f"{row[0]:32} | {row[1]}")

        print("\n✅ Migration completed successfully!")
        print("\n📝 Created tables:")
        print("   1. patient_info_t              - Patient basic information")
        print("   2. patient_timeline_t          - Treatment timeline stages")
        print("   3. patient_timeline_detail_t   - Timeline stage details")
        print("   4. patient_medical_image_t     - Medical images (pathology, X-ray, etc.)")
        print("   5. patient_metrics_t           - Examination metrics (ESR, CRP, etc.)")
        print("   6. patient_attachment_t        - File attachments")
        print("   7. patient_todo_t              - Patient todos/tasks")

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
