"""
Run learning record table migration

This script creates the doctor_learning_record_t table for tracking
knowledge base learning activities.
"""

import os
import sys
from pathlib import Path

# Add backend directory to Python path
backend_dir = Path(__file__).parent.parent.parent
sys.path.insert(0, str(backend_dir))

from database.client import get_db_session
from sqlalchemy import text
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def run_migration():
    """Run the learning record table migration"""
    migration_file = Path(__file__).parent / "create_learning_record_table.sql"

    if not migration_file.exists():
        logger.error(f"Migration file not found: {migration_file}")
        return False

    try:
        with open(migration_file, "r", encoding="utf-8") as f:
            sql_content = f.read()

        with get_db_session() as session:
            # Execute the SQL migration
            session.execute(text(sql_content))
            session.commit()

        logger.info("Learning record table migration completed successfully")
        return True

    except Exception as e:
        logger.error(f"Migration failed: {str(e)}")
        return False


if __name__ == "__main__":
    success = run_migration()
    sys.exit(0 if success else 1)
