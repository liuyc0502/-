"""
API endpoints for portal agent assignments
"""
import logging
from http import HTTPStatus
from typing import Optional, List

from fastapi import APIRouter, Header, HTTPException, Body
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from services.portal_agent_assignment_service import (
    get_portal_agents_impl,
    assign_agent_to_portal_impl,
    remove_agent_from_portal_impl,
    set_portal_agents_impl
)
from utils.auth_utils import get_current_user_info

router = APIRouter(prefix="/portal_agent_assignment")
logger = logging.getLogger("portal_agent_assignment_app")


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


@router.get("/get_agents/{portal_type}")
async def get_portal_agents_api(
    portal_type: str,
    authorization: Optional[str] = Header(None)
):
    """
    Get list of agent IDs assigned to a portal
    
    Args:
        portal_type: Portal type (doctor, student, patient)
        authorization: Authorization header
        
    Returns:
        List of agent IDs
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

