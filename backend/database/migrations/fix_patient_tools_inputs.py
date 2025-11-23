"""
Migration script to remove tenant_id from patient_management MCP tools inputs.
This fixes the issue where LLM still passes tenant_id parameter.
"""
import logging
import json
import re
from database.client import get_db_session
from database.db_models import ToolInfo

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def fix_patient_tools_inputs():
    """
    Remove tenant_id from all patient_management tools inputs in the database.
    """
    with get_db_session() as session:
        # Find all patient_management tools
        tools = session.query(ToolInfo).filter(
            ToolInfo.usage == "nexent",
            ToolInfo.source == "mcp",
            ToolInfo.delete_flag != 'Y'
        ).all()

        updated_count = 0
        for tool in tools:
            if not tool.inputs:
                continue

            original_inputs = tool.inputs

            # Check if inputs contains tenant_id
            if 'tenant_id' not in original_inputs:
                continue

            try:
                # Parse inputs - it might be a string representation of a dict
                # The format is like: "{'patient_id': {...}, 'tenant_id': {...}, ...}"
                # We need to remove the tenant_id entry

                # Try to parse as Python dict string
                inputs_str = original_inputs

                # Remove tenant_id entry from the string
                # Pattern matches: 'tenant_id': {...}, or "tenant_id": {...},
                patterns = [
                    r"'tenant_id'\s*:\s*\{[^}]*\}\s*,?\s*",
                    r'"tenant_id"\s*:\s*\{[^}]*\}\s*,?\s*',
                ]

                new_inputs = inputs_str
                for pattern in patterns:
                    new_inputs = re.sub(pattern, '', new_inputs)

                # Clean up any trailing commas before closing brace
                new_inputs = re.sub(r',\s*}', '}', new_inputs)

                if new_inputs != original_inputs:
                    tool.inputs = new_inputs
                    updated_count += 1
                    logger.info(f"Updated tool: {tool.name}")
                    logger.info(f"  Old inputs: {original_inputs[:200]}...")
                    logger.info(f"  New inputs: {new_inputs[:200]}...")

            except Exception as e:
                logger.error(f"Failed to update tool {tool.name}: {e}")
                continue

        if updated_count > 0:
            session.commit()
            logger.info(f"Successfully updated {updated_count} tools")
        else:
            logger.info("No tools needed updating")

        return updated_count


if __name__ == "__main__":
    logger.info("Starting migration to fix patient tools inputs...")
    count = fix_patient_tools_inputs()
    logger.info(f"Migration completed. Updated {count} tools.")
