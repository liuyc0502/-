import logging
from http import HTTPStatus
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Header
from starlette.responses import JSONResponse
from pydantic import BaseModel, Field
from services import chat_template_service
from utils.auth_utils import get_current_user_id
from consts.exceptions import AgentRunException

logger = logging.getLogger(__name__)
router = APIRouter()

# ============================================================================
# Request Models
# ============================================================================

class FieldDefinition(BaseModel):
    key: str = Field(..., description="Variable key matching {{key}} in template")
    label: str = Field(..., description="Display label for the form field")
    required: bool = Field(default=True)
    type: str = Field(..., description="Field type: text|select|date|textarea")
    options: Optional[List[str]] = Field(None, description="Options list for select fields")

class CreateTemplateRequest(BaseModel):
    template_name: str = Field(..., description="Display name")
    slash_command: str = Field(..., description="Slash command (without leading /)")
    prompt_template: str = Field(..., description="Prompt with {{variable}} placeholders")
    fields: List[FieldDefinition] = Field(default_factory=list)
    sort_order: int = Field(default=0)

class UpdateTemplateRequest(BaseModel):
    template_name: Optional[str] = None
    slash_command: Optional[str] = None
    prompt_template: Optional[str] = None
    fields: Optional[List[FieldDefinition]] = None
    sort_order: Optional[int] = None

# ============================================================================
# Endpoints
# ============================================================================

@router.get("/chat_template/list")
async def list_templates(authorization: Optional[str] = Header(None)):
    """List all templates for the current user"""
    try:
        user_id, tenant_id = get_current_user_id(authorization)
        if not user_id or not tenant_id:
            raise HTTPException(status_code=HTTPStatus.UNAUTHORIZED, detail="Unauthorized")
        result = await chat_template_service.list_templates_service(user_id, tenant_id)
        return JSONResponse(status_code=HTTPStatus.OK, content={"templates": result})
    except AgentRunException as e:
        raise HTTPException(status_code=HTTPStatus.INTERNAL_SERVER_ERROR, detail=str(e))


@router.post("/chat_template/create")
async def create_template(
    request: CreateTemplateRequest,
    authorization: Optional[str] = Header(None)
):
    """Create a new chat template"""
    try:
        user_id, tenant_id = get_current_user_id(authorization)
        if not user_id or not tenant_id:
            raise HTTPException(status_code=HTTPStatus.UNAUTHORIZED, detail="Unauthorized")
        data = request.dict()
        data['fields'] = [f.dict() for f in request.fields]
        result = await chat_template_service.create_template_service(data, user_id, tenant_id)
        return JSONResponse(status_code=HTTPStatus.OK, content=result)
    except ValueError as e:
        raise HTTPException(status_code=HTTPStatus.BAD_REQUEST, detail=str(e))
    except AgentRunException as e:
        raise HTTPException(status_code=HTTPStatus.INTERNAL_SERVER_ERROR, detail=str(e))


@router.put("/chat_template/update/{template_id}")
async def update_template(
    template_id: int,
    request: UpdateTemplateRequest,
    authorization: Optional[str] = Header(None)
):
    """Update an existing template"""
    try:
        user_id, tenant_id = get_current_user_id(authorization)
        if not user_id or not tenant_id:
            raise HTTPException(status_code=HTTPStatus.UNAUTHORIZED, detail="Unauthorized")
        data = request.dict(exclude_none=True)
        if 'fields' in data and request.fields is not None:
            data['fields'] = [f.dict() for f in request.fields]
        result = await chat_template_service.update_template_service(
            template_id, data, user_id, tenant_id
        )
        return JSONResponse(status_code=HTTPStatus.OK, content=result)
    except ValueError as e:
        raise HTTPException(status_code=HTTPStatus.BAD_REQUEST, detail=str(e))
    except AgentRunException as e:
        raise HTTPException(status_code=HTTPStatus.INTERNAL_SERVER_ERROR, detail=str(e))


@router.delete("/chat_template/delete/{template_id}")
async def delete_template(
    template_id: int,
    authorization: Optional[str] = Header(None)
):
    """Soft delete a template"""
    try:
        user_id, tenant_id = get_current_user_id(authorization)
        if not user_id or not tenant_id:
            raise HTTPException(status_code=HTTPStatus.UNAUTHORIZED, detail="Unauthorized")
        result = await chat_template_service.delete_template_service(
            template_id, user_id, tenant_id
        )
        return JSONResponse(status_code=HTTPStatus.OK, content=result)
    except ValueError as e:
        raise HTTPException(status_code=HTTPStatus.BAD_REQUEST, detail=str(e))
    except AgentRunException as e:
        raise HTTPException(status_code=HTTPStatus.INTERNAL_SERVER_ERROR, detail=str(e))
