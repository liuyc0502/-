#!/usr/bin/env python3
"""
Run case library tables migration using SQLAlchemy
"""
import os
import sys

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../'))

from database.client import get_db_session
from sqlalchemy import text


def main():
    """Execute the migration"""
    print("=" * 70)
    print("Case Library Tables Migration (SQLAlchemy)")
    print("=" * 70)

    # Read SQL file
    sql_file = os.path.join(os.path.dirname(__file__), 'create_case_library_tables.sql')

    if not os.path.exists(sql_file):
        print(f"❌ SQL file not found: {sql_file}")
        sys.exit(1)

    with open(sql_file, 'r', encoding='utf-8') as f:
        sql_content = f.read()

    print(f"\n📄 SQL file loaded: {sql_file}")
    print(f"📝 SQL length: {len(sql_content)} characters")

    # Execute migration using SQLAlchemy
    try:
        print(f"\n🔄 Executing migration using SQLAlchemy...")

        with get_db_session() as session:
            # Execute the SQL content
            session.execute(text(sql_content))
            session.commit()

            # Verify tables were created
            verify_sql = text("""
                SELECT table_name,
                    (SELECT COUNT(*) FROM information_schema.columns
                     WHERE table_schema = 'nexent' AND table_name = t.table_name) as column_count
                FROM information_schema.tables t
                WHERE table_schema = 'nexent'
                AND table_name LIKE 'case_%'
                ORDER BY table_name;
            """)

            result = session.execute(verify_sql)
            rows = result.fetchall()

            if rows:
                print("\n📊 Migration verification:")
                print("Table Name                       | Column Count")
                print("-" * 60)
                for row in rows:
                    print(f"{row[0]:32} | {row[1]}")

                print("\n✅ Migration completed successfully!")
                print("\n📝 Created tables:")
                print("   1. case_info_t                - Case library basic information")
                print("   2. case_laboratory_test_t     - Laboratory test results")
            else:
                print("\n⚠️  Warning: No case tables found after migration")

    except Exception as e:
        print(f"\n❌ Migration failed: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

    print("=" * 70)


if __name__ == "__main__":
    main()
