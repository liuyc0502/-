"""
Patient Report API

API endpoints for patient examination reports.
Reports are derived from timeline data, not stored separately.
"""
import logging
from http import HTTPStatus
from typing import Optional, List

from fastapi import APIRouter, HTTPException, Header
from starlette.responses import JSONResponse
from pydantic import BaseModel, Field

from database import patient_db
from services import patient_report_service
from utils.auth_utils import get_current_user_id
 
# Module logger
logger = logging.getLogger(__name__)
 
# Create router
router = APIRouter()
 
 
@router.get("/patient/reports")
def get_patient_reports(
    patient_id: int,
    authorization: Optional[str] = Header(None)
):
    """
    Get all examination reports for a patient

    Query Parameters:
        patient_id: Patient ID

    Returns:
        JSON response with report list
    """
    try:
        user_id, tenant_id = get_current_user_id(authorization)

        # Permission check: Verify patient belongs to tenant
        patient = patient_db.get_patient_by_id(patient_id, tenant_id)
        if not patient:
            raise HTTPException(
                status_code=HTTPStatus.FORBIDDEN,
                detail="No permission to access this patient's reports"
            )
 
        # Get reports
        reports = patient_report_service.get_patient_reports(
            patient_id=patient_id,
            user_id=user_id,
            tenant_id=tenant_id
        )
 
        return JSONResponse(
            status_code=HTTPStatus.OK,
            content={"data": reports}
        )
 
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get patient reports: {e}", exc_info=True)
        raise HTTPException(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            detail="Failed to load reports"
        )
 
 
@router.get("/patient/reports/{timeline_id}")
def get_report_detail(
    timeline_id: int,
    authorization: Optional[str] = Header(None)
):
    """
    Get detailed report information

    Path Parameters:
        timeline_id: Timeline ID (serves as report ID)

    Returns:
        JSON response with detailed report data
    """
    try:
        user_id, tenant_id = get_current_user_id(authorization)

        # Get report detail
        detail = patient_report_service.get_report_detail(
            timeline_id=timeline_id,
            user_id=user_id,
            tenant_id=tenant_id
        )
 
        return JSONResponse(
            status_code=HTTPStatus.OK,
            content={"data": detail}
        )
 
    except ValueError as e:
        raise HTTPException(
            status_code=HTTPStatus.NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Failed to get report detail: {e}", exc_info=True)
        raise HTTPException(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            detail="Failed to load report detail"
        )


# ============================================================================
# New Report Management Endpoints (Lab & Imaging Reports)
# ============================================================================

class LabReportItemRequest(BaseModel):
    test_item_name: str = Field(..., description="Test item name")
    test_result: str = Field(..., description="Test result value")
    test_unit: Optional[str] = Field(None, description="Unit of measurement")
    reference_range: Optional[str] = Field(None, description="Normal reference range")
    test_method: Optional[str] = Field(None, description="Testing method")
    abnormal_flag: Optional[str] = Field(None, description="Abnormal indicator (↑/↓/正常)")
    result_hint: Optional[str] = Field(None, description="Result hint")


class CreateLabReportRequest(BaseModel):
    timeline_id: int = Field(..., description="Timeline ID")
    patient_id: int = Field(..., description="Patient ID")
    report_type: Optional[str] = Field(None, description="Report type")
    report_date: Optional[str] = Field(None, description="Report date (YYYY-MM-DD)")
    report_institution: Optional[str] = Field(None, description="Testing institution")
    report_number: Optional[str] = Field(None, description="Report number")
    report_image_url: Optional[str] = Field(None, description="Report image URL")
    ai_summary: Optional[str] = Field(None, description="AI-generated summary")
    test_items: List[LabReportItemRequest] = Field(default_factory=list, description="Test items list")


class CreateImagingReportRequest(BaseModel):
    timeline_id: int = Field(..., description="Timeline ID")
    patient_id: int = Field(..., description="Patient ID")
    imaging_type: Optional[str] = Field(None, description="Imaging type")
    imaging_date: Optional[str] = Field(None, description="Imaging date (YYYY-MM-DD)")
    imaging_institution: Optional[str] = Field(None, description="Imaging institution")
    report_number: Optional[str] = Field(None, description="Report number")
    examination_site: Optional[str] = Field(None, description="Examination site")
    imaging_findings: Optional[str] = Field(None, description="Imaging findings")
    diagnostic_impression: Optional[str] = Field(None, description="Diagnostic impression")
    recommendations: Optional[str] = Field(None, description="Recommendations")
    report_image_url: Optional[str] = Field(None, description="Report image URL")
    ai_summary: Optional[str] = Field(None, description="AI-generated summary")


@router.post("/patient/reports/lab")
async def create_lab_report(
    request: CreateLabReportRequest,
    authorization: Optional[str] = Header(None)
):
    """
    Create a new lab report with test items
    """
    try:
        user_id, tenant_id = get_current_user_id(authorization)

        # Prepare report data
        report_data = {
            'timeline_id': request.timeline_id,
            'patient_id': request.patient_id,
            'report_type': request.report_type,
            'report_date': request.report_date,
            'report_institution': request.report_institution,
            'report_number': request.report_number,
            'report_image_url': request.report_image_url,
            'ai_summary': request.ai_summary
        }

        # Prepare test items
        test_items = [item.dict() for item in request.test_items]

        # Create report
        result = await patient_report_service.create_lab_report_with_items(
            report_data=report_data,
            test_items=test_items,
            tenant_id=tenant_id,
            user_id=user_id
        )

        return JSONResponse(
            status_code=HTTPStatus.OK,
            content=result
        )

    except Exception as e:
        logger.error(f"Failed to create lab report: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/patient/reports/lab/timeline/{timeline_id}")
async def get_lab_reports_by_timeline(
    timeline_id: int,
    authorization: Optional[str] = Header(None)
):
    """
    Get all lab reports for a timeline
    """
    try:
        user_id, tenant_id = get_current_user_id(authorization)

        reports = await patient_report_service.get_lab_reports_by_timeline_service(
            timeline_id=timeline_id,
            tenant_id=tenant_id
        )

        return JSONResponse(
            status_code=HTTPStatus.OK,
            content={"data": reports}
        )

    except Exception as e:
        logger.error(f"Failed to get lab reports: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.delete("/patient/reports/lab/{report_id}")
async def delete_lab_report(
    report_id: int,
    authorization: Optional[str] = Header(None)
):
    """
    Delete a lab report
    """
    try:
        user_id, tenant_id = get_current_user_id(authorization)

        result = await patient_report_service.delete_lab_report_service(
            report_id=report_id,
            tenant_id=tenant_id,
            user_id=user_id
        )

        return JSONResponse(
            status_code=HTTPStatus.OK,
            content=result
        )

    except Exception as e:
        logger.error(f"Failed to delete lab report: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/patient/reports/imaging")
async def create_imaging_report(
    request: CreateImagingReportRequest,
    authorization: Optional[str] = Header(None)
):
    """
    Create a new imaging report
    """
    try:
        user_id, tenant_id = get_current_user_id(authorization)

        # Prepare report data
        report_data = request.dict()

        # Create report
        result = await patient_report_service.create_imaging_report_service(
            report_data=report_data,
            tenant_id=tenant_id,
            user_id=user_id
        )

        return JSONResponse(
            status_code=HTTPStatus.OK,
            content=result
        )

    except Exception as e:
        logger.error(f"Failed to create imaging report: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/patient/reports/imaging/timeline/{timeline_id}")
async def get_imaging_reports_by_timeline(
    timeline_id: int,
    authorization: Optional[str] = Header(None)
):
    """
    Get all imaging reports for a timeline
    """
    try:
        user_id, tenant_id = get_current_user_id(authorization)

        reports = await patient_report_service.get_imaging_reports_by_timeline_service(
            timeline_id=timeline_id,
            tenant_id=tenant_id
        )

        return JSONResponse(
            status_code=HTTPStatus.OK,
            content={"data": reports}
        )

    except Exception as e:
        logger.error(f"Failed to get imaging reports: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.delete("/patient/reports/imaging/{report_id}")
async def delete_imaging_report(
    report_id: int,
    authorization: Optional[str] = Header(None)
):
    """
    Delete an imaging report
    """
    try:
        user_id, tenant_id = get_current_user_id(authorization)

        result = await patient_report_service.delete_imaging_report_service(
            report_id=report_id,
            tenant_id=tenant_id,
            user_id=user_id
        )

        return JSONResponse(
            status_code=HTTPStatus.OK,
            content=result
        )

    except Exception as e:
        logger.error(f"Failed to delete imaging report: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            detail=str(e)
        )