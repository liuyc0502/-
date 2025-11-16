"""
Case library HTTP API endpoints
"""
import logging
from http import HTTPStatus
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Header, Query
from starlette.responses import JSONResponse
from pydantic import BaseModel, Field

from services import case_service
from utils.auth_utils import get_current_user_id
from consts.exceptions import AgentRunException

logger = logging.getLogger(__name__)
router = APIRouter()


# ============================================================================
# Request/Response Models
# ============================================================================

class LabTestData(BaseModel):
    test_name: str = Field(..., description="Test name")
    test_value: str = Field(..., description="Test value")
    test_unit: Optional[str] = Field(None, description="Unit")
    normal_range: Optional[str] = Field(None, description="Normal range")
    is_abnormal: bool = Field(False, description="Whether the result is abnormal")


class CreateCaseRequest(BaseModel):
    case_no: str = Field(..., description="Case number (e.g., #0234)")
    diagnosis: str = Field(..., description="Primary diagnosis")
    patient_age: int = Field(..., description="Patient age")
    patient_gender: str = Field(..., description="Patient gender: 男/女")
    chief_complaint: Optional[str] = Field(None, description="Chief complaint")
    present_illness: Optional[str] = Field(None, description="History of present illness")
    past_medical_history: Optional[str] = Field(None, description="Past medical history")
    physical_examination: Optional[str] = Field(None, description="Physical examination findings")
    imaging_findings: Optional[str] = Field(None, description="Imaging findings")
    treatment_plan: Optional[str] = Field(None, description="Treatment plan")
    prognosis: Optional[str] = Field(None, description="Prognosis")
    symptoms: List[str] = Field(default_factory=list, description="Key symptoms list")
    laboratory_tests: Optional[List[LabTestData]] = Field(default_factory=list, description="Laboratory test results")


class SearchSimilarCasesRequest(BaseModel):
    symptoms: List[str] = Field(..., description="Symptom list for similarity search")
    diagnosis: Optional[str] = Field(None, description="Filter by diagnosis")
    age: Optional[int] = Field(None, description="Patient age")
    gender: Optional[str] = Field(None, description="Patient gender")
    limit: int = Field(10, description="Maximum number of results")


class BatchCreateLabTestsRequest(BaseModel):
    case_id: int = Field(..., description="Case ID")
    lab_tests: List[LabTestData] = Field(..., description="Laboratory test list")


# ============================================================================
# Case Basic Info Endpoints
# ============================================================================

@router.post("/case/create")
async def create_case(
    request: CreateCaseRequest,
    authorization: Optional[str] = Header(None)
):
    """
    Create a new case record
    """
    try:
        user_id, tenant_id = get_current_user_id(authorization)
        if not user_id or not tenant_id:
            raise HTTPException(
                status_code=HTTPStatus.UNAUTHORIZED,
                detail="Unauthorized"
            )

        result = await case_service.create_case_record(
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
        logger.error(f"Create case failed: {str(e)}")
        raise HTTPException(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            detail=f"Failed to create case: {str(e)}"
        )


@router.get("/case/{case_id}")
async def get_case(
    case_id: int,
    authorization: Optional[str] = Header(None)
):
    """
    Get case information by ID
    """
    try:
        user_id, tenant_id = get_current_user_id(authorization)
        if not user_id or not tenant_id:
            raise HTTPException(
                status_code=HTTPStatus.UNAUTHORIZED,
                detail="Unauthorized"
            )

        case = await case_service.get_case_info(case_id, tenant_id)

        if not case:
            raise HTTPException(
                status_code=HTTPStatus.NOT_FOUND,
                detail="Case not found"
            )

        return JSONResponse(
            status_code=HTTPStatus.OK,
            content={"case": case}
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get case failed: {str(e)}")
        raise HTTPException(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            detail=f"Failed to get case: {str(e)}"
        )


@router.get("/case/{case_id}/detail")
async def get_case_detail(
    case_id: int,
    authorization: Optional[str] = Header(None)
):
    """
    Get detailed case information with laboratory tests and similar cases
    """
    try:
        user_id, tenant_id = get_current_user_id(authorization)
        if not user_id or not tenant_id:
            raise HTTPException(
                status_code=HTTPStatus.UNAUTHORIZED,
                detail="Unauthorized"
            )

        case_detail = await case_service.get_case_detail_service(case_id, tenant_id)

        if not case_detail:
            raise HTTPException(
                status_code=HTTPStatus.NOT_FOUND,
                detail="Case not found"
            )

        return JSONResponse(
            status_code=HTTPStatus.OK,
            content={"case": case_detail}
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get case detail failed: {str(e)}")
        raise HTTPException(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            detail=f"Failed to get case detail: {str(e)}"
        )


@router.get("/case/list")
async def list_cases(
    search: Optional[str] = Query(None, description="Search query"),
    disease_types: Optional[List[str]] = Query(None, description="Disease type filters"),
    age_ranges: Optional[List[str]] = Query(None, description="Age range filters"),
    gender: Optional[str] = Query(None, description="Gender filter"),
    limit: int = Query(100, description="Result limit"),
    offset: int = Query(0, description="Result offset"),
    authorization: Optional[str] = Header(None)
):
    """
    List cases with optional search and filters
    """
    try:
        user_id, tenant_id = get_current_user_id(authorization)
        if not user_id or not tenant_id:
            raise HTTPException(
                status_code=HTTPStatus.UNAUTHORIZED,
                detail="Unauthorized"
            )

        cases = await case_service.list_cases_service(
            tenant_id,
            search,
            disease_types,
            age_ranges,
            gender,
            limit,
            offset
        )

        return JSONResponse(
            status_code=HTTPStatus.OK,
            content={"cases": cases, "total": len(cases)}
        )

    except Exception as e:
        logger.error(f"List cases failed: {str(e)}")
        raise HTTPException(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            detail=f"Failed to list cases: {str(e)}"
        )


@router.post("/case/search/similar")
async def search_similar_cases(
    request: SearchSimilarCasesRequest,
    authorization: Optional[str] = Header(None)
):
    """
    Search for similar cases based on symptoms and patient info
    """
    try:
        user_id, tenant_id = get_current_user_id(authorization)
        if not user_id or not tenant_id:
            raise HTTPException(
                status_code=HTTPStatus.UNAUTHORIZED,
                detail="Unauthorized"
            )

        similar_cases = await case_service.search_similar_cases_service(
            symptoms=request.symptoms,
            tenant_id=tenant_id,
            diagnosis=request.diagnosis,
            age=request.age,
            gender=request.gender,
            limit=request.limit
        )

        return JSONResponse(
            status_code=HTTPStatus.OK,
            content={"cases": similar_cases, "total": len(similar_cases)}
        )

    except AgentRunException as e:
        raise HTTPException(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Search similar cases failed: {str(e)}")
        raise HTTPException(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            detail=f"Failed to search similar cases: {str(e)}"
        )


@router.put("/case/{case_id}/update")
async def update_case(
    case_id: int,
    request: CreateCaseRequest,
    authorization: Optional[str] = Header(None)
):
    """
    Update case information
    """
    try:
        user_id, tenant_id = get_current_user_id(authorization)
        if not user_id or not tenant_id:
            raise HTTPException(
                status_code=HTTPStatus.UNAUTHORIZED,
                detail="Unauthorized"
            )

        result = await case_service.update_case_info(
            case_id,
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
        logger.error(f"Update case failed: {str(e)}")
        raise HTTPException(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            detail=f"Failed to update case: {str(e)}"
        )


@router.delete("/case/{case_id}/delete")
async def delete_case(
    case_id: int,
    authorization: Optional[str] = Header(None)
):
    """
    Delete case record (soft delete)
    """
    try:
        user_id, tenant_id = get_current_user_id(authorization)
        if not user_id or not tenant_id:
            raise HTTPException(
                status_code=HTTPStatus.UNAUTHORIZED,
                detail="Unauthorized"
            )

        result = await case_service.delete_case_record(
            case_id,
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
        logger.error(f"Delete case failed: {str(e)}")
        raise HTTPException(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete case: {str(e)}"
        )


# ============================================================================
# Laboratory Test Endpoints
# ============================================================================

@router.post("/case/lab_tests/batch")
async def batch_create_lab_tests(
    request: BatchCreateLabTestsRequest,
    authorization: Optional[str] = Header(None)
):
    """
    Batch create laboratory tests for a case
    """
    try:
        user_id, tenant_id = get_current_user_id(authorization)
        if not user_id or not tenant_id:
            raise HTTPException(
                status_code=HTTPStatus.UNAUTHORIZED,
                detail="Unauthorized"
            )

        lab_tests_data = [t.dict() for t in request.lab_tests]
        result = await case_service.batch_create_lab_tests_service(
            request.case_id,
            lab_tests_data,
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
        logger.error(f"Batch create lab tests failed: {str(e)}")
        raise HTTPException(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            detail=f"Failed to batch create lab tests: {str(e)}"
        )


@router.get("/case/{case_id}/lab_tests")
async def get_case_lab_tests(
    case_id: int,
    authorization: Optional[str] = Header(None)
):
    """
    Get all laboratory tests for a case
    """
    try:
        user_id, tenant_id = get_current_user_id(authorization)
        if not user_id or not tenant_id:
            raise HTTPException(
                status_code=HTTPStatus.UNAUTHORIZED,
                detail="Unauthorized"
            )

        tests = await case_service.get_case_lab_tests_service(
            case_id,
            tenant_id
        )

        return JSONResponse(
            status_code=HTTPStatus.OK,
            content={"lab_tests": tests}
        )

    except Exception as e:
        logger.error(f"Get lab tests failed: {str(e)}")
        raise HTTPException(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            detail=f"Failed to get lab tests: {str(e)}"
        )
