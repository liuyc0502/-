import logging
from typing import List, Dict, Optional
from sqlalchemy import and_, or_

from database.client import get_db_session, as_dict
from database.db_models import (
    PatientLabReport, PatientLabReportItem, PatientImagingReport
)

logger = logging.getLogger(__name__)


# ============================================================================
# Lab Report Operations
# ============================================================================

def create_lab_report(report_data: dict, tenant_id: str, user_id: str) -> dict:
    """
    Create a new lab report record
    """
    with get_db_session() as session:
        new_report = PatientLabReport(
            timeline_id=report_data.get('timeline_id'),
            patient_id=report_data.get('patient_id'),
            report_type=report_data.get('report_type'),
            report_date=report_data.get('report_date'),
            report_institution=report_data.get('report_institution'),
            report_number=report_data.get('report_number'),
            report_image_url=report_data.get('report_image_url'),
            ai_summary=report_data.get('ai_summary'),
            tenant_id=tenant_id,
            created_by=user_id,
            updated_by=user_id,
            delete_flag='N'
        )
        session.add(new_report)
        session.flush()

        report_id = new_report.report_id
        session.commit()

        logger.info(f"Created lab report: {report_id} for patient: {report_data.get('patient_id')}")
        return {"report_id": report_id}


def create_lab_report_items(items: List[dict], report_id: int, tenant_id: str, user_id: str) -> int:
    """
    Batch create lab report items
    """
    with get_db_session() as session:
        created_count = 0
        for item_data in items:
            new_item = PatientLabReportItem(
                report_id=report_id,
                test_item_name=item_data.get('test_item_name'),
                test_result=item_data.get('test_result'),
                test_unit=item_data.get('test_unit'),
                reference_range=item_data.get('reference_range'),
                test_method=item_data.get('test_method'),
                abnormal_flag=item_data.get('abnormal_flag'),
                result_hint=item_data.get('result_hint'),
                display_order=item_data.get('display_order', created_count),
                tenant_id=tenant_id,
                created_by=user_id,
                updated_by=user_id,
                delete_flag='N'
            )
            session.add(new_item)
            created_count += 1

        session.commit()
        logger.info(f"Created {created_count} lab report items for report: {report_id}")
        return created_count


def get_lab_report_by_id(report_id: int, tenant_id: str) -> Optional[dict]:
    """
    Get lab report by ID with all items
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

        # Get all items
        items = session.query(PatientLabReportItem).filter(
            PatientLabReportItem.report_id == report_id,
            PatientLabReportItem.tenant_id == tenant_id,
            PatientLabReportItem.delete_flag != 'Y'
        ).order_by(PatientLabReportItem.display_order.asc()).all()

        report_dict['items'] = [as_dict(item) for item in items]

        return report_dict


def get_lab_reports_by_timeline(timeline_id: int, tenant_id: str) -> List[dict]:
    """
    Get all lab reports for a timeline
    """
    with get_db_session() as session:
        reports = session.query(PatientLabReport).filter(
            PatientLabReport.timeline_id == timeline_id,
            PatientLabReport.tenant_id == tenant_id,
            PatientLabReport.delete_flag != 'Y'
        ).order_by(PatientLabReport.report_date.desc()).all()

        result = []
        for report in reports:
            report_dict = as_dict(report)

            # Get items for this report
            items = session.query(PatientLabReportItem).filter(
                PatientLabReportItem.report_id == report.report_id,
                PatientLabReportItem.tenant_id == tenant_id,
                PatientLabReportItem.delete_flag != 'Y'
            ).order_by(PatientLabReportItem.display_order.asc()).all()

            report_dict['items'] = [as_dict(item) for item in items]
            result.append(report_dict)

        return result


def get_lab_reports_by_patient(patient_id: int, tenant_id: str, limit: int = 50) -> List[dict]:
    """
    Get all lab reports for a patient
    """
    with get_db_session() as session:
        reports = session.query(PatientLabReport).filter(
            PatientLabReport.patient_id == patient_id,
            PatientLabReport.tenant_id == tenant_id,
            PatientLabReport.delete_flag != 'Y'
        ).order_by(PatientLabReport.report_date.desc()).limit(limit).all()

        result = []
        for report in reports:
            report_dict = as_dict(report)

            # Get items for this report
            items = session.query(PatientLabReportItem).filter(
                PatientLabReportItem.report_id == report.report_id,
                PatientLabReportItem.tenant_id == tenant_id,
                PatientLabReportItem.delete_flag != 'Y'
            ).order_by(PatientLabReportItem.display_order.asc()).all()

            report_dict['items'] = [as_dict(item) for item in items]
            result.append(report_dict)

        return result


def update_lab_report(report_id: int, report_data: dict, tenant_id: str, user_id: str) -> bool:
    """
    Update lab report
    """
    with get_db_session() as session:
        report = session.query(PatientLabReport).filter(
            PatientLabReport.report_id == report_id,
            PatientLabReport.tenant_id == tenant_id,
            PatientLabReport.delete_flag != 'Y'
        ).first()

        if not report:
            return False

        # Update fields
        for key, value in report_data.items():
            if hasattr(report, key) and value is not None:
                setattr(report, key, value)

        report.updated_by = user_id
        session.commit()

        logger.info(f"Updated lab report: {report_id}")
        return True


def delete_lab_report(report_id: int, tenant_id: str, user_id: str) -> bool:
    """
    Hard delete lab report and all its items
    """
    with get_db_session() as session:
        # Delete all items first
        session.query(PatientLabReportItem).filter(
            PatientLabReportItem.report_id == report_id,
            PatientLabReportItem.tenant_id == tenant_id
        ).delete()

        # Delete the report
        report = session.query(PatientLabReport).filter(
            PatientLabReport.report_id == report_id,
            PatientLabReport.tenant_id == tenant_id
        ).first()

        if not report:
            return False

        session.delete(report)
        session.commit()

        logger.info(f"Hard deleted lab report: {report_id}")
        return True


# ============================================================================
# Imaging Report Operations
# ============================================================================

def create_imaging_report(report_data: dict, tenant_id: str, user_id: str) -> dict:
    """
    Create a new imaging report record
    """
    with get_db_session() as session:
        new_report = PatientImagingReport(
            timeline_id=report_data.get('timeline_id'),
            patient_id=report_data.get('patient_id'),
            imaging_type=report_data.get('imaging_type'),
            imaging_date=report_data.get('imaging_date'),
            imaging_institution=report_data.get('imaging_institution'),
            report_number=report_data.get('report_number'),
            examination_site=report_data.get('examination_site'),
            imaging_findings=report_data.get('imaging_findings'),
            diagnostic_impression=report_data.get('diagnostic_impression'),
            recommendations=report_data.get('recommendations'),
            report_image_url=report_data.get('report_image_url'),
            ai_summary=report_data.get('ai_summary'),
            tenant_id=tenant_id,
            created_by=user_id,
            updated_by=user_id,
            delete_flag='N'
        )
        session.add(new_report)
        session.flush()

        report_id = new_report.report_id
        session.commit()

        logger.info(f"Created imaging report: {report_id} for patient: {report_data.get('patient_id')}")
        return {"report_id": report_id}


def get_imaging_report_by_id(report_id: int, tenant_id: str) -> Optional[dict]:
    """
    Get imaging report by ID
    """
    with get_db_session() as session:
        report = session.query(PatientImagingReport).filter(
            PatientImagingReport.report_id == report_id,
            PatientImagingReport.tenant_id == tenant_id,
            PatientImagingReport.delete_flag != 'Y'
        ).first()

        if report:
            return as_dict(report)
        return None


def get_imaging_reports_by_timeline(timeline_id: int, tenant_id: str) -> List[dict]:
    """
    Get all imaging reports for a timeline
    """
    with get_db_session() as session:
        reports = session.query(PatientImagingReport).filter(
            PatientImagingReport.timeline_id == timeline_id,
            PatientImagingReport.tenant_id == tenant_id,
            PatientImagingReport.delete_flag != 'Y'
        ).order_by(PatientImagingReport.imaging_date.desc()).all()

        return [as_dict(report) for report in reports]


def get_imaging_reports_by_patient(patient_id: int, tenant_id: str, limit: int = 50) -> List[dict]:
    """
    Get all imaging reports for a patient
    """
    with get_db_session() as session:
        reports = session.query(PatientImagingReport).filter(
            PatientImagingReport.patient_id == patient_id,
            PatientImagingReport.tenant_id == tenant_id,
            PatientImagingReport.delete_flag != 'Y'
        ).order_by(PatientImagingReport.imaging_date.desc()).limit(limit).all()

        return [as_dict(report) for report in reports]


def update_imaging_report(report_id: int, report_data: dict, tenant_id: str, user_id: str) -> bool:
    """
    Update imaging report
    """
    with get_db_session() as session:
        report = session.query(PatientImagingReport).filter(
            PatientImagingReport.report_id == report_id,
            PatientImagingReport.tenant_id == tenant_id,
            PatientImagingReport.delete_flag != 'Y'
        ).first()

        if not report:
            return False

        # Update fields
        for key, value in report_data.items():
            if hasattr(report, key) and value is not None:
                setattr(report, key, value)

        report.updated_by = user_id
        session.commit()

        logger.info(f"Updated imaging report: {report_id}")
        return True


def delete_imaging_report(report_id: int, tenant_id: str, user_id: str) -> bool:
    """
    Hard delete imaging report
    """
    with get_db_session() as session:
        report = session.query(PatientImagingReport).filter(
            PatientImagingReport.report_id == report_id,
            PatientImagingReport.tenant_id == tenant_id
        ).first()

        if not report:
            return False

        session.delete(report)
        session.commit()

        logger.info(f"Hard deleted imaging report: {report_id}")
        return True
