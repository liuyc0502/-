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


# ============================================================================
# Lab Report Tools
# ============================================================================

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
    """
    Save a lab report with test items to patient record.

    Use this tool when:
    - After parsing lab report image with parse_lab_report_image()
    - Creating a new lab report record from structured data
    - Doctor manually enters lab test results

    Args:
        patient_id: Patient identifier (required)
        timeline_id: Timeline event ID to associate with (required)
        report_type: Type of lab test (required) - e.g., "血常规", "肝功能", "肾功能"
        items: List of test items (required), each containing:
          - test_item_name: Test item name (required)
          - test_result: Test result value (required)
          - test_unit: Unit of measurement
          - reference_range: Normal reference range
          - abnormal_flag: Abnormal indicator (↑/↓/正常)
          - result_hint: Result hint (high/low/normal/critical)
        report_date: Report date (YYYY-MM-DD), optional
        report_institution: Testing institution, optional
        report_number: Report number, optional
        report_image_url: URL of original report image, optional
        ai_summary: AI-generated summary, optional
        tenant_id: Tenant identifier (optional)
        user_id: Doctor saving the report (optional)

    Returns:
        - success: Whether save was successful
        - report_id: New lab report ID
        - items_count: Number of test items saved
        - patient_id: Patient identifier

    Example:
        # After parsing lab report image
        parsed = parse_lab_report_image(image_url="...")
        if parsed['success']:
            data = parsed['parsed_data']
            result = save_lab_report(
                patient_id="123",
                timeline_id="456",
                report_type=data['report_type'],
                items=data['items'],
                report_date=data['report_date'],
                report_institution=data['report_institution'],
                ai_summary=data['ai_summary']
            )
    """
    try:
        tenant = tenant_id or DEFAULT_TENANT_ID
        saver = user_id or "system"

        # Create lab report record
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

        # Create lab report items
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
        return {
            "success": False,
            "error": str(e)
        }


@doctor_report_mgmt_tools.tool()
async def get_lab_report(
    report_id: str,
    tenant_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Get a lab report by ID with all test items.

    Use this tool when:
    - Need to view details of a specific lab report
    - Retrieving lab test results for review

    Args:
        report_id: Lab report ID (required)
        tenant_id: Tenant identifier (optional)

    Returns:
        - success: Whether retrieval was successful
        - report: Lab report data with items

    Example:
        result = get_lab_report(report_id="789")
        if result['success']:
            print(f"Report type: {result['report']['report_type']}")
            for item in result['report']['items']:
                print(f"{item['test_item_name']}: {item['test_result']}")
    """
    try:
        tenant = tenant_id or DEFAULT_TENANT_ID

        report = get_lab_report_by_id(int(report_id), tenant)

        if not report:
            return {
                "success": False,
                "error": "Lab report not found"
            }

        logger.info(f"Retrieved lab report {report_id}")

        return {
            "success": True,
            "report": report
        }

    except Exception as e:
        logger.error(f"Error getting lab report: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }


@doctor_report_mgmt_tools.tool()
async def list_patient_lab_reports(
    patient_id: str,
    limit: int = 50,
    tenant_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    List all lab reports for a patient.

    Use this tool when:
    - Viewing patient's lab test history
    - Comparing lab results over time
    - Getting overview of patient's lab records

    Args:
        patient_id: Patient identifier (required)
        limit: Maximum number of reports to return (default 50)
        tenant_id: Tenant identifier (optional)

    Returns:
        - success: Whether retrieval was successful
        - total_reports: Number of reports found
        - reports: List of lab reports with items

    Example:
        result = list_patient_lab_reports(patient_id="123")
        for report in result['reports']:
            print(f"{report['report_date']}: {report['report_type']}")
    """
    try:
        tenant = tenant_id or DEFAULT_TENANT_ID

        reports = get_lab_reports_by_patient(int(patient_id), tenant, limit)

        logger.info(f"Retrieved {len(reports)} lab reports for patient {patient_id}")

        return {
            "success": True,
            "total_reports": len(reports),
            "reports": reports,
            "patient_id": patient_id
        }

    except Exception as e:
        logger.error(f"Error listing lab reports: {str(e)}")
        return {
            "success": False,
            "total_reports": 0,
            "reports": [],
            "error": str(e)
        }


@doctor_report_mgmt_tools.tool()
async def delete_lab_report_record(
    report_id: str,
    tenant_id: Optional[str] = None,
    user_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Delete a lab report (hard delete).

    Use this tool when:
    - Removing incorrect or duplicate lab report
    - Deleting test data

    WARNING: This is a hard delete operation. Use with caution.

    Args:
        report_id: Lab report ID (required)
        tenant_id: Tenant identifier (optional)
        user_id: Doctor performing deletion (optional)

    Returns:
        - success: Whether deletion was successful
        - report_id: Deleted report ID

    Example:
        result = delete_lab_report_record(report_id="789")
    """
    try:
        tenant = tenant_id or DEFAULT_TENANT_ID
        deleter = user_id or "system"

        success = delete_lab_report(int(report_id), tenant, deleter)

        if success:
            logger.info(f"Deleted lab report {report_id}")
            return {
                "success": True,
                "report_id": report_id,
                "message": "Lab report deleted successfully"
            }
        else:
            return {
                "success": False,
                "error": "Lab report not found or deletion failed"
            }

    except Exception as e:
        logger.error(f"Error deleting lab report: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }


# ============================================================================
# Imaging Report Tools
# ============================================================================

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
    """
    Save an imaging report to patient record.

    Use this tool when:
    - After parsing imaging report image with parse_imaging_report_image()
    - Creating a new imaging report record from structured data
    - Doctor manually enters imaging findings

    Args:
        patient_id: Patient identifier (required)
        timeline_id: Timeline event ID to associate with (required)
        imaging_type: Type of imaging (required) - e.g., "CT", "MRI", "X-ray", "超声"
        imaging_date: Examination date (YYYY-MM-DD), optional
        imaging_institution: Imaging facility, optional
        report_number: Report number, optional
        examination_site: Body part examined, optional
        imaging_findings: Detailed imaging findings, optional
        diagnostic_impression: Diagnosis impression, optional
        recommendations: Recommendations, optional
        report_image_url: URL of original report image, optional
        ai_summary: AI-generated summary, optional
        tenant_id: Tenant identifier (optional)
        user_id: Doctor saving the report (optional)

    Returns:
        - success: Whether save was successful
        - report_id: New imaging report ID
        - patient_id: Patient identifier

    Example:
        # After parsing imaging report image
        parsed = parse_imaging_report_image(image_url="...")
        if parsed['success']:
            data = parsed['parsed_data']
            result = save_imaging_report(
                patient_id="123",
                timeline_id="456",
                imaging_type=data['imaging_type'],
                imaging_date=data['imaging_date'],
                imaging_findings=data['imaging_findings'],
                diagnostic_impression=data['diagnostic_impression'],
                recommendations=data['recommendations'],
                ai_summary=data['ai_summary']
            )
    """
    try:
        tenant = tenant_id or DEFAULT_TENANT_ID
        saver = user_id or "system"

        # Create imaging report record
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
        return {
            "success": False,
            "error": str(e)
        }


@doctor_report_mgmt_tools.tool()
async def get_imaging_report(
    report_id: str,
    tenant_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Get an imaging report by ID.

    Use this tool when:
    - Need to view details of a specific imaging report
    - Retrieving imaging findings for review

    Args:
        report_id: Imaging report ID (required)
        tenant_id: Tenant identifier (optional)

    Returns:
        - success: Whether retrieval was successful
        - report: Imaging report data

    Example:
        result = get_imaging_report(report_id="789")
        if result['success']:
            print(f"Type: {result['report']['imaging_type']}")
            print(f"Findings: {result['report']['imaging_findings']}")
    """
    try:
        tenant = tenant_id or DEFAULT_TENANT_ID

        report = get_imaging_report_by_id(int(report_id), tenant)

        if not report:
            return {
                "success": False,
                "error": "Imaging report not found"
            }

        logger.info(f"Retrieved imaging report {report_id}")

        return {
            "success": True,
            "report": report
        }

    except Exception as e:
        logger.error(f"Error getting imaging report: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }


@doctor_report_mgmt_tools.tool()
async def list_patient_imaging_reports(
    patient_id: str,
    limit: int = 50,
    tenant_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    List all imaging reports for a patient.

    Use this tool when:
    - Viewing patient's imaging history
    - Comparing imaging results over time
    - Getting overview of patient's imaging records

    Args:
        patient_id: Patient identifier (required)
        limit: Maximum number of reports to return (default 50)
        tenant_id: Tenant identifier (optional)

    Returns:
        - success: Whether retrieval was successful
        - total_reports: Number of reports found
        - reports: List of imaging reports

    Example:
        result = list_patient_imaging_reports(patient_id="123")
        for report in result['reports']:
            print(f"{report['imaging_date']}: {report['imaging_type']}")
    """
    try:
        tenant = tenant_id or DEFAULT_TENANT_ID

        reports = get_imaging_reports_by_patient(int(patient_id), tenant, limit)

        logger.info(f"Retrieved {len(reports)} imaging reports for patient {patient_id}")

        return {
            "success": True,
            "total_reports": len(reports),
            "reports": reports,
            "patient_id": patient_id
        }

    except Exception as e:
        logger.error(f"Error listing imaging reports: {str(e)}")
        return {
            "success": False,
            "total_reports": 0,
            "reports": [],
            "error": str(e)
        }


@doctor_report_mgmt_tools.tool()
async def delete_imaging_report_record(
    report_id: str,
    tenant_id: Optional[str] = None,
    user_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Delete an imaging report (hard delete).

    Use this tool when:
    - Removing incorrect or duplicate imaging report
    - Deleting test data

    WARNING: This is a hard delete operation. Use with caution.

    Args:
        report_id: Imaging report ID (required)
        tenant_id: Tenant identifier (optional)
        user_id: Doctor performing deletion (optional)

    Returns:
        - success: Whether deletion was successful
        - report_id: Deleted report ID

    Example:
        result = delete_imaging_report_record(report_id="789")
    """
    try:
        tenant = tenant_id or DEFAULT_TENANT_ID
        deleter = user_id or "system"

        success = delete_imaging_report(int(report_id), tenant, deleter)

        if success:
            logger.info(f"Deleted imaging report {report_id}")
            return {
                "success": True,
                "report_id": report_id,
                "message": "Imaging report deleted successfully"
            }
        else:
            return {
                "success": False,
                "error": "Imaging report not found or deletion failed"
            }

    except Exception as e:
        logger.error(f"Error deleting imaging report: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }

