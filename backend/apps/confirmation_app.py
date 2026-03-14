import logging
from http import HTTPStatus
from typing import Any, Dict, Optional

from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel, Field
from starlette.responses import JSONResponse

from services.confirmation_service import confirmation_manager
from utils.auth_utils import get_current_user_id

logger = logging.getLogger(__name__)
router = APIRouter()


class ConfirmToolRequest(BaseModel):
    action: str = Field(..., description="Action: confirm or regenerate")
    parameters: Optional[Dict[str, Any]] = Field(None, description="Modified parameters (for confirm with edits)")
    instructions: Optional[str] = Field(None, description="Regeneration instructions from doctor")


@router.post("/agent/confirm/{confirmation_id}")
async def confirm_tool_execution(
    confirmation_id: str,
    request: ConfirmToolRequest,
    authorization: Optional[str] = Header(None)
):
    """Resolve a pending tool confirmation from the doctor."""
    try:
        user_id, tenant_id = get_current_user_id(authorization)
        if not user_id or not tenant_id:
            raise HTTPException(
                status_code=HTTPStatus.UNAUTHORIZED,
                detail="Unauthorized"
            )

        if request.action not in ("confirm", "regenerate"):
            raise HTTPException(
                status_code=HTTPStatus.BAD_REQUEST,
                detail="action must be 'confirm' or 'regenerate'"
            )

        success = confirmation_manager.resolve_confirmation(
            confirmation_id=confirmation_id,
            action=request.action,
            parameters=request.parameters,
            instructions=request.instructions
        )

        if not success:
            raise HTTPException(
                status_code=HTTPStatus.NOT_FOUND,
                detail="Confirmation not found or expired"
            )

        return JSONResponse(
            status_code=HTTPStatus.OK,
            content={"success": True, "message": f"Confirmation {request.action}ed"}
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error confirming tool: {str(e)}")
        raise HTTPException(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/agent/confirmations")
async def list_pending_confirmations(
    authorization: Optional[str] = Header(None)
):
    """List all pending confirmations (for reconnection scenarios)."""
    try:
        user_id, tenant_id = get_current_user_id(authorization)
        if not user_id or not tenant_id:
            raise HTTPException(
                status_code=HTTPStatus.UNAUTHORIZED,
                detail="Unauthorized"
            )

        pending = confirmation_manager.get_pending()
        return JSONResponse(
            status_code=HTTPStatus.OK,
            content={"confirmations": pending}
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listing confirmations: {str(e)}")
        raise HTTPException(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
