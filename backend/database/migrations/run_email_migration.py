#!/usr/bin/env python3
"""
Run email and diagnosis fields migration for patient_info_t table
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
    print("Add Email and Diagnosis Fields Migration")
    print("=" * 70)

    # Read SQL file
    sql_file = os.path.join(os.path.dirname(__file__), 'add_email_and_diagnosis_to_patient.sql')

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

        # Verify the migration
        print("\n🔍 Verifying migration...")
        cursor.execute("""
            SELECT column_name, data_type, character_maximum_length
            FROM information_schema.columns
            WHERE table_schema = 'nexent'
            AND table_name = 'patient_info_t'
            AND column_name IN ('email', 'diagnosis')
            ORDER BY column_name;
        """)
        
        results = cursor.fetchall()
        if results:
            print("\n📊 Migration verification:")
            print("Column Name  | Data Type | Max Length")
            print("-" * 50)
            for row in results:
                print(f"{row[0]:12} | {row[1]:9} | {row[2] or 'N/A'}")

        print("\n✅ Migration completed successfully!")
        print("\n📝 Added columns:")
        print("   1. email      - Email address for patient portal login (VARCHAR(200))")
        print("   2. diagnosis  - Current primary diagnosis (VARCHAR(500))")
        print("\n📊 Created indexes:")
        print("   1. idx_patient_email        - Unique index on email")
        print("   2. idx_patient_email_lookup - Regular index on email")

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

