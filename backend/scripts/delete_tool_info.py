#!/usr/bin/env python3
"""
Temporary script to delete data from ag_tool_info_t table
"""
import sys
import os

# Add backend directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database.client import get_db_session
from sqlalchemy import text
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def delete_tool_info():
    """Delete all data from nexent.ag_tool_info_t table"""
    try:
        with get_db_session() as session:
            # First, check how many records exist
            count_query = text("SELECT COUNT(*) FROM nexent.ag_tool_info_t")
            result = session.execute(count_query)
            count = result.scalar()
            logger.info(f"Current record count: {count}")
            
            if count == 0:
                logger.info("Table is already empty, nothing to delete.")
                return
            
            # Execute delete
            delete_query = text("DELETE FROM nexent.ag_tool_info_t")
            result = session.execute(delete_query)
            deleted_count = result.rowcount
            session.commit()
            
            logger.info(f"Successfully deleted {deleted_count} records from nexent.ag_tool_info_t")
            
            # Verify deletion
            result = session.execute(count_query)
            remaining_count = result.scalar()
            logger.info(f"Remaining record count: {remaining_count}")
            
    except Exception as e:
        logger.error(f"Error deleting data: {str(e)}")
        raise

if __name__ == "__main__":
    delete_tool_info()

