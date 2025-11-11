"""
Database operations for portal agent assignments
"""
from sqlalchemy import and_
from database.client import get_db_session, as_dict
from database.db_models import PortalAgentAssignment


def get_portal_agents(portal_type: str, tenant_id: str) -> list[int]:
    """
    Get list of agent IDs assigned to a specific portal
    
    Args:
        portal_type: Type of portal (doctor, student, patient)
        tenant_id: Tenant ID
        
    Returns:
        List of agent IDs
    """
    with get_db_session() as session:
        assignments = session.query(PortalAgentAssignment).filter(
            and_(
                PortalAgentAssignment.portal_type == portal_type,
                PortalAgentAssignment.tenant_id == tenant_id,
                PortalAgentAssignment.delete_flag != 'Y'
            )
        ).all()
        return [assignment.agent_id for assignment in assignments]


def assign_agent_to_portal(portal_type: str, agent_id: int, tenant_id: str, user_id: str) -> dict:
    """
    Assign an agent to a portal
    
    Args:
        portal_type: Type of portal (doctor, student, patient)
        agent_id: Agent ID to assign
        tenant_id: Tenant ID
        user_id: User ID performing the operation
        
    Returns:
        Assignment record as dictionary
    """
    with get_db_session() as session:
        # Check if assignment already exists
        existing = session.query(PortalAgentAssignment).filter(
            and_(
                PortalAgentAssignment.portal_type == portal_type,
                PortalAgentAssignment.agent_id == agent_id,
                PortalAgentAssignment.tenant_id == tenant_id,
                PortalAgentAssignment.delete_flag != 'Y'
            )
        ).first()
        
        if existing:
            # Already assigned, return existing record
            return as_dict(existing)
        
        # Create new assignment
        new_assignment = PortalAgentAssignment(
            portal_type=portal_type,
            agent_id=agent_id,
            tenant_id=tenant_id,
            created_by=user_id,
            updated_by=user_id,
            delete_flag='N'
        )
        session.add(new_assignment)
        session.flush()
        return as_dict(new_assignment)


def remove_agent_from_portal(portal_type: str, agent_id: int, tenant_id: str, user_id: str) -> None:
    """
    Remove an agent assignment from a portal (soft delete)
    
    Args:
        portal_type: Type of portal (doctor, student, patient)
        agent_id: Agent ID to remove
        tenant_id: Tenant ID
        user_id: User ID performing the operation
    """
    with get_db_session() as session:
        session.query(PortalAgentAssignment).filter(
            and_(
                PortalAgentAssignment.portal_type == portal_type,
                PortalAgentAssignment.agent_id == agent_id,
                PortalAgentAssignment.tenant_id == tenant_id
            )
        ).update({
            'delete_flag': 'Y',
            'updated_by': user_id
        })


def set_portal_agents(portal_type: str, agent_ids: list[int], tenant_id: str, user_id: str) -> list[dict]:
    """
    Set the complete list of agents for a portal (replaces existing assignments)
    
    Args:
        portal_type: Type of portal (doctor, student, patient)
        agent_ids: List of agent IDs to assign
        tenant_id: Tenant ID
        user_id: User ID performing the operation
        
    Returns:
        List of assignment records
    """
    with get_db_session() as session:
        # Soft delete all existing assignments for this portal
        session.query(PortalAgentAssignment).filter(
            and_(
                PortalAgentAssignment.portal_type == portal_type,
                PortalAgentAssignment.tenant_id == tenant_id
            )
        ).update({
            'delete_flag': 'Y',
            'updated_by': user_id
        })
        
        # Create new assignments
        assignments = []
        for agent_id in agent_ids:
            new_assignment = PortalAgentAssignment(
                portal_type=portal_type,
                agent_id=agent_id,
                tenant_id=tenant_id,
                created_by=user_id,
                updated_by=user_id,
                delete_flag='N'
            )
            session.add(new_assignment)
            session.flush()
            assignments.append(as_dict(new_assignment))
        
        return assignments

