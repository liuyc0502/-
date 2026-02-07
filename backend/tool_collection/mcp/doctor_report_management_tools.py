"""
Doctor Report Management Tools - Atomic MCP Tools
Lab report and imaging report creation, update, and query operations for doctors.
"""
import logging
from typing import Optional, Dict, Any, List
from fastmcp import FastMCP
from consts.const import DEFAULT_TENANT_ID
from database.patient_report_db import (
    create_lab_report,
    create_lab_report_items,
    get_lab_report_by_id,
    get_lab_reports_by_patient,
    get_lab_reports_by_timeline,
    update_lab_report,
    delete_lab_report,
    create_imaging_report,
    get_imaging_report_by_id,
    get_imaging_reports_by_patient,
    get_imaging_reports_by_timeline,
    update_imaging_report,
    delete_imaging_report
)

logger = logging.getLogger(__name__)
doctor_report_mgmt_tools = FastMCP("doctor_report_management")


@doctor_report_mgmt_tools.tool()
async def save_lab_report(
    patient_id: str,
    timeline_id: str,
    report_type: str,
    items: List[Dict[str, Any]],
    report_date: Optional[str] = None,
    report_institution: Optional[str] = None,
    report_number: Optional[str] = None,
    report_image_url: Optional[str] = None,
    ai_summary: Optional[str] = None,
    tenant_id: Optional[str] = None,
    user_id: Optional[str] = None
) -> Dict[str, Any]:
    """Save lab report with test items. Items: [{test_item_name, test_result, test_unit?, reference_range?, abnormal_flag?}]"""
    try:
        tenant = tenant_id or DEFAULT_TENANT_ID
        saver = user_id or "system"

        report_data = {
            "patient_id": int(patient_id),
            "timeline_id": int(timeline_id),
            "report_type": report_type,
            "report_date": report_date,
            "report_institution": report_institution,
            "report_number": report_number,
            "report_image_url": report_image_url,
            "ai_summary": ai_summary
        }

        result = create_lab_report(report_data, tenant, saver)
        report_id = result["report_id"]

        items_count = 0
        if items and len(items) > 0:
            items_count = create_lab_report_items(items, report_id, tenant, saver)

        logger.info(f"Saved lab report {report_id} with {items_count} items for patient {patient_id}")

        return {
            "success": True,
            "report_id": report_id,
            "items_count": items_count,
            "patient_id": patient_id,
            "timeline_id": timeline_id,
            "report_type": report_type,
            "message": f"Successfully saved lab report with {items_count} test items"
        }

    except Exception as e:
        logger.error(f"Error saving lab report: {str(e)}")
        return {"success": False, "error": str(e)}


@doctor_report_mgmt_tools.tool()
async def get_lab_report(
    report_id: str,
    tenant_id: Optional[str] = None
) -> Dict[str, Any]:
    """Get a lab report by ID with all test items."""
    try:
        tenant = tenant_id or DEFAULT_TENANT_ID
        report = get_lab_report_by_id(int(report_id), tenant)

        if not report:
            return {"success": False, "error": "Lab report not found"}

        logger.info(f"Retrieved lab report {report_id}")
        return {"success": True, "report": report}

    except Exception as e:
        logger.error(f"Error getting lab report: {str(e)}")
        return {"success": False, "error": str(e)}


@doctor_report_mgmt_tools.tool()
async def list_patient_lab_reports(
    patient_id: str,
    limit: int = 50,
    tenant_id: Optional[str] = None
) -> Dict[str, Any]:
    """List all lab reports for a patient."""
    try:
        tenant = tenant_id or DEFAULT_TENANT_ID
        reports = get_lab_reports_by_patient(int(patient_id), tenant, limit)

        logger.info(f"Retrieved {len(reports)} lab reports for patient {patient_id}")
        return {"success": True, "total_reports": len(reports), "reports": reports, "patient_id": patient_id}

    except Exception as e:
        logger.error(f"Error listing lab reports: {str(e)}")
        return {"success": False, "total_reports": 0, "reports": [], "error": str(e)}


@doctor_report_mgmt_tools.tool()
async def delete_lab_report_record(
    report_id: str,
    tenant_id: Optional[str] = None,
    user_id: Optional[str] = None
) -> Dict[str, Any]:
    """Delete a lab report (hard delete). Use with caution."""
    try:
        tenant = tenant_id or DEFAULT_TENANT_ID
        deleter = user_id or "system"

        success = delete_lab_report(int(report_id), tenant, deleter)

        if success:
            logger.info(f"Deleted lab report {report_id}")
            return {"success": True, "report_id": report_id, "message": "Lab report deleted successfully"}
        else:
            return {"success": False, "error": "Lab report not found or deletion failed"}

    except Exception as e:
        logger.error(f"Error deleting lab report: {str(e)}")
        return {"success": False, "error": str(e)}


@doctor_report_mgmt_tools.tool()
async def save_imaging_report(
    patient_id: str,
    timeline_id: str,
    imaging_type: str,
    imaging_date: Optional[str] = None,
    imaging_institution: Optional[str] = None,
    report_number: Optional[str] = None,
    examination_site: Optional[str] = None,
    imaging_findings: Optional[str] = None,
    diagnostic_impression: Optional[str] = None,
    recommendations: Optional[str] = None,
    report_image_url: Optional[str] = None,
    ai_summary: Optional[str] = None,
    tenant_id: Optional[str] = None,
    user_id: Optional[str] = None
) -> Dict[str, Any]:
    """Save imaging report (CT/MRI/X-ray/ultrasound) to patient record."""
    try:
        tenant = tenant_id or DEFAULT_TENANT_ID
        saver = user_id or "system"

        report_data = {
            "patient_id": int(patient_id),
            "timeline_id": int(timeline_id),
            "imaging_type": imaging_type,
            "imaging_date": imaging_date,
            "imaging_institution": imaging_institution,
            "report_number": report_number,
            "examination_site": examination_site,
            "imaging_findings": imaging_findings,
            "diagnostic_impression": diagnostic_impression,
            "recommendations": recommendations,
            "report_image_url": report_image_url,
            "ai_summary": ai_summary
        }

        result = create_imaging_report(report_data, tenant, saver)
        report_id = result["report_id"]

        logger.info(f"Saved imaging report {report_id} for patient {patient_id}")

        return {
            "success": True,
            "report_id": report_id,
            "patient_id": patient_id,
            "timeline_id": timeline_id,
            "imaging_type": imaging_type,
            "message": f"Successfully saved {imaging_type} imaging report"
        }

    except Exception as e:
        logger.error(f"Error saving imaging report: {str(e)}")
        return {"success": False, "error": str(e)}


@doctor_report_mgmt_tools.tool()
async def get_imaging_report(
    report_id: str,
    tenant_id: Optional[str] = None
) -> Dict[str, Any]:
    """Get an imaging report by ID."""
    try:
        tenant = tenant_id or DEFAULT_TENANT_ID
        report = get_imaging_report_by_id(int(report_id), tenant)

        if not report:
            return {"success": False, "error": "Imaging report not found"}

        logger.info(f"Retrieved imaging report {report_id}")
        return {"success": True, "report": report}

    except Exception as e:
        logger.error(f"Error getting imaging report: {str(e)}")
        return {"success": False, "error": str(e)}


@doctor_report_mgmt_tools.tool()
async def list_patient_imaging_reports(
    patient_id: str,
    limit: int = 50,
    tenant_id: Optional[str] = None
) -> Dict[str, Any]:
    """List all imaging reports for a patient."""
    try:
        tenant = tenant_id or DEFAULT_TENANT_ID
        reports = get_imaging_reports_by_patient(int(patient_id), tenant, limit)

        logger.info(f"Retrieved {len(reports)} imaging reports for patient {patient_id}")
        return {"success": True, "total_reports": len(reports), "reports": reports, "patient_id": patient_id}

    except Exception as e:
        logger.error(f"Error listing imaging reports: {str(e)}")
        return {"success": False, "total_reports": 0, "reports": [], "error": str(e)}


@doctor_report_mgmt_tools.tool()
async def delete_imaging_report_record(
    report_id: str,
    tenant_id: Optional[str] = None,
    user_id: Optional[str] = None
) -> Dict[str, Any]:
    """Delete an imaging report (hard delete). Use with caution."""
    try:
        tenant = tenant_id or DEFAULT_TENANT_ID
        deleter = user_id or "system"

        success = delete_imaging_report(int(report_id), tenant, deleter)

        if success:
            logger.info(f"Deleted imaging report {report_id}")
            return {"success": True, "report_id": report_id, "message": "Imaging report deleted successfully"}
        else:
            return {"success": False, "error": "Imaging report not found or deletion failed"}

    except Exception as e:
        logger.error(f"Error deleting imaging report: {str(e)}")
        return {"success": False, "error": str(e)}
