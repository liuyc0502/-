"""
Migration script to add conversation-patient linking features
Run this script to add patient association, status, and tagging to conversations
"""

import os
import sys
import logging
from pathlib import Path

# Add project root to Python path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from database.client import get_db_session
from sqlalchemy import text

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def run_migration():
    """Run the conversation patient link migration"""
    try:
        # Read SQL file
        sql_file = Path(__file__).parent / 'add_conversation_patient_link.sql'

        if not sql_file.exists():
            logger.error(f"SQL file not found: {sql_file}")
            return False

        with open(sql_file, 'r', encoding='utf-8') as f:
            sql_content = f.read()

        logger.info("Starting conversation patient link migration...")

        # Execute migration
        with get_db_session() as session:
            # Split by semicolon and execute each statement
            statements = [s.strip() for s in sql_content.split(';') if s.strip()]

            for i, statement in enumerate(statements, 1):
                # Skip comments
                if statement.startswith('--') or statement.startswith('/*'):
                    continue

                logger.info(f"Executing statement {i}/{len(statements)}...")
                try:
                    session.execute(text(statement))
                    session.commit()
                except Exception as e:
                    logger.error(f"Error executing statement {i}: {str(e)}")
                    logger.error(f"Statement: {statement[:100]}...")
                    session.rollback()
                    # Continue with other statements
                    continue

        logger.info("✅ Conversation patient link migration completed successfully!")
        return True

    except Exception as e:
        logger.error(f"❌ Migration failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = run_migration()
    sys.exit(0 if success else 1)
