"""
Database operations for doctor learning records
"""

import logging
from typing import List, Dict, Optional
from sqlalchemy import func, and_
from datetime import datetime, timedelta
from database.client import get_db_session
from database.db_models import DoctorLearningRecord

logger = logging.getLogger(__name__)


def as_dict(obj) -> dict:
    """Convert SQLAlchemy object to dictionary"""
    return {c.name: getattr(obj, c.name) for c in obj.__table__.columns}


def record_view(user_id: str, tenant_id: str, file_path: str, file_name: str,
                category: Optional[str], time_spent_seconds: int) -> dict:
    """
    Record or update a knowledge view
    """
    with get_db_session() as session:
        # Check if record exists
        existing = session.query(DoctorLearningRecord).filter(
            and_(
                DoctorLearningRecord.user_id == user_id,
                DoctorLearningRecord.tenant_id == tenant_id,
                DoctorLearningRecord.file_path == file_path,
                DoctorLearningRecord.delete_flag != 'Y'
            )
        ).first()

        if existing:
            # Update existing record
            existing.view_count += 1
            existing.total_time_spent += time_spent_seconds
            existing.last_viewed_at = datetime.now()
            existing.update_time = datetime.now()
            existing.updated_by = user_id
            session.commit()
            logger.info(f"Updated learning record {existing.record_id} for user {user_id}")
            return as_dict(existing)
        else:
            # Create new record
            new_record = DoctorLearningRecord(
                user_id=user_id,
                tenant_id=tenant_id,
                file_path=file_path,
                file_name=file_name,
                category=category,
                view_count=1,
                total_time_spent=time_spent_seconds,
                last_viewed_at=datetime.now(),
                first_viewed_at=datetime.now(),
                created_by=user_id,
                updated_by=user_id
            )
            session.add(new_record)
            session.commit()
            logger.info(f"Created learning record {new_record.record_id} for user {user_id}")
            return as_dict(new_record)


def get_user_records(user_id: str, tenant_id: str, limit: int = 100) -> List[dict]:
    """
    Get all learning records for a user
    """
    with get_db_session() as session:
        records = session.query(DoctorLearningRecord).filter(
            and_(
                DoctorLearningRecord.user_id == user_id,
                DoctorLearningRecord.tenant_id == tenant_id,
                DoctorLearningRecord.delete_flag != 'Y'
            )
        ).order_by(DoctorLearningRecord.last_viewed_at.desc()).limit(limit).all()

        return [as_dict(r) for r in records]


def get_stats(user_id: str, tenant_id: str) -> dict:
    """
    Get learning statistics for a user
    """
    with get_db_session() as session:
        # Get all records
        all_records = session.query(DoctorLearningRecord).filter(
            and_(
                DoctorLearningRecord.user_id == user_id,
                DoctorLearningRecord.tenant_id == tenant_id,
                DoctorLearningRecord.delete_flag != 'Y'
            )
        ).all()

        # Calculate statistics
        one_week_ago = datetime.now() - timedelta(days=7)

        # Filter records from this week
        this_week_records = [r for r in all_records if r.last_viewed_at >= one_week_ago]

        total_views_this_week = sum(r.view_count for r in this_week_records)
        total_time_this_week = sum(r.total_time_spent for r in this_week_records) / 3600  # Convert to hours

        # Calculate knowledge mastery (simplified: unique files viewed / 50)
        unique_files_viewed = len(all_records)
        knowledge_mastery = min(100, (unique_files_viewed / 50) * 100)

        # Get recent records (last 10)
        recent_records = sorted(all_records, key=lambda x: x.last_viewed_at, reverse=True)[:10]

        # Generate activity heatmap for last 28 days
        activity_heatmap = [0] * 28
        now = datetime.now()

        for record in all_records:
            days_diff = (now - record.last_viewed_at).days
            if 0 <= days_diff < 28:
                activity_heatmap[27 - days_diff] += 1

        return {
            "total_views_this_week": total_views_this_week,
            "total_time_this_week": round(total_time_this_week, 1),
            "knowledge_mastery": round(knowledge_mastery, 0),
            "recent_records": [as_dict(r) for r in recent_records],
            "activity_heatmap": activity_heatmap
        }


def delete_record(record_id: int, user_id: str, tenant_id: str) -> bool:
    """
    Soft delete a learning record
    """
    with get_db_session() as session:
        record = session.query(DoctorLearningRecord).filter(
            and_(
                DoctorLearningRecord.record_id == record_id,
                DoctorLearningRecord.tenant_id == tenant_id,
                DoctorLearningRecord.delete_flag != 'Y'
            )
        ).first()

        if not record:
            return False

        record.delete_flag = 'Y'
        record.updated_by = user_id
        record.update_time = datetime.now()
        session.commit()

        logger.info(f"Deleted learning record {record_id}")
        return True


def clear_all_records(user_id: str, tenant_id: str) -> bool:
    """
    Clear all learning records for a user (soft delete)
    """
    with get_db_session() as session:
        records = session.query(DoctorLearningRecord).filter(
            and_(
                DoctorLearningRecord.user_id == user_id,
                DoctorLearningRecord.tenant_id == tenant_id,
                DoctorLearningRecord.delete_flag != 'Y'
            )
        ).all()

        for record in records:
            record.delete_flag = 'Y'
            record.updated_by = user_id
            record.update_time = datetime.now()

        session.commit()
        logger.info(f"Cleared all learning records for user {user_id}")
        return True
