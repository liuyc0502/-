"""
Clean up tool info table - One-time script
Run this to clear old tool records from database
"""
import sys
sys.path.insert(0, '/home/user/-/backend')

from database.client import get_db_session
from database.db_models import ToolInfo

def clean_tool_table():
    """Delete all tool records from ag_tool_info_t"""
    with get_db_session() as session:
        count = session.query(ToolInfo).filter(ToolInfo.delete_flag != 'Y').count()
        print(f"Found {count} tool records")

        # Delete all
        deleted = session.query(ToolInfo).delete()
        print(f"Deleted {deleted} tool records")

    print("Done! Restart the server to re-scan tools.")

if __name__ == "__main__":
    confirm = input("This will DELETE ALL tool records. Type 'yes' to confirm: ")
    if confirm.lower() == 'yes':
        clean_tool_table()
    else:
        print("Cancelled")
