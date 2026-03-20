import logging

from typing import List, Optional
from sqlalchemy import and_

from database.client import get_db_session, as_dict
from database.db_models import (
    PatientReportInterpretation,
    PatientLabReport, PatientLabReportItem,
    PatientImagingReport
)

logger = logging.getLogger(__name__)


# ============================================================================
# Interpretation CRUD
# ============================================================================

def save_interpretation(data: dict, tenant_id: str, user_id: str) -> dict:
    """
    Save or update a report interpretation (upsert by patient_id + report_id)
    """
    with get_db_session() as session:
        existing = session.query(PatientReportInterpretation).filter(
            PatientReportInterpretation.patient_id == data.get('patient_id'),
            PatientReportInterpretation.report_id == data.get('report_id'),
            PatientReportInterpretation.tenant_id == tenant_id,
            PatientReportInterpretation.delete_flag != 'Y'
        ).first()

        if existing:
            existing.interpretation_json = data.get('interpretation_json')
            existing.severity = data.get('severity')
            existing.summary = data.get('summary')
            existing.report_type = data.get('report_type')
            existing.updated_by = user_id
            session.commit()
            logger.info(f"Updated interpretation: {existing.interpretation_id}")
            return {"interpretation_id": existing.interpretation_id}

        new_record = PatientReportInterpretation(
            patient_id=data.get('patient_id'),
            report_id=data.get('report_id'),
            report_type=data.get('report_type'),
            interpretation_json=data.get('interpretation_json'),
            severity=data.get('severity'),
            summary=data.get('summary'),
            tenant_id=tenant_id,
            created_by=user_id,
            updated_by=user_id,
            delete_flag='N'
        )

        session.add(new_record)
        session.flush()
        interpretation_id = new_record.interpretation_id
        session.commit()

        logger.info(f"Created interpretation: {interpretation_id} for report: {data.get('report_id')}")
        return {"interpretation_id": interpretation_id}


def get_interpretation_by_report(patient_id: int, report_id: str, tenant_id: str) -> Optional[dict]:
    """
    Get interpretation by patient_id and report_id
    """
    with get_db_session() as session:
        record = session.query(PatientReportInterpretation).filter(
            PatientReportInterpretation.patient_id == patient_id,
            PatientReportInterpretation.report_id == report_id,
            PatientReportInterpretation.tenant_id == tenant_id,
            PatientReportInterpretation.delete_flag != 'Y'
        ).first()

        if record:
            return as_dict(record)
        return None


def list_interpretations_by_patient(patient_id: int, tenant_id: str) -> List[dict]:
    """
    List all interpretations for a patient
    """
    with get_db_session() as session:
        records = session.query(PatientReportInterpretation).filter(
            PatientReportInterpretation.patient_id == patient_id,
            PatientReportInterpretation.tenant_id == tenant_id,
            PatientReportInterpretation.delete_flag != 'Y'
        ).all()

        return [as_dict(r) for r in records]


def delete_interpretation_by_report(patient_id: int, report_id: str, tenant_id: str) -> bool:
    """
    Delete interpretation by report_id (hard delete)
    """
    with get_db_session() as session:
        record = session.query(PatientReportInterpretation).filter(
            PatientReportInterpretation.patient_id == patient_id,
            PatientReportInterpretation.report_id == report_id,
            PatientReportInterpretation.tenant_id == tenant_id
        ).first()

        if not record:
            return False

        session.delete(record)
        session.commit()
        logger.info(f"Deleted interpretation for report: {report_id}")
        return True


# ============================================================================
# Report Data Queries
# ============================================================================

def get_all_lab_reports(patient_id: int, tenant_id: str) -> List[dict]:
    """
    Get all lab reports for a patient
    """
    with get_db_session() as session:
        reports = session.query(PatientLabReport).filter(
            PatientLabReport.patient_id == patient_id,
            PatientLabReport.tenant_id == tenant_id,
            PatientLabReport.delete_flag != 'Y'
        ).order_by(PatientLabReport.report_date.desc()).all()

        return [as_dict(r) for r in reports]


def get_all_imaging_reports(patient_id: int, tenant_id: str) -> List[dict]:
    """
    Get all imaging reports for a patient
    """
    with get_db_session() as session:
        reports = session.query(PatientImagingReport).filter(
            PatientImagingReport.patient_id == patient_id,
            PatientImagingReport.tenant_id == tenant_id,
            PatientImagingReport.delete_flag != 'Y'
        ).order_by(PatientImagingReport.imaging_date.desc()).all()

        return [as_dict(r) for r in reports]


def get_lab_report_with_items(report_id: int, tenant_id: str) -> Optional[dict]:
    """
    Get a single lab report with all its items
    """
    with get_db_session() as session:
        report = session.query(PatientLabReport).filter(
            PatientLabReport.report_id == report_id,
            PatientLabReport.tenant_id == tenant_id,
            PatientLabReport.delete_flag != 'Y'
        ).first()

        if not report:
            return None

        report_dict = as_dict(report)

        items = session.query(PatientLabReportItem).filter(
            PatientLabReportItem.report_id == report_id,
            PatientLabReportItem.tenant_id == tenant_id,
            PatientLabReportItem.delete_flag != 'Y'
        ).order_by(PatientLabReportItem.display_order).all()

        report_dict['items'] = [as_dict(item) for item in items]
        return report_dict


def get_lab_report_items_for_trends(patient_id: int, tenant_id: str) -> List[dict]:
    """
    Get all lab report items across all reports for a patient, with report date info.
    Used for building metric trends.
    """
    with get_db_session() as session:
        results = session.query(
            PatientLabReportItem, PatientLabReport.report_date, PatientLabReport.report_type
        ).join(
            PatientLabReport,
            and_(
                PatientLabReportItem.report_id == PatientLabReport.report_id,
                PatientLabReport.tenant_id == tenant_id,
                PatientLabReport.delete_flag != 'Y'
            )
        ).filter(
            PatientLabReport.patient_id == patient_id,
            PatientLabReportItem.tenant_id == tenant_id,
            PatientLabReportItem.delete_flag != 'Y'
        ).all()

        items = []
        for item, report_date, report_type in results:
            item_dict = as_dict(item)
            item_dict['report_date'] = report_date
            item_dict['report_type_name'] = report_type
            items.append(item_dict)

        return items
