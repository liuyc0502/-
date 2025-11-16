#!/usr/bin/env python3
"""
Run conversation portal_type migration
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
    print("Conversation Portal Type Migration")
    print("=" * 70)
    
    # Read SQL file
    sql_file = os.path.join(os.path.dirname(__file__), 'add_portal_type_to_conversation.sql')
    
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
        
        # Fetch any results (like the verification query at the end)
        if cursor.description:
            results = cursor.fetchall()
            if results:
                print("\n📊 Migration results:")
                print("Portal Type | Conversation Count")
                print("-" * 40)
                for row in results:
                    print(f"{row[0] or 'NULL':12} | {row[1]}")
        
        print("\n✅ Migration completed successfully!")
        
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
