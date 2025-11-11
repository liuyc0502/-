"""
Service layer for portal agent assignments
"""
import logging
from database.portal_agent_assignment_db import (
    get_portal_agents,
    assign_agent_to_portal,
    remove_agent_from_portal,
    set_portal_agents
)

logger = logging.getLogger(__name__)


async def get_portal_agents_impl(portal_type: str, tenant_id: str) -> list[int]:
    """
    Get agents assigned to a portal
    
    Args:
        portal_type: Portal type (doctor, student, patient)
        tenant_id: Tenant ID
        
    Returns:
        List of agent IDs
    """
    try:
        return get_portal_agents(portal_type, tenant_id)
    except Exception as e:
        logger.error(f"Failed to get portal agents: {str(e)}")
        raise ValueError(f"Failed to get portal agents: {str(e)}")


async def assign_agent_to_portal_impl(
    portal_type: str,
    agent_id: int,
    tenant_id: str,
    user_id: str
) -> dict:
    """
    Assign an agent to a portal
    
    Args:
        portal_type: Portal type (doctor, student, patient)
        agent_id: Agent ID
        tenant_id: Tenant ID
        user_id: User ID
        
    Returns:
        Assignment record
    """
    try:
        return assign_agent_to_portal(portal_type, agent_id, tenant_id, user_id)
    except Exception as e:
        logger.error(f"Failed to assign agent to portal: {str(e)}")
        raise ValueError(f"Failed to assign agent to portal: {str(e)}")


async def remove_agent_from_portal_impl(
    portal_type: str,
    agent_id: int,
    tenant_id: str,
    user_id: str
) -> None:
    """
    Remove an agent from a portal
    
    Args:
        portal_type: Portal type (doctor, student, patient)
        agent_id: Agent ID
        tenant_id: Tenant ID
        user_id: User ID
    """
    try:
        remove_agent_from_portal(portal_type, agent_id, tenant_id, user_id)
    except Exception as e:
        logger.error(f"Failed to remove agent from portal: {str(e)}")
        raise ValueError(f"Failed to remove agent from portal: {str(e)}")


async def set_portal_agents_impl(
    portal_type: str,
    agent_ids: list[int],
    tenant_id: str,
    user_id: str
) -> list[dict]:
    """
    Set complete list of agents for a portal
    
    Args:
        portal_type: Portal type (doctor, student, patient)
        agent_ids: List of agent IDs
        tenant_id: Tenant ID
        user_id: User ID
        
    Returns:
        List of assignment records
    """
    try:
        return set_portal_agents(portal_type, agent_ids, tenant_id, user_id)
    except Exception as e:
        logger.error(f"Failed to set portal agents: {str(e)}")
        raise ValueError(f"Failed to set portal agents: {str(e)}")

