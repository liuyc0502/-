import logging
from typing import List, Dict, Optional

from sqlalchemy import desc

from database.client import get_db_session, as_dict
from database.db_models import ConsultationRecord

logger = logging.getLogger(__name__)


def create_consultation_record(data: dict, tenant_id: str, user_id: str) -> dict:
    """Create a new consultation record."""
    with get_db_session() as session:
        record = ConsultationRecord(
            consultation_uuid=data["consultation_uuid"],
            question=data["question"],
            status=data.get("status", "running"),
            total_rounds=data.get("total_rounds", 0),
            max_rounds=data.get("max_rounds", 5),
            specialist_agents=data.get("specialist_agents", []),
            round_results=data.get("round_results", []),
            final_recommendation=data.get("final_recommendation"),
            agreements=data.get("agreements", []),
            disagreements=data.get("disagreements", []),
            confidence=data.get("confidence", 0),
            conversation_id=data.get("conversation_id"),
            patient_id=data.get("patient_id"),
            tenant_id=tenant_id,
            created_by=user_id,
            updated_by=user_id,
            delete_flag="N",
        )
        session.add(record)
        session.flush()
        record_id = record.consultation_id
        session.commit()
        logger.info(f"Created consultation record: {record_id}")
        return {"consultation_id": record_id}


def update_consultation_record(consultation_uuid: str, data: dict, tenant_id: str) -> bool:
    """Update a consultation record by UUID."""
    with get_db_session() as session:
        record = session.query(ConsultationRecord).filter(
            ConsultationRecord.consultation_uuid == consultation_uuid,
            ConsultationRecord.tenant_id == tenant_id,
            ConsultationRecord.delete_flag != "Y",
        ).first()
        if not record:
            return False

        for key, value in data.items():
            if hasattr(record, key) and key not in ("consultation_id", "consultation_uuid", "tenant_id"):
                setattr(record, key, value)

        session.commit()
        return True


def get_consultation_by_uuid(consultation_uuid: str, tenant_id: str) -> Optional[dict]:
    """Get consultation record by UUID."""
    with get_db_session() as session:
        record = session.query(ConsultationRecord).filter(
            ConsultationRecord.consultation_uuid == consultation_uuid,
            ConsultationRecord.tenant_id == tenant_id,
            ConsultationRecord.delete_flag != "Y",
        ).first()
        return as_dict(record) if record else None


def get_consultation_by_id(consultation_id: int, tenant_id: str) -> Optional[dict]:
    """Get consultation record by ID."""
    with get_db_session() as session:
        record = session.query(ConsultationRecord).filter(
            ConsultationRecord.consultation_id == consultation_id,
            ConsultationRecord.tenant_id == tenant_id,
            ConsultationRecord.delete_flag != "Y",
        ).first()
        return as_dict(record) if record else None


def list_consultations(
    tenant_id: str,
    status: Optional[str] = None,
    patient_id: Optional[int] = None,
    page: int = 1,
    page_size: int = 20,
) -> dict:
    """List consultation records with pagination."""
    with get_db_session() as session:
        query = session.query(ConsultationRecord).filter(
            ConsultationRecord.tenant_id == tenant_id,
            ConsultationRecord.delete_flag != "Y",
        )

        if status:
            query = query.filter(ConsultationRecord.status == status)
        if patient_id:
            query = query.filter(ConsultationRecord.patient_id == patient_id)

        total = query.count()
        records = (
            query.order_by(desc(ConsultationRecord.create_time))
            .offset((page - 1) * page_size)
            .limit(page_size)
            .all()
        )

        return {
            "total": total,
            "page": page,
            "page_size": page_size,
            "records": [as_dict(r) for r in records],
        }


def delete_consultation(consultation_id: int, tenant_id: str) -> bool:
    """Soft delete a consultation record."""
    with get_db_session() as session:
        record = session.query(ConsultationRecord).filter(
            ConsultationRecord.consultation_id == consultation_id,
            ConsultationRecord.tenant_id == tenant_id,
            ConsultationRecord.delete_flag != "Y",
        ).first()
        if not record:
            return False
        record.delete_flag = "Y"
        session.commit()
        return True
