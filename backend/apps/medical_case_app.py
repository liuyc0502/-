"""
Medical case library API endpoints
"""
import logging
from http import HTTPStatus
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Header, Query
from starlette.responses import JSONResponse
from pydantic import BaseModel, Field

from services import medical_case_service
from utils.auth_utils import get_current_user_id
from consts.exceptions import AgentRunException

logger = logging.getLogger(__name__)
router = APIRouter()


# ============================================================================
# Request/Response Models
# ============================================================================

class CreateMedicalCaseRequest(BaseModel):
    case_no: str = Field(..., description="Case number (e.g., #0234)")
    case_title: Optional[str] = Field(None, description="Case title")
    diagnosis: str = Field(..., description="Primary diagnosis")
    disease_type: str = Field(..., description="Disease type/category")
    age: int = Field(..., description="Patient age")
    gender: str = Field(..., description="Patient gender")
    chief_complaint: Optional[str] = Field(None, description="Chief complaint")
    category: Optional[str] = Field("common", description="Case category")
    is_classic: Optional[bool] = Field(False, description="Is this a classic case")
    tags: Optional[List[str]] = Field(default_factory=list, description="Case tags")


class CreateCaseDetailRequest(BaseModel):
    case_id: int = Field(..., description="Case ID")
    present_illness_history: Optional[str] = Field(None, description="Present illness history")
    past_medical_history: Optional[str] = Field(None, description="Past medical history")
    family_history: Optional[str] = Field(None, description="Family history")
    physical_examination: Optional[dict] = Field(default_factory=dict, description="Physical examination")
    imaging_results: Optional[dict] = Field(default_factory=dict, description="Imaging results")
    diagnosis_basis: Optional[str] = Field(None, description="Diagnosis basis")
    treatment_plan: Optional[str] = Field(None, description="Treatment plan")
    medications: Optional[List[str]] = Field(default_factory=list, description="Medications")
    prognosis: Optional[str] = Field(None, description="Prognosis")
    clinical_notes: Optional[str] = Field(None, description="Clinical notes")


class ToggleFavoriteRequest(BaseModel):
    case_id: int = Field(..., description="Case ID")
    action: str = Field(..., description="Action: 'add' or 'remove'")


# ============================================================================
# Case Basic Endpoints
# ============================================================================

@router.post("/medical_case/create")
async def create_medical_case(
    request: CreateMedicalCaseRequest,
    authorization: Optional[str] = Header(None)
):
    """
    Create a new medical case
    """
    try:
        user_id, tenant_id = get_current_user_id(authorization)
        if not user_id or not tenant_id:
            raise HTTPException(
                status_code=HTTPStatus.UNAUTHORIZED,
                detail="Unauthorized"
            )

        result = await medical_case_service.create_case(
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
        logger.error(f"Create medical case failed: {str(e)}")
        raise HTTPException(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            detail=f"Failed to create medical case: {str(e)}"
        )


@router.get("/medical_case/list")
async def list_medical_cases(
    search: Optional[str] = Query(None, description="Search query"),
    disease_types: Optional[str] = Query(None, description="Comma-separated disease types"),
    age_range: Optional[str] = Query(None, description="Age range: <30, 30-50, 50-70, >70"),
    gender: Optional[str] = Query(None, description="Gender filter"),
    is_classic: Optional[bool] = Query(None, description="Filter classic cases"),
    limit: int = Query(100, description="Limit"),
    offset: int = Query(0, description="Offset"),
    authorization: Optional[str] = Header(None)
):
    """
    List medical cases with filters
    """
    try:
        user_id, tenant_id = get_current_user_id(authorization)
        if not user_id or not tenant_id:
            raise HTTPException(
                status_code=HTTPStatus.UNAUTHORIZED,
                detail="Unauthorized"
            )

        # Parse disease types from comma-separated string
        disease_types_list = None
        if disease_types:
            disease_types_list = [dt.strip() for dt in disease_types.split(',')]

        cases = await medical_case_service.list_cases(
            tenant_id=tenant_id,
            search_query=search,
            disease_types=disease_types_list,
            age_range=age_range,
            gender=gender,
            is_classic=is_classic,
            limit=limit,
            offset=offset
        )

        return JSONResponse(
            status_code=HTTPStatus.OK,
            content={"cases": cases, "total": len(cases)}
        )
    except Exception as e:
        logger.error(f"List medical cases failed: {str(e)}")
        raise HTTPException(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            detail=f"Failed to list medical cases: {str(e)}"
        )


@router.get("/medical_case/{case_id}")
async def get_medical_case(
    case_id: int,
    authorization: Optional[str] = Header(None)
):
    """
    Get medical case detail by ID
    """
    try:
        user_id, tenant_id = get_current_user_id(authorization)
        if not user_id or not tenant_id:
            raise HTTPException(
                status_code=HTTPStatus.UNAUTHORIZED,
                detail="Unauthorized"
            )

        case = await medical_case_service.get_case_info(case_id, tenant_id, user_id)
        if not case:
            raise HTTPException(
                status_code=HTTPStatus.NOT_FOUND,
                detail="Medical case not found"
            )

        return JSONResponse(
            status_code=HTTPStatus.OK,
            content=case
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get medical case failed: {str(e)}")
        raise HTTPException(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            detail=f"Failed to get medical case: {str(e)}"
        )


@router.get("/medical_case/by_case_no/{case_no}")
async def get_case_by_case_no(
    case_no: str,
    authorization: Optional[str] = Header(None)
):
    """
    Get medical case by case number
    """
    try:
        user_id, tenant_id = get_current_user_id(authorization)
        if not user_id or not tenant_id:
            raise HTTPException(
                status_code=HTTPStatus.UNAUTHORIZED,
                detail="Unauthorized"
            )

        case = await medical_case_service.get_case_by_case_no(case_no, tenant_id, user_id)
        if not case:
            raise HTTPException(
                status_code=HTTPStatus.NOT_FOUND,
                detail=f"Medical case {case_no} not found"
            )

        return JSONResponse(
            status_code=HTTPStatus.OK,
            content=case
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get case by case_no failed: {str(e)}")
        raise HTTPException(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            detail=f"Failed to get case: {str(e)}"
        )


@router.get("/medical_case/search")
async def search_medical_cases(
    query: str = Query(..., description="Search query"),
    limit: int = Query(10, description="Limit"),
    authorization: Optional[str] = Header(None)
):
    """
    Search medical cases by natural language query
    """
    try:
        user_id, tenant_id = get_current_user_id(authorization)
        if not user_id or not tenant_id:
            raise HTTPException(
                status_code=HTTPStatus.UNAUTHORIZED,
                detail="Unauthorized"
            )

        cases = await medical_case_service.search_cases(
            tenant_id=tenant_id,
            search_query=query,
            limit=limit
        )

        return JSONResponse(
            status_code=HTTPStatus.OK,
            content={"cases": cases, "total": len(cases)}
        )
    except Exception as e:
        logger.error(f"Search medical cases failed: {str(e)}")
        raise HTTPException(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            detail=f"Failed to search medical cases: {str(e)}"
        )


@router.put("/medical_case/{case_id}")
async def update_medical_case(
    case_id: int,
    request: CreateMedicalCaseRequest,
    authorization: Optional[str] = Header(None)
):
    """
    Update medical case information
    """
    try:
        user_id, tenant_id = get_current_user_id(authorization)
        if not user_id or not tenant_id:
            raise HTTPException(
                status_code=HTTPStatus.UNAUTHORIZED,
                detail="Unauthorized"
            )

        result = await medical_case_service.update_case(
            case_id,
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
        logger.error(f"Update medical case failed: {str(e)}")
        raise HTTPException(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            detail=f"Failed to update medical case: {str(e)}"
        )


@router.delete("/medical_case/{case_id}")
async def delete_medical_case(
    case_id: int,
    authorization: Optional[str] = Header(None)
):
    """
    Delete medical case (soft delete)
    """
    try:
        user_id, tenant_id = get_current_user_id(authorization)
        if not user_id or not tenant_id:
            raise HTTPException(
                status_code=HTTPStatus.UNAUTHORIZED,
                detail="Unauthorized"
            )

        result = await medical_case_service.delete_case(
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
        logger.error(f"Delete medical case failed: {str(e)}")
        raise HTTPException(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete medical case: {str(e)}"
        )


# ============================================================================
# Favorite Endpoints
# ============================================================================

@router.post("/medical_case/favorite/toggle")
async def toggle_favorite(
    request: ToggleFavoriteRequest,
    authorization: Optional[str] = Header(None)
):
    """
    Toggle case favorite (add or remove)
    """
    try:
        user_id, tenant_id = get_current_user_id(authorization)
        if not user_id or not tenant_id:
            raise HTTPException(
                status_code=HTTPStatus.UNAUTHORIZED,
                detail="Unauthorized"
            )

        result = await medical_case_service.toggle_favorite(
            request.case_id,
            user_id,
            tenant_id,
            request.action
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
        logger.error(f"Toggle favorite failed: {str(e)}")
        raise HTTPException(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            detail=f"Failed to toggle favorite: {str(e)}"
        )


@router.get("/medical_case/favorite/list")
async def list_favorites(
    limit: int = Query(100, description="Limit"),
    offset: int = Query(0, description="Offset"),
    authorization: Optional[str] = Header(None)
):
    """
    Get user's favorite cases
    """
    try:
        user_id, tenant_id = get_current_user_id(authorization)
        if not user_id or not tenant_id:
            raise HTTPException(
                status_code=HTTPStatus.UNAUTHORIZED,
                detail="Unauthorized"
            )

        favorites = await medical_case_service.get_user_favorites(
            user_id,
            tenant_id,
            limit,
            offset
        )

        return JSONResponse(
            status_code=HTTPStatus.OK,
            content={"cases": favorites, "total": len(favorites)}
        )
    except Exception as e:
        logger.error(f"List favorites failed: {str(e)}")
        raise HTTPException(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            detail=f"Failed to list favorites: {str(e)}"
        )


# ============================================================================
# View History Endpoints
# ============================================================================

@router.get("/medical_case/recent/list")
async def list_recent_cases(
    limit: int = Query(50, description="Limit"),
    authorization: Optional[str] = Header(None)
):
    """
    Get user's recently viewed cases
    """
    try:
        user_id, tenant_id = get_current_user_id(authorization)
        if not user_id or not tenant_id:
            raise HTTPException(
                status_code=HTTPStatus.UNAUTHORIZED,
                detail="Unauthorized"
            )

        recent_cases = await medical_case_service.get_recent_cases(
            user_id,
            tenant_id,
            limit
        )

        return JSONResponse(
            status_code=HTTPStatus.OK,
            content={"cases": recent_cases, "total": len(recent_cases)}
        )
    except Exception as e:
        logger.error(f"List recent cases failed: {str(e)}")
        raise HTTPException(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            detail=f"Failed to list recent cases: {str(e)}"
        )


# ============================================================================
# Case Detail Endpoints
# ============================================================================

@router.post("/medical_case/detail/create")
async def create_case_detail(
    request: CreateCaseDetailRequest,
    authorization: Optional[str] = Header(None)
):
    """
    Create or update case detail information
    """
    try:
        user_id, tenant_id = get_current_user_id(authorization)
        if not user_id or not tenant_id:
            raise HTTPException(
                status_code=HTTPStatus.UNAUTHORIZED,
                detail="Unauthorized"
            )

        result = await medical_case_service.create_or_update_case_detail(
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
        logger.error(f"Create case detail failed: {str(e)}")
        raise HTTPException(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            detail=f"Failed to create case detail: {str(e)}"
        )
