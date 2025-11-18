import logging
from http import HTTPStatus
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Header
from starlette.responses import JSONResponse
from pydantic import BaseModel, Field
from services import care_plan_service
from utils.auth_utils import get_current_user_id
from consts.exceptions import AgentRunException
logger = logging.getLogger(__name__)
router = APIRouter()
# ============================================================================
# Request/Response Models
# ============================================================================
class MedicationData(BaseModel):
    medication_name: str = Field(..., description="Medication name")
    dosage: str = Field(..., description="Dosage (e.g., 20mg, 1 tablet)")
    frequency: str = Field(..., description="Frequency (e.g., daily, twice daily)")
    time_slots: List[str] = Field(default_factory=list, description="Time slots (e.g., ['08:00', '20:00'])")
    notes: Optional[str] = Field(None, description="Administration notes")
class TaskData(BaseModel):
    task_title: str = Field(..., description="Task title")
    task_description: Optional[str] = Field(None, description="Task description")
    task_category: str = Field(..., description="Task category: 运动/护理/监测/饮食")
    frequency: Optional[str] = Field(None, description="Frequency")
    duration: Optional[str] = Field(None, description="Duration")
class PrecautionData(BaseModel):
    precaution_content: str = Field(..., description="Precaution content")
    priority: Optional[str] = Field("medium", description="Priority: high/medium/low")
class CreateCarePlanRequest(BaseModel):
    patient_id: int = Field(..., description="Patient ID")
    plan_name: str = Field(..., description="Care plan name")
    plan_description: Optional[str] = Field(None, description="Plan description")
    start_date: str = Field(..., description="Start date (YYYY-MM-DD)")
    end_date: Optional[str] = Field(None, description="End date (YYYY-MM-DD)")
    medications: List[MedicationData] = Field(default_factory=list, description="Medications list")
    tasks: List[TaskData] = Field(default_factory=list, description="Tasks list")
    precautions: List[PrecautionData] = Field(default_factory=list, description="Precautions list")
class UpdateCarePlanRequest(BaseModel):
    plan_name: Optional[str] = Field(None, description="Care plan name")
    plan_description: Optional[str] = Field(None, description="Plan description")
    start_date: Optional[str] = Field(None, description="Start date (YYYY-MM-DD)")
    end_date: Optional[str] = Field(None, description="End date (YYYY-MM-DD)")
    status: Optional[str] = Field(None, description="Status: active/completed/paused")
class AddMedicationRequest(BaseModel):
    plan_id: int = Field(..., description="Care plan ID")
    medication_name: str = Field(..., description="Medication name")
    dosage: str = Field(..., description="Dosage")
    frequency: str = Field(..., description="Frequency")
    time_slots: List[str] = Field(default_factory=list, description="Time slots")
    notes: Optional[str] = Field(None, description="Notes")
class AddTaskRequest(BaseModel):
    plan_id: int = Field(..., description="Care plan ID")
    task_title: str = Field(..., description="Task title")
    task_description: Optional[str] = Field(None, description="Task description")
    task_category: str = Field(..., description="Task category")
    frequency: Optional[str] = Field(None, description="Frequency")
    duration: Optional[str] = Field(None, description="Duration")
class AddPrecautionRequest(BaseModel):
    plan_id: int = Field(..., description="Care plan ID")
    precaution_content: str = Field(..., description="Precaution content")
    priority: Optional[str] = Field("medium", description="Priority")
class RecordCompletionRequest(BaseModel):
    plan_id: int = Field(..., description="Care plan ID")
    patient_id: int = Field(..., description="Patient ID")
    record_date: str = Field(..., description="Record date (YYYY-MM-DD)")
    item_type: str = Field(..., description="Item type: medication/task")
    item_id: int = Field(..., description="Medication ID or Task ID")
    completed: bool = Field(..., description="Whether the item was completed")
    notes: Optional[str] = Field(None, description="Notes")
# ============================================================================
# Care Plan Endpoints
# ============================================================================
@router.post("/care_plan/create")
async def create_care_plan(
    request: CreateCarePlanRequest,
    authorization: Optional[str] = Header(None)
):
    """
    Create a new care plan with medications, tasks, and precautions
    """
    try:
        user_id, tenant_id = get_current_user_id(authorization)
        if not user_id or not tenant_id:
            raise HTTPException(
                status_code=HTTPStatus.UNAUTHORIZED,
                detail="Unauthorized"
            )
        plan_data = request.dict()
        result = await care_plan_service.create_care_plan_service(plan_data, tenant_id, user_id)
        return JSONResponse(
            status_code=HTTPStatus.OK,
            content=result
        )
    except ValueError as e:
        raise HTTPException(
            status_code=HTTPStatus.BAD_REQUEST,
            detail=str(e)
        )
    except AgentRunException as e:
        raise HTTPException(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
@router.get("/care_plan/get/{plan_id}")
async def get_care_plan(
    plan_id: int,
    authorization: Optional[str] = Header(None)
):
    """
    Get care plan details with all medications, tasks, and precautions
    """
    try:
        user_id, tenant_id = get_current_user_id(authorization)
        if not user_id or not tenant_id:
            raise HTTPException(
                status_code=HTTPStatus.UNAUTHORIZED,
                detail="Unauthorized"
            )
        plan = await care_plan_service.get_care_plan_service(plan_id, tenant_id)
        if not plan:
            raise HTTPException(
                status_code=HTTPStatus.NOT_FOUND,
                detail="Care plan not found"
            )
        return JSONResponse(
            status_code=HTTPStatus.OK,
            content=plan
        )
    except AgentRunException as e:
        raise HTTPException(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
@router.get("/care_plan/list/{patient_id}")
async def list_care_plans(
    patient_id: int,
    status: Optional[str] = None,
    authorization: Optional[str] = Header(None)
):
    """
    List all care plans for a patient
    """
    try:
        user_id, tenant_id = get_current_user_id(authorization)
        if not user_id or not tenant_id:
            raise HTTPException(
                status_code=HTTPStatus.UNAUTHORIZED,
                detail="Unauthorized"
            )
        plans = await care_plan_service.list_care_plans_service(patient_id, tenant_id, status)
        return JSONResponse(
            status_code=HTTPStatus.OK,
            content={"plans": plans}
        )
    except AgentRunException as e:
        raise HTTPException(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
@router.put("/care_plan/update/{plan_id}")
async def update_care_plan(
    plan_id: int,
    request: UpdateCarePlanRequest,
    authorization: Optional[str] = Header(None)
):
    """
    Update care plan
    """
    try:
        user_id, tenant_id = get_current_user_id(authorization)
        if not user_id or not tenant_id:
            raise HTTPException(
                status_code=HTTPStatus.UNAUTHORIZED,
                detail="Unauthorized"
            )
        plan_data = request.dict(exclude_none=True)
        result = await care_plan_service.update_care_plan_service(plan_id, plan_data, tenant_id, user_id)
        return JSONResponse(
            status_code=HTTPStatus.OK,
            content=result
        )
    except ValueError as e:
        raise HTTPException(
            status_code=HTTPStatus.BAD_REQUEST,
            detail=str(e)
        )
    except AgentRunException as e:
        raise HTTPException(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
@router.delete("/care_plan/delete/{plan_id}")
async def delete_care_plan(
    plan_id: int,
    authorization: Optional[str] = Header(None)
):
    """
    Delete care plan (soft delete)
    """
    try:
        user_id, tenant_id = get_current_user_id(authorization)
        if not user_id or not tenant_id:
            raise HTTPException(
                status_code=HTTPStatus.UNAUTHORIZED,
                detail="Unauthorized"
            )
        result = await care_plan_service.delete_care_plan_service(plan_id, tenant_id, user_id)
        return JSONResponse(
            status_code=HTTPStatus.OK,
            content=result
        )
    except ValueError as e:
        raise HTTPException(
            status_code=HTTPStatus.BAD_REQUEST,
            detail=str(e)
        )
    except AgentRunException as e:
        raise HTTPException(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
# ============================================================================
# Medication Endpoints
# ============================================================================
@router.post("/care_plan/medication/add")
async def add_medication(
    request: AddMedicationRequest,
    authorization: Optional[str] = Header(None)
):
    """
    Add a medication to a care plan
    """
    try:
        user_id, tenant_id = get_current_user_id(authorization)
        if not user_id or not tenant_id:
            raise HTTPException(
                status_code=HTTPStatus.UNAUTHORIZED,
                detail="Unauthorized"
            )
        medication_data = request.dict()
        result = await care_plan_service.add_medication_service(medication_data, tenant_id, user_id)
        return JSONResponse(
            status_code=HTTPStatus.OK,
            content=result
        )
    except AgentRunException as e:
        raise HTTPException(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
@router.delete("/care_plan/medication/delete/{medication_id}")
async def delete_medication(
    medication_id: int,
    authorization: Optional[str] = Header(None)
):
    """
    Delete a medication
    """
    try:
        user_id, tenant_id = get_current_user_id(authorization)
        if not user_id or not tenant_id:
            raise HTTPException(
                status_code=HTTPStatus.UNAUTHORIZED,
                detail="Unauthorized"
            )
        result = await care_plan_service.delete_medication_service(medication_id, tenant_id, user_id)
        return JSONResponse(
            status_code=HTTPStatus.OK,
            content=result
        )
    except ValueError as e:
        raise HTTPException(
            status_code=HTTPStatus.BAD_REQUEST,
            detail=str(e)
        )
    except AgentRunException as e:
        raise HTTPException(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
# ============================================================================
# Task Endpoints
# ============================================================================
@router.post("/care_plan/task/add")
async def add_task(
    request: AddTaskRequest,
    authorization: Optional[str] = Header(None)
):
    """
    Add a task to a care plan
    """
    try:
        user_id, tenant_id = get_current_user_id(authorization)
        if not user_id or not tenant_id:
            raise HTTPException(
                status_code=HTTPStatus.UNAUTHORIZED,
                detail="Unauthorized"
            )
        task_data = request.dict()
        result = await care_plan_service.add_task_service(task_data, tenant_id, user_id)
        return JSONResponse(
            status_code=HTTPStatus.OK,
            content=result
        )
    except AgentRunException as e:
        raise HTTPException(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
@router.delete("/care_plan/task/delete/{task_id}")
async def delete_task(
    task_id: int,
    authorization: Optional[str] = Header(None)
):
    """
    Delete a task
    """
    try:
        user_id, tenant_id = get_current_user_id(authorization)
        if not user_id or not tenant_id:
            raise HTTPException(
                status_code=HTTPStatus.UNAUTHORIZED,
                detail="Unauthorized"
            )
        result = await care_plan_service.delete_task_service(task_id, tenant_id, user_id)
        return JSONResponse(
            status_code=HTTPStatus.OK,
            content=result
        )
    except ValueError as e:
        raise HTTPException(
            status_code=HTTPStatus.BAD_REQUEST,
            detail=str(e)
        )
    except AgentRunException as e:
        raise HTTPException(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
# ============================================================================
# Precaution Endpoints
# ============================================================================
@router.post("/care_plan/precaution/add")
async def add_precaution(
    request: AddPrecautionRequest,
    authorization: Optional[str] = Header(None)
):
    """
    Add a precaution to a care plan
    """
    try:
        user_id, tenant_id = get_current_user_id(authorization)
        if not user_id or not tenant_id:
            raise HTTPException(
                status_code=HTTPStatus.UNAUTHORIZED,
                detail="Unauthorized"
            )
        precaution_data = request.dict()
        result = await care_plan_service.add_precaution_service(precaution_data, tenant_id, user_id)
        return JSONResponse(
            status_code=HTTPStatus.OK,
            content=result
        )
    except AgentRunException as e:
        raise HTTPException(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
@router.delete("/care_plan/precaution/delete/{precaution_id}")
async def delete_precaution(
    precaution_id: int,
    authorization: Optional[str] = Header(None)
):
    """
    Delete a precaution
    """
    try:
        user_id, tenant_id = get_current_user_id(authorization)
        if not user_id or not tenant_id:
            raise HTTPException(
                status_code=HTTPStatus.UNAUTHORIZED,
                detail="Unauthorized"
            )
        result = await care_plan_service.delete_precaution_service(precaution_id, tenant_id, user_id)
        return JSONResponse(
            status_code=HTTPStatus.OK,
            content=result
        )
    except ValueError as e:
        raise HTTPException(
            status_code=HTTPStatus.BAD_REQUEST,
            detail=str(e)
        )
    except AgentRunException as e:
        raise HTTPException(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
# ============================================================================
# Completion Endpoints (for Patient Portal)
# ============================================================================
@router.post("/care_plan/completion/record")
async def record_completion(
    request: RecordCompletionRequest,
    authorization: Optional[str] = Header(None)
):
    """
    Record completion status for a medication or task
    """
    try:
        user_id, tenant_id = get_current_user_id(authorization)
        if not user_id or not tenant_id:
            raise HTTPException(
                status_code=HTTPStatus.UNAUTHORIZED,
                detail="Unauthorized"
            )
        completion_data = request.dict()
        result = await care_plan_service.record_completion_service(completion_data, tenant_id, user_id)
        return JSONResponse(
            status_code=HTTPStatus.OK,
            content=result
        )
    except ValueError as e:
        raise HTTPException(
            status_code=HTTPStatus.BAD_REQUEST,
            detail=str(e)
        )
    except AgentRunException as e:
        raise HTTPException(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
@router.get("/care_plan/today/{patient_id}")
async def get_today_plan(
    patient_id: int,
    record_date: Optional[str] = None,
    authorization: Optional[str] = Header(None)
):
    """
    Get today's care plan for a patient with completion status
    """
    try:
        user_id, tenant_id = get_current_user_id(authorization)
        if not user_id or not tenant_id:
            raise HTTPException(
                status_code=HTTPStatus.UNAUTHORIZED,
                detail="Unauthorized"
            )
        plan = await care_plan_service.get_today_plan_service(patient_id, tenant_id, record_date)
        return JSONResponse(
            status_code=HTTPStatus.OK,
            content=plan
        )
    except AgentRunException as e:
        raise HTTPException(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
@router.get("/care_plan/weekly_progress/{patient_id}")
async def get_weekly_progress(
    patient_id: int,
    end_date: Optional[str] = None,
    authorization: Optional[str] = Header(None)
):
    """
    Get weekly progress statistics
    """
    try:
        user_id, tenant_id = get_current_user_id(authorization)
        if not user_id or not tenant_id:
            raise HTTPException(
                status_code=HTTPStatus.UNAUTHORIZED,
                detail="Unauthorized"
            )
        progress = await care_plan_service.get_weekly_progress_service(patient_id, tenant_id, end_date)
        return JSONResponse(
            status_code=HTTPStatus.OK,
            content=progress
        )
    except AgentRunException as e:
        raise HTTPException(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            detail=str(e)
        )