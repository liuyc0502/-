import logging
from http import HTTPStatus
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Header
from starlette.responses import JSONResponse
from pydantic import BaseModel, Field
from services import patient_service
from utils.auth_utils import get_current_user_id
from consts.exceptions import AgentRunException

logger = logging.getLogger(__name__)
router = APIRouter()

# ============================================================================
# Request/Response Models
# ============================================================================
class CreatePatientRequest(BaseModel):
    name: str = Field(..., description="Patient name")
    gender: str = Field(..., description="Gender")
    age: int = Field(..., description="Age")
    medical_record_no: str = Field(..., description="Medical record number")
    email: str = Field(..., description="Patient email address")
    phone: Optional[str] = Field(None, description="Phone number")
    address: Optional[str] = Field(None, description="Address")
    date_of_birth: Optional[str] = Field(None, description="Date of birth (YYYY-MM-DD)")
    allergies: Optional[List[str]] = Field(default_factory=list, description="Allergies list")
    family_history: Optional[str] = Field(None, description="Family medical history")
    past_medical_history: Optional[List[str]] = Field(default_factory=list, description="Past medical history")


class CreateTimelineRequest(BaseModel):
    patient_id: int = Field(..., description="Patient ID")
    stage_type: str = Field(..., description="Stage type: 初诊/检查/确诊/治疗/随访")
    stage_date: str = Field(..., description="Stage date (YYYY-MM-DD)")
    stage_title: str = Field(..., description="Stage title")
    diagnosis: Optional[str] = Field(None, description="Diagnosis")
    status: Optional[str] = Field("pending", description="Status: completed/current/pending")
    display_order: Optional[int] = Field(0, description="Display order")


class CreateTimelineDetailRequest(BaseModel):
    timeline_id: int = Field(..., description="Timeline ID")
    doctor_notes: Optional[str] = Field(None, description="Doctor observation notes")
    pathology_findings: Optional[str] = Field(None, description="Pathology findings")
    medications: Optional[List[str]] = Field(default_factory=list, description="Medication list")
    patient_summary: Optional[str] = Field(None, description="Patient-friendly summary (plain language)")
    patient_suggestions: Optional[List[str]] = Field(default_factory=list, description="Suggestions for patient")

class CreateMedicalImageRequest(BaseModel):
    timeline_id: int = Field(..., description="Timeline ID")
    image_type: str = Field(..., description="Image type")
    image_label: str = Field(..., description="Image label/description")
    image_url: str = Field(..., description="Image URL")
    thumbnail_url: Optional[str] = Field(None, description="Thumbnail URL")
    display_order: Optional[int] = Field(0, description="Display order")


class MetricData(BaseModel):
    timeline_id: int
    metric_name: str
    metric_full_name: str
    metric_value: str
    metric_unit: Optional[str] = None
    metric_trend: Optional[str] = None
    metric_status: Optional[str] = None
    normal_range_min: Optional[float] = None
    normal_range_max: Optional[float] = None
    percentage: Optional[int] = 0


class BatchCreateMetricsRequest(BaseModel):
    metrics: List[MetricData] = Field(..., description="List of metrics to create")


class CreateTodoRequest(BaseModel):
    patient_id: int = Field(..., description="Patient ID")
    todo_title: str = Field(..., description="Todo title")
    todo_description: Optional[str] = Field(None, description="Todo description")
    todo_type: str = Field(..., description="Type: 复查/用药/检查/随访")
    due_date: str = Field(..., description="Due date (YYYY-MM-DD)")
    priority: Optional[str] = Field("medium", description="Priority: high/medium/low")
    status: Optional[str] = Field("pending", description="Status: pending/completed/overdue")


class UpdateTodoStatusRequest(BaseModel):
    status: str = Field(..., description="Status: pending/completed/overdue")


class CreateAttachmentRequest(BaseModel):
    timeline_id: int = Field(..., description="Timeline ID")
    file_name: str = Field(..., description="File name")
    file_type: str = Field(..., description="File type: pdf/excel/dicom/zip")
    file_url: str = Field(..., description="File URL (MinIO path)")
    file_size: int = Field(..., description="File size in bytes")

# ============================================================================
# Patient Basic Info Endpoints
# ============================================================================
@router.post("/patient/create")
async def create_patient(
    request: CreatePatientRequest,
    authorization: Optional[str] = Header(None)
):
    """
    Create a new patient record
    """
    try:
        user_id, tenant_id = get_current_user_id(authorization)
        if not user_id or not tenant_id:
            raise HTTPException(
                status_code=HTTPStatus.UNAUTHORIZED,
                detail="Unauthorized"
            )
        result = await patient_service.create_patient_record(
            request.dict(),
            tenant_id,
            user_id
        )
        return JSONResponse(
            status_code=HTTPStatus.OK,
            content=result
        )
    except AgentRunException as e:
        raise HTTPException(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Create patient failed: {str(e)}")
        raise HTTPException(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            detail=f"Failed to create patient: {str(e)}"
        )

@router.get("/patient/list")
async def list_patients(
    search: Optional[str] = None,
    filter_type: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
    authorization: Optional[str] = Header(None)
):
    """
    List patients with optional search and filters
    """
    try:
        user_id, tenant_id = get_current_user_id(authorization)
        if not user_id or not tenant_id:
            raise HTTPException(
                status_code=HTTPStatus.UNAUTHORIZED,
                detail="Unauthorized"
            )
        patients = await patient_service.list_patients_service(
            tenant_id,
            search,
            filter_type,
            limit,
            offset
        )
        return JSONResponse(
            status_code=HTTPStatus.OK,
            content={"patients": patients, "total": len(patients)}
        )
    except Exception as e:
        logger.error(f"List patients failed: {str(e)}")
        raise HTTPException(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            detail=f"Failed to list patients: {str(e)}"
        )

@router.get("/patient/{patient_id}")
async def get_patient(
    patient_id: int,
    authorization: Optional[str] = Header(None)
):
    """
    Get patient information by ID
    """
    try:
        user_id, tenant_id = get_current_user_id(authorization)
        if not user_id or not tenant_id:
            raise HTTPException(
                status_code=HTTPStatus.UNAUTHORIZED,
                detail="Unauthorized"
            )
        patient = await patient_service.get_patient_info(patient_id, tenant_id)
        if not patient:
            raise HTTPException(
                status_code=HTTPStatus.NOT_FOUND,
                detail="Patient not found"
            )
        return JSONResponse(
            status_code=HTTPStatus.OK,
            content={"patient": patient}
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get patient failed: {str(e)}")
        raise HTTPException(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            detail=f"Failed to get patient: {str(e)}"
        )


@router.get("/patient/profile/by_email")
async def get_patient_by_email(
    email: str,
    authorization: Optional[str] = Header(None)
):
    """
    Get patient information by email address (for patient portal)
    """
    try:
        user_id, tenant_id = get_current_user_id(authorization)
        if not user_id or not tenant_id:
            raise HTTPException(
                status_code=HTTPStatus.UNAUTHORIZED,
                detail="Unauthorized"
            )
        patient = await patient_service.get_patient_by_email_service(email, tenant_id)
        if not patient:
            raise HTTPException(
                status_code=HTTPStatus.NOT_FOUND,
                detail="Patient profile not found"
            )
        return JSONResponse(
            status_code=HTTPStatus.OK,
            content={"patient": patient}
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get patient by email failed: {str(e)}")
        raise HTTPException(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            detail=f"Failed to get patient by email: {str(e)}"
        )


@router.put("/patient/{patient_id}")
async def update_patient(
    patient_id: int,
    request: CreatePatientRequest,
    authorization: Optional[str] = Header(None)
):
    """
    Update patient information
    """
    try:
        user_id, tenant_id = get_current_user_id(authorization)
        if not user_id or not tenant_id:
            raise HTTPException(
                status_code=HTTPStatus.UNAUTHORIZED,
                detail="Unauthorized"
            )
        result = await patient_service.update_patient_info(
            patient_id,
            request.dict(exclude_unset=True),
            tenant_id,
            user_id
        )
        return JSONResponse(
            status_code=HTTPStatus.OK,
            content=result
        )
    except AgentRunException as e:
        raise HTTPException(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Update patient failed: {str(e)}")
        raise HTTPException(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            detail=f"Failed to update patient: {str(e)}"
        )
@router.delete("/patient/{patient_id}")
async def delete_patient(
    patient_id: int,
    authorization: Optional[str] = Header(None)
):
    """
    Delete patient record (soft delete)
    """
    try:
        user_id, tenant_id = get_current_user_id(authorization)
        if not user_id or not tenant_id:
            raise HTTPException(
                status_code=HTTPStatus.UNAUTHORIZED,
                detail="Unauthorized"
            )
        result = await patient_service.delete_patient_record(
            patient_id,
            tenant_id,
            user_id
        )
        return JSONResponse(
            status_code=HTTPStatus.OK,
            content=result
        )
    except AgentRunException as e:
        raise HTTPException(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Delete patient failed: {str(e)}")
        raise HTTPException(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete patient: {str(e)}"
        )


# ============================================================================
# Patient Timeline Endpoints
# ============================================================================
@router.post("/patient/timeline/create")
async def create_timeline_stage(
    request: CreateTimelineRequest,
    authorization: Optional[str] = Header(None)
):
    """
    Create a new timeline stage for a patient
    """
    try:
        user_id, tenant_id = get_current_user_id(authorization)
        if not user_id or not tenant_id:
            raise HTTPException(
                status_code=HTTPStatus.UNAUTHORIZED,
                detail="Unauthorized"
            )
        result = await patient_service.create_timeline_stage_service(
            request.dict(),
            tenant_id,
            user_id
        )
        return JSONResponse(
            status_code=HTTPStatus.OK,
            content=result
        )
    except AgentRunException as e:
        raise HTTPException(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Create timeline failed: {str(e)}")
        raise HTTPException(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            detail=f"Failed to create timeline: {str(e)}"
        )


@router.get("/patient/{patient_id}/timeline")
async def get_patient_timeline(
    patient_id: int,
    authorization: Optional[str] = Header(None)
):
    """
    Get complete timeline for a patient
    """
    try:
        user_id, tenant_id = get_current_user_id(authorization)
        if not user_id or not tenant_id:
            raise HTTPException(
                status_code=HTTPStatus.UNAUTHORIZED,
                detail="Unauthorized"
            )
        timelines = await patient_service.get_patient_timeline_service(
            patient_id,
            tenant_id
        )
        return JSONResponse(
            status_code=HTTPStatus.OK,
            content={"timelines": timelines}
        )
    except Exception as e:
        logger.error(f"Get timeline failed: {str(e)}")
        raise HTTPException(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            detail=f"Failed to get timeline: {str(e)}"
        )


@router.get("/patient/timeline/{timeline_id}/detail")
async def get_timeline_detail(
    timeline_id: int,
    authorization: Optional[str] = Header(None)
):
    """
    Get detailed information for a specific timeline stage
    """
    try:
        user_id, tenant_id = get_current_user_id(authorization)
        if not user_id or not tenant_id:
            raise HTTPException(
                status_code=HTTPStatus.UNAUTHORIZED,
                detail="Unauthorized"
            )
        detail = await patient_service.get_timeline_detail_service(
            timeline_id,
            tenant_id
        )
        if not detail:
            raise HTTPException(
                status_code=HTTPStatus.NOT_FOUND,
                detail="Timeline not found"
            )
        return JSONResponse(
            status_code=HTTPStatus.OK,
            content={"timeline": detail}
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get timeline detail failed: {str(e)}")
        raise HTTPException(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            detail=f"Failed to get timeline detail: {str(e)}"
        )


@router.post("/patient/timeline/detail/save")
async def save_timeline_detail(
    request: CreateTimelineDetailRequest,
    authorization: Optional[str] = Header(None)
):
    """
    Create or update timeline detail information
    """
    try:
        user_id, tenant_id = get_current_user_id(authorization)
        if not user_id or not tenant_id:
            raise HTTPException(
                status_code=HTTPStatus.UNAUTHORIZED,
                detail="Unauthorized"
            )
        result = await patient_service.create_timeline_detail_service(
            request.dict(),
            tenant_id,
            user_id
        )
        return JSONResponse(
            status_code=HTTPStatus.OK,
            content=result
        )
    except AgentRunException as e:
        raise HTTPException(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Save timeline detail failed: {str(e)}")
        raise HTTPException(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            detail=f"Failed to save timeline detail: {str(e)}"
        )


@router.delete("/patient/timeline/{timeline_id}")
async def delete_timeline(
    timeline_id: int,
    authorization: Optional[str] = Header(None)
):
    """
    Delete a timeline stage (soft delete)
    """
    try:
        user_id, tenant_id = get_current_user_id(authorization)
        if not user_id or not tenant_id:
            raise HTTPException(
                status_code=HTTPStatus.UNAUTHORIZED,
                detail="Unauthorized"
            )
        result = await patient_service.delete_timeline_service(
            timeline_id,
            tenant_id,
            user_id
        )
        return JSONResponse(
            status_code=HTTPStatus.OK,
            content=result
        )
    except AgentRunException as e:
        raise HTTPException(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Delete timeline failed: {str(e)}")
        raise HTTPException(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete timeline: {str(e)}"
        )


# ============================================================================
# Medical Image Endpoints
# ============================================================================
@router.post("/patient/timeline/image/create")
async def create_medical_image(
    request: CreateMedicalImageRequest,
    authorization: Optional[str] = Header(None)
):
    """
    Create a medical image record
    """
    try:
        user_id, tenant_id = get_current_user_id(authorization)
        if not user_id or not tenant_id:
            raise HTTPException(
                status_code=HTTPStatus.UNAUTHORIZED,
                detail="Unauthorized"
            )
        result = await patient_service.upload_medical_image_service(
            request.dict(),
            tenant_id,
            user_id
        )
        return JSONResponse(
            status_code=HTTPStatus.OK,
            content=result
        )
    except AgentRunException as e:
        raise HTTPException(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Create medical image failed: {str(e)}")
        raise HTTPException(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            detail=f"Failed to create medical image: {str(e)}"
        )


@router.delete("/patient/timeline/{timeline_id}/images")
async def delete_timeline_images(
    timeline_id: int,
    authorization: Optional[str] = Header(None)
):
    """
    Delete all images for a timeline (soft delete)
    """
    try:
        user_id, tenant_id = get_current_user_id(authorization)
        if not user_id or not tenant_id:
            raise HTTPException(
                status_code=HTTPStatus.UNAUTHORIZED,
                detail="Unauthorized"
            )
        result = await patient_service.delete_timeline_images_service(
            timeline_id,
            tenant_id,
            user_id
        )
        return JSONResponse(
            status_code=HTTPStatus.OK,
            content=result
        )
    except AgentRunException as e:
        raise HTTPException(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Delete timeline images failed: {str(e)}")
        raise HTTPException(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete timeline images: {str(e)}"
        )

# ============================================================================
# Metrics Endpoints
# ============================================================================
@router.post("/patient/timeline/metrics/batch")
async def batch_create_metrics(
    request: BatchCreateMetricsRequest,
    authorization: Optional[str] = Header(None)
):
    """
    Batch create patient metrics
    """
    try:
        user_id, tenant_id = get_current_user_id(authorization)
        if not user_id or not tenant_id:
            raise HTTPException(
                status_code=HTTPStatus.UNAUTHORIZED,
                detail="Unauthorized"
            )
        metrics_data = [m.dict() for m in request.metrics]
        result = await patient_service.batch_create_metrics_service(
            metrics_data,
            tenant_id,
            user_id
        )
        return JSONResponse(
            status_code=HTTPStatus.OK,
            content=result
        )
    except AgentRunException as e:
        raise HTTPException(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Batch create metrics failed: {str(e)}")
        raise HTTPException(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            detail=f"Failed to batch create metrics: {str(e)}"
        )


@router.delete("/patient/timeline/{timeline_id}/metrics")
async def delete_timeline_metrics(
    timeline_id: int,
    authorization: Optional[str] = Header(None)
):
    """
    Delete all metrics for a timeline (soft delete)
    """
    try:
        user_id, tenant_id = get_current_user_id(authorization)
        if not user_id or not tenant_id:
            raise HTTPException(
                status_code=HTTPStatus.UNAUTHORIZED,
                detail="Unauthorized"
            )
        result = await patient_service.delete_timeline_metrics_service(
            timeline_id,
            tenant_id,
            user_id
        )
        return JSONResponse(
            status_code=HTTPStatus.OK,
            content=result
        )
    except AgentRunException as e:
        raise HTTPException(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Delete timeline metrics failed: {str(e)}")
        raise HTTPException(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete timeline metrics: {str(e)}"
        )
# ============================================================================
# Patient Todo Endpoints
# ============================================================================
@router.post("/patient/todo/create")
async def create_patient_todo(
    request: CreateTodoRequest,
    authorization: Optional[str] = Header(None)
):
    """
    Create a patient todo item
    """
    try:
        user_id, tenant_id = get_current_user_id(authorization)
        if not user_id or not tenant_id:
            raise HTTPException(
                status_code=HTTPStatus.UNAUTHORIZED,
                detail="Unauthorized"
            )
        result = await patient_service.create_patient_todo_service(
            request.dict(),
            tenant_id,
            user_id
        )
        return JSONResponse(
            status_code=HTTPStatus.OK,
            content=result
        )
    except AgentRunException as e:
        raise HTTPException(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Create todo failed: {str(e)}")
        raise HTTPException(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            detail=f"Failed to create todo: {str(e)}"
        )


@router.get("/patient/{patient_id}/todos")
async def get_patient_todos(
    patient_id: int,
    status: Optional[str] = None,
    authorization: Optional[str] = Header(None)
):
    """
    Get patient todos with optional status filter
    """
    try:
        user_id, tenant_id = get_current_user_id(authorization)
        if not user_id or not tenant_id:
            raise HTTPException(
                status_code=HTTPStatus.UNAUTHORIZED,
                detail="Unauthorized"
            )
        todos = await patient_service.get_patient_todos_service(
            patient_id,
            tenant_id,
            status
        )
        return JSONResponse(
            status_code=HTTPStatus.OK,
            content={"todos": todos}
        )
    except Exception as e:
        logger.error(f"Get todos failed: {str(e)}")
        raise HTTPException(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            detail=f"Failed to get todos: {str(e)}"
        )


@router.put("/patient/todo/{todo_id}/status")
async def update_todo_status(
    todo_id: int,
    request: UpdateTodoStatusRequest,
    authorization: Optional[str] = Header(None)
):
    """
    Update todo status
    """
    try:
        user_id, tenant_id = get_current_user_id(authorization)
        if not user_id or not tenant_id:
            raise HTTPException(
                status_code=HTTPStatus.UNAUTHORIZED,
                detail="Unauthorized"
            )
        result = await patient_service.update_todo_status_service(
            todo_id,
            request.status,
            tenant_id,
            user_id
        )
        return JSONResponse(
            status_code=HTTPStatus.OK,
            content=result
        )
    except AgentRunException as e:
        raise HTTPException(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Update todo status failed: {str(e)}")
        raise HTTPException(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            detail=f"Failed to update todo status: {str(e)}"
        )


@router.delete("/patient/todo/{todo_id}")
async def delete_patient_todo(
    todo_id: int,
    authorization: Optional[str] = Header(None)
):
    """
    Delete a patient todo item (soft delete)
    """
    try:
        user_id, tenant_id = get_current_user_id(authorization)
        if not user_id or not tenant_id:
            raise HTTPException(
                status_code=HTTPStatus.UNAUTHORIZED,
                detail="Unauthorized"
            )
        result = await patient_service.delete_patient_todo_service(
            todo_id,
            tenant_id,
            user_id
        )
        return JSONResponse(
            status_code=HTTPStatus.OK,
            content=result
        )
    except AgentRunException as e:
        raise HTTPException(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Delete todo failed: {str(e)}")
        raise HTTPException(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete todo: {str(e)}"
        )


# ============================================================================
# Attachment Endpoints
# ============================================================================

@router.post("/patient/timeline/attachment/create")
async def create_timeline_attachment(
    request: CreateAttachmentRequest,
    authorization: Optional[str] = Header(None)
):
    """
    Create a new timeline attachment record
    """
    try:
        user_id, tenant_id = get_current_user_id(authorization)
        if not user_id or not tenant_id:
            raise HTTPException(
                status_code=HTTPStatus.UNAUTHORIZED,
                detail="Unauthorized"
            )

        result = await patient_service.create_attachment_service(
            request.dict(),
            tenant_id,
            user_id
        )

        return JSONResponse(
            status_code=HTTPStatus.OK,
            content=result
        )
    except Exception as e:
        logger.error(f"Create attachment failed: {str(e)}")
        raise HTTPException(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            detail=f"Failed to create attachment: {str(e)}"
        )


@router.delete("/patient/timeline/{timeline_id}/attachments")
async def delete_timeline_attachments(
    timeline_id: int,
    authorization: Optional[str] = Header(None)
):
    """
    Delete all attachments for a timeline (soft delete)
    """
    try:
        user_id, tenant_id = get_current_user_id(authorization)
        if not user_id or not tenant_id:
            raise HTTPException(
                status_code=HTTPStatus.UNAUTHORIZED,
                detail="Unauthorized"
            )

        result = await patient_service.delete_timeline_attachments_service(
            timeline_id,
            tenant_id,
            user_id
        )

        return JSONResponse(
            status_code=HTTPStatus.OK,
            content=result
        )
    except Exception as e:
        logger.error(f"Delete timeline attachments failed: {str(e)}")
        raise HTTPException(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete attachments: {str(e)}"
        )