#!/usr/bin/env python3
"""
Run care plan management tables migration
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
    print("Care Plan Management Tables Migration")
    print("=" * 70)

    # Read SQL file
    sql_file = os.path.join(os.path.dirname(__file__), 'create_care_plan_tables.sql')

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
        print("   1. care_plan_t                 - Care plan main table")
        print("   2. care_plan_medication_t      - Medication schedules")
        print("   3. care_plan_task_t            - Rehabilitation tasks")
        print("   4. care_plan_precaution_t      - Medical precautions and advice")
        print("   5. care_plan_completion_t      - Daily completion tracking")

        print("\n📊 Created indexes:")
        print("   - Patient ID, status, tenant_id on care_plan_t")
        print("   - Plan ID on medication, task, and precaution tables")
        print("   - Task category on care_plan_task_t")
        print("   - Patient ID + record date, item type + item ID on completion table")

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
