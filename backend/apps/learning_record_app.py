"""
API endpoints for doctor learning records
"""

import logging
from http import HTTPStatus
from typing import Optional

from fastapi import APIRouter, HTTPException, Header
from starlette.responses import JSONResponse
from pydantic import BaseModel, Field

from services import learning_record_service
from utils.auth_utils import get_current_user_id
from consts.exceptions import AgentRunException

logger = logging.getLogger(__name__)
router = APIRouter()

# ============================================================================
# Request/Response Models
# ============================================================================

class RecordViewRequest(BaseModel):
    file_path: str = Field(..., description="Knowledge file path")
    file_name: str = Field(..., description="Knowledge file name")
    category: Optional[str] = Field(None, description="Knowledge category")
    time_spent_seconds: int = Field(120, description="Time spent in seconds")

# ============================================================================
# Learning Record Endpoints
# ============================================================================

@router.post("/learning_record/record_view")
async def record_view(
    request: RecordViewRequest,
    authorization: Optional[str] = Header(None)
):
    """
    Record a knowledge file view
    """
    try:
        user_id, tenant_id = get_current_user_id(authorization)
        if not user_id or not tenant_id:
            raise HTTPException(
                status_code=HTTPStatus.UNAUTHORIZED,
                detail="Unauthorized"
            )

        result = await learning_record_service.record_view_service(
            user_id=user_id,
            tenant_id=tenant_id,
            file_path=request.file_path,
            file_name=request.file_name,
            category=request.category,
            time_spent_seconds=request.time_spent_seconds
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
        logger.error(f"Record view failed: {str(e)}")
        raise HTTPException(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            detail=f"Failed to record view: {str(e)}"
        )


@router.get("/learning_record/list")
async def get_learning_records(
    limit: int = 100,
    authorization: Optional[str] = Header(None)
):
    """
    Get all learning records for the current user
    """
    try:
        user_id, tenant_id = get_current_user_id(authorization)
        if not user_id or not tenant_id:
            raise HTTPException(
                status_code=HTTPStatus.UNAUTHORIZED,
                detail="Unauthorized"
            )

        records = await learning_record_service.get_user_records_service(
            user_id=user_id,
            tenant_id=tenant_id,
            limit=limit
        )

        return JSONResponse(
            status_code=HTTPStatus.OK,
            content={"records": records}
        )

    except Exception as e:
        logger.error(f"Get learning records failed: {str(e)}")
        raise HTTPException(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            detail=f"Failed to get learning records: {str(e)}"
        )


@router.get("/learning_record/stats")
async def get_learning_stats(
    authorization: Optional[str] = Header(None)
):
    """
    Get learning statistics for the current user
    """
    try:
        user_id, tenant_id = get_current_user_id(authorization)
        if not user_id or not tenant_id:
            raise HTTPException(
                status_code=HTTPStatus.UNAUTHORIZED,
                detail="Unauthorized"
            )

        stats = await learning_record_service.get_stats_service(
            user_id=user_id,
            tenant_id=tenant_id
        )

        return JSONResponse(
            status_code=HTTPStatus.OK,
            content=stats
        )

    except Exception as e:
        logger.error(f"Get learning stats failed: {str(e)}")
        raise HTTPException(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            detail=f"Failed to get learning stats: {str(e)}"
        )


@router.delete("/learning_record/{record_id}")
async def delete_learning_record(
    record_id: int,
    authorization: Optional[str] = Header(None)
):
    """
    Delete a learning record
    """
    try:
        user_id, tenant_id = get_current_user_id(authorization)
        if not user_id or not tenant_id:
            raise HTTPException(
                status_code=HTTPStatus.UNAUTHORIZED,
                detail="Unauthorized"
            )

        result = await learning_record_service.delete_record_service(
            record_id=record_id,
            user_id=user_id,
            tenant_id=tenant_id
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
        logger.error(f"Delete learning record failed: {str(e)}")
        raise HTTPException(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete learning record: {str(e)}"
        )


@router.delete("/learning_record/clear_all")
async def clear_all_learning_records(
    authorization: Optional[str] = Header(None)
):
    """
    Clear all learning records for the current user
    """
    try:
        user_id, tenant_id = get_current_user_id(authorization)
        if not user_id or not tenant_id:
            raise HTTPException(
                status_code=HTTPStatus.UNAUTHORIZED,
                detail="Unauthorized"
            )

        result = await learning_record_service.clear_all_records_service(
            user_id=user_id,
            tenant_id=tenant_id
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
        logger.error(f"Clear learning records failed: {str(e)}")
        raise HTTPException(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            detail=f"Failed to clear learning records: {str(e)}"
        )
