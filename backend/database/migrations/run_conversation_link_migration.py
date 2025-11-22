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
            # Remove single-line comments
            lines = []
            in_multiline_comment = False
            for line in sql_content.split('\n'):
                line_stripped = line.strip()
                # Skip empty lines and comments
                if not line_stripped or line_stripped.startswith('--'):
                    continue
                # Handle multiline comments
                if '/*' in line:
                    in_multiline_comment = True
                if '*/' in line:
                    in_multiline_comment = False
                    continue
                if in_multiline_comment:
                    continue
                lines.append(line)
            
            # Join and execute as single block
            cleaned_sql = '\n'.join(lines)
            
            try:
                logger.info("Executing migration SQL...")
                # Execute the entire SQL block at once
                session.execute(text(cleaned_sql))
                session.commit()
                logger.info("Migration SQL executed successfully")
            except Exception as e:
                logger.error(f"Error executing migration: {str(e)}")
                session.rollback()
                raise
 
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