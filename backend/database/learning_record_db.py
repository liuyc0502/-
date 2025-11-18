
import logging
from typing import List, Dict, Optional
from datetime import datetime
from sqlalchemy import and_, func
from database.client import get_db_session, as_dict
from database.db_models import DoctorLearningRecord

logger = logging.getLogger(__name__)


def record_view(
    user_id: str,
    tenant_id: str,
    file_path: str,
    file_name: str,
    category: Optional[str],
    time_spent_seconds: int
) -> dict:
    """
    Record or update a knowledge file view
    """
    with get_db_session() as session:
        # Check if record already exists
        existing_record = session.query(DoctorLearningRecord).filter(
            DoctorLearningRecord.user_id == user_id,
            DoctorLearningRecord.tenant_id == tenant_id,
            DoctorLearningRecord.file_path == file_path,
            DoctorLearningRecord.delete_flag != 'Y'
        ).first()

        if existing_record:
            # Update existing record
            existing_record.view_count += 1
            existing_record.total_time_spent += time_spent_seconds
            existing_record.last_viewed_at = datetime.now()
            if category:
                existing_record.category = category
            existing_record.updated_by = user_id
            session.commit()
            
            logger.info(f"Updated learning record: {existing_record.record_id}")
            return as_dict(existing_record)
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
                created_by=user_id,
                updated_by=user_id,
                delete_flag='N'
            )
            session.add(new_record)
            session.flush()
            
            record_id = new_record.record_id
            session.commit()
            
            logger.info(f"Created learning record: {record_id}")
            return as_dict(new_record)


def get_user_records(
    user_id: str,
    tenant_id: str,
    limit: int = 100
) -> List[dict]:
    """
    Get all learning records for a user
    """
    with get_db_session() as session:
        records = session.query(DoctorLearningRecord).filter(
            DoctorLearningRecord.user_id == user_id,
            DoctorLearningRecord.tenant_id == tenant_id,
            DoctorLearningRecord.delete_flag != 'Y'
        ).order_by(
            DoctorLearningRecord.last_viewed_at.desc()
        ).limit(limit).all()
        
        return [as_dict(r) for r in records]


def get_stats(user_id: str, tenant_id: str) -> dict:
    """
    Get learning statistics for a user
    """
    with get_db_session() as session:
        # Get total records count
        total_records = session.query(DoctorLearningRecord).filter(
            DoctorLearningRecord.user_id == user_id,
            DoctorLearningRecord.tenant_id == tenant_id,
            DoctorLearningRecord.delete_flag != 'Y'
        ).count()
        
        # Get total view count
        total_views = session.query(
            func.sum(DoctorLearningRecord.view_count)
        ).filter(
            DoctorLearningRecord.user_id == user_id,
            DoctorLearningRecord.tenant_id == tenant_id,
            DoctorLearningRecord.delete_flag != 'Y'
        ).scalar() or 0
        
        # Get total time spent
        total_time = session.query(
            func.sum(DoctorLearningRecord.total_time_spent)
        ).filter(
            DoctorLearningRecord.user_id == user_id,
            DoctorLearningRecord.tenant_id == tenant_id,
            DoctorLearningRecord.delete_flag != 'Y'
        ).scalar() or 0
        
        return {
            "total_records": total_records,
            "total_views": total_views,
            "total_time_spent_seconds": total_time,
            "total_time_spent_hours": round(total_time / 3600, 2) if total_time else 0
        }


def delete_record(
    record_id: int,
    user_id: str,
    tenant_id: str
) -> bool:
    """
    Soft delete a learning record
    """
    with get_db_session() as session:
        record = session.query(DoctorLearningRecord).filter(
            DoctorLearningRecord.record_id == record_id,
            DoctorLearningRecord.user_id == user_id,
            DoctorLearningRecord.tenant_id == tenant_id,
            DoctorLearningRecord.delete_flag != 'Y'
        ).first()
        
        if not record:
            return False
        
        record.delete_flag = 'Y'
        record.updated_by = user_id
        session.commit()
        
        logger.info(f"Deleted learning record: {record_id}")
        return True


def clear_all_records(user_id: str, tenant_id: str) -> bool:
    """
    Soft delete all learning records for a user
    """
    with get_db_session() as session:
        records = session.query(DoctorLearningRecord).filter(
            DoctorLearningRecord.user_id == user_id,
            DoctorLearningRecord.tenant_id == tenant_id,
            DoctorLearningRecord.delete_flag != 'Y'
        ).all()
        
        for record in records:
            record.delete_flag = 'Y'
            record.updated_by = user_id
        
        session.commit()
        
        logger.info(f"Cleared all learning records for user: {user_id}")
        return True

