"""
Service layer for doctor learning records
"""

import logging
from typing import List, Dict, Optional
from consts.exceptions import AgentRunException
from database import learning_record_db

logger = logging.getLogger(__name__)


async def record_view_service(
    user_id: str,
    tenant_id: str,
    file_path: str,
    file_name: str,
    category: Optional[str],
    time_spent_seconds: int
) -> dict:
    """
    Record or update a knowledge view
    """
    try:
        result = learning_record_db.record_view(
            user_id=user_id,
            tenant_id=tenant_id,
            file_path=file_path,
            file_name=file_name,
            category=category,
            time_spent_seconds=time_spent_seconds
        )
        return {
            "success": True,
            "record": result,
            "message": "Learning view recorded successfully"
        }
    except Exception as e:
        logger.error(f"Failed to record learning view: {str(e)}")
        raise AgentRunException(f"Failed to record learning view: {str(e)}")


async def get_user_records_service(
    user_id: str,
    tenant_id: str,
    limit: int = 100
) -> List[dict]:
    """
    Get all learning records for a user
    """
    try:
        records = learning_record_db.get_user_records(
            user_id=user_id,
            tenant_id=tenant_id,
            limit=limit
        )
        return records
    except Exception as e:
        logger.error(f"Failed to get learning records: {str(e)}")
        raise AgentRunException(f"Failed to get learning records: {str(e)}")


async def get_stats_service(user_id: str, tenant_id: str) -> dict:
    """
    Get learning statistics for a user
    """
    try:
        stats = learning_record_db.get_stats(
            user_id=user_id,
            tenant_id=tenant_id
        )
        return stats
    except Exception as e:
        logger.error(f"Failed to get learning stats: {str(e)}")
        raise AgentRunException(f"Failed to get learning stats: {str(e)}")


async def delete_record_service(
    record_id: int,
    user_id: str,
    tenant_id: str
) -> dict:
    """
    Delete a learning record
    """
    try:
        success = learning_record_db.delete_record(
            record_id=record_id,
            user_id=user_id,
            tenant_id=tenant_id
        )

        if not success:
            raise ValueError("Learning record not found")

        return {
            "success": True,
            "message": "Learning record deleted successfully"
        }
    except Exception as e:
        logger.error(f"Failed to delete learning record: {str(e)}")
        raise AgentRunException(f"Failed to delete learning record: {str(e)}")


async def clear_all_records_service(user_id: str, tenant_id: str) -> dict:
    """
    Clear all learning records for a user
    """
    try:
        success = learning_record_db.clear_all_records(
            user_id=user_id,
            tenant_id=tenant_id
        )

        return {
            "success": True,
            "message": "All learning records cleared successfully"
        }
    except Exception as e:
        logger.error(f"Failed to clear learning records: {str(e)}")
        raise AgentRunException(f"Failed to clear learning records: {str(e)}")
