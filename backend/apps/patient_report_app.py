"""
Patient Report API

API endpoints for patient examination reports.
Reports are derived from timeline data, not stored separately.
"""
import logging
from http import HTTPStatus
from typing import Optional

from fastapi import APIRouter, HTTPException, Header
from starlette.responses import JSONResponse

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
