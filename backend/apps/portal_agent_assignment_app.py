"""
API endpoints for portal agent assignments
"""
import logging
from datetime import datetime
from http import HTTPStatus
from typing import Optional, List, Any

from fastapi import APIRouter, Header, HTTPException, Body
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from services.portal_agent_assignment_service import (
    get_portal_agents_impl,
    get_portal_main_agent_impl,
    assign_agent_to_portal_impl,
    remove_agent_from_portal_impl,
    set_portal_agents_impl
)
from utils.auth_utils import get_current_user_info

router = APIRouter(prefix="/portal_agent_assignment")
logger = logging.getLogger("portal_agent_assignment_app")


def serialize_agent_data(data: Any) -> Any:
    """Convert datetime objects to ISO format strings for JSON serialization"""
    if data is None:
        return None
    if isinstance(data, dict):
        return {k: serialize_agent_data(v) for k, v in data.items()}
    if isinstance(data, list):
        return [serialize_agent_data(item) for item in data]
    if isinstance(data, datetime):
        return data.isoformat()
    return data


class AssignAgentRequest(BaseModel):
    """Request to assign an agent to a portal"""
    portal_type: str
    agent_id: int


class RemoveAgentRequest(BaseModel):
    """Request to remove an agent from a portal"""
    portal_type: str
    agent_id: int


class SetPortalAgentsRequest(BaseModel):
    """Request to set complete list of agents for a portal"""
    portal_type: str
    agent_ids: List[int]


@router.get("/get_main_agent/{portal_type}")
async def get_portal_main_agent_api(
    portal_type: str,
    authorization: Optional[str] = Header(None)
):
    """
    Get the main agent for a portal

    Args:
        portal_type: Portal type (doctor, student, patient)
        authorization: Authorization header

    Returns:
        Main agent info or null if not configured
    """
    try:
        _, tenant_id, _ = get_current_user_info(authorization)
        main_agent = await get_portal_main_agent_impl(portal_type, tenant_id)
        serialized_agent = serialize_agent_data(main_agent)
        return JSONResponse(
            status_code=HTTPStatus.OK,
            content={"main_agent": serialized_agent, "status": "success"}
        )
    except Exception as e:
        logger.error(f"Get portal main agent error: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            detail="Failed to get portal main agent"
        )


@router.get("/get_agents/{portal_type}")
async def get_portal_agents_api(
    portal_type: str,
    authorization: Optional[str] = Header(None)
):
    """
    Get list of sub-agent IDs assigned to a portal's main agent

    Args:
        portal_type: Portal type (doctor, student, patient)
        authorization: Authorization header

    Returns:
        List of sub-agent IDs
    """
    try:
        _, tenant_id, _ = get_current_user_info(authorization)
        agent_ids = await get_portal_agents_impl(portal_type, tenant_id)
        return JSONResponse(
            status_code=HTTPStatus.OK,
            content={"agent_ids": agent_ids, "status": "success"}
        )
    except Exception as e:
        logger.error(f"Get portal agents error: {str(e)}")
        raise HTTPException(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            detail="Failed to get portal agents"
        )


@router.post("/assign")
async def assign_agent_api(
    request: AssignAgentRequest,
    authorization: Optional[str] = Header(None)
):
    """
    Assign an agent to a portal
    
    Args:
        request: Assignment request
        authorization: Authorization header
        
    Returns:
        Success status
    """
    try:
        user_id, tenant_id, _ = get_current_user_info(authorization)
        await assign_agent_to_portal_impl(
            request.portal_type,
            request.agent_id,
            tenant_id,
            user_id
        )
        return JSONResponse(
            status_code=HTTPStatus.OK,
            content={"message": "Agent assigned successfully", "status": "success"}
        )
    except Exception as e:
        logger.error(f"Assign agent error: {str(e)}")
        raise HTTPException(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            detail="Failed to assign agent"
        )


@router.post("/remove")
async def remove_agent_api(
    request: RemoveAgentRequest,
    authorization: Optional[str] = Header(None)
):
    """
    Remove an agent from a portal
    
    Args:
        request: Removal request
        authorization: Authorization header
        
    Returns:
        Success status
    """
    try:
        user_id, tenant_id, _ = get_current_user_info(authorization)
        await remove_agent_from_portal_impl(
            request.portal_type,
            request.agent_id,
            tenant_id,
            user_id
        )
        return JSONResponse(
            status_code=HTTPStatus.OK,
            content={"message": "Agent removed successfully", "status": "success"}
        )
    except Exception as e:
        logger.error(f"Remove agent error: {str(e)}")
        raise HTTPException(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            detail="Failed to remove agent"
        )


@router.post("/set_agents")
async def set_portal_agents_api(
    request: SetPortalAgentsRequest,
    authorization: Optional[str] = Header(None)
):
    """
    Set complete list of agents for a portal (replaces existing)
    
    Args:
        request: Set agents request
        authorization: Authorization header
        
    Returns:
        Success status
    """
    try:
        user_id, tenant_id, _ = get_current_user_info(authorization)
        await set_portal_agents_impl(
            request.portal_type,
            request.agent_ids,
            tenant_id,
            user_id
        )
        return JSONResponse(
            status_code=HTTPStatus.OK,
            content={"message": "Portal agents updated successfully", "status": "success"}
        )
    except Exception as e:
        logger.error(f"Set portal agents error: {str(e)}")
        raise HTTPException(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            detail="Failed to set portal agents"
        )

