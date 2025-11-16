"""
Database operations for portal agent assignments
Now uses AgentRelation for managing sub-agents of portal main agents
"""
from sqlalchemy import and_
from database.client import get_db_session, as_dict
from database.db_models import PortalAgentAssignment, AgentRelation
from database.agent_db import get_portal_main_agent, query_sub_agents_id_list


def get_portal_agents(portal_type: str, tenant_id: str) -> list[int]:
    """
    Get list of sub-agent IDs assigned to a portal's main agent

    Args:
        portal_type: Type of portal (doctor, student, patient)
        tenant_id: Tenant ID

    Returns:
        List of sub-agent IDs
    """
    # First get the main agent for this portal
    main_agent = get_portal_main_agent(portal_type, tenant_id)
    if not main_agent:
        return []

    # Then get its sub-agents
    return query_sub_agents_id_list(main_agent['agent_id'], tenant_id)


def assign_agent_to_portal(portal_type: str, agent_id: int, tenant_id: str, user_id: str) -> dict:
    """
    Assign a sub-agent to a portal's main agent

    Args:
        portal_type: Type of portal (doctor, student, patient)
        agent_id: Sub-agent ID to assign
        tenant_id: Tenant ID
        user_id: User ID performing the operation

    Returns:
        Success status
    """
    # Get the main agent for this portal
    main_agent = get_portal_main_agent(portal_type, tenant_id)
    if not main_agent:
        raise ValueError(f"No main agent found for portal type: {portal_type}")

    # Check if already assigned
    sub_agents = query_sub_agents_id_list(main_agent['agent_id'], tenant_id)
    if agent_id in sub_agents:
        return {"status": "already_assigned", "main_agent_id": main_agent['agent_id'], "sub_agent_id": agent_id}

    # Add to AgentRelation
    with get_db_session() as session:
        new_relation = AgentRelation(
            parent_agent_id=main_agent['agent_id'],
            selected_agent_id=agent_id,
            tenant_id=tenant_id,
            created_by=user_id,
            updated_by=user_id,
            delete_flag='N'
        )
        session.add(new_relation)
        session.flush()
        return {"status": "success", "main_agent_id": main_agent['agent_id'], "sub_agent_id": agent_id}


def remove_agent_from_portal(portal_type: str, agent_id: int, tenant_id: str, user_id: str) -> None:
    """
    Remove a sub-agent assignment from a portal's main agent (soft delete)

    Args:
        portal_type: Type of portal (doctor, student, patient)
        agent_id: Sub-agent ID to remove
        tenant_id: Tenant ID
        user_id: User ID performing the operation
    """
    # Get the main agent for this portal
    main_agent = get_portal_main_agent(portal_type, tenant_id)
    if not main_agent:
        raise ValueError(f"No main agent found for portal type: {portal_type}")

    # Remove from AgentRelation
    with get_db_session() as session:
        session.query(AgentRelation).filter(
            and_(
                AgentRelation.parent_agent_id == main_agent['agent_id'],
                AgentRelation.selected_agent_id == agent_id,
                AgentRelation.tenant_id == tenant_id
            )
        ).update({
            'delete_flag': 'Y',
            'updated_by': user_id
        })


def set_portal_agents(portal_type: str, agent_ids: list[int], tenant_id: str, user_id: str) -> list[dict]:
    """
    Set the complete list of sub-agents for a portal's main agent (replaces existing assignments)

    Args:
        portal_type: Type of portal (doctor, student, patient)
        agent_ids: List of sub-agent IDs to assign
        tenant_id: Tenant ID
        user_id: User ID performing the operation

    Returns:
        List of assignment results
    """
    # Get the main agent for this portal
    main_agent = get_portal_main_agent(portal_type, tenant_id)
    if not main_agent:
        raise ValueError(f"No main agent found for portal type: {portal_type}")

    with get_db_session() as session:
        # Soft delete all existing sub-agent relations for this main agent
        session.query(AgentRelation).filter(
            and_(
                AgentRelation.parent_agent_id == main_agent['agent_id'],
                AgentRelation.tenant_id == tenant_id
            )
        ).update({
            'delete_flag': 'Y',
            'updated_by': user_id
        })

        # Create new relations
        assignments = []
        for agent_id in agent_ids:
            new_relation = AgentRelation(
                parent_agent_id=main_agent['agent_id'],
                selected_agent_id=agent_id,
                tenant_id=tenant_id,
                created_by=user_id,
                updated_by=user_id,
                delete_flag='N'
            )
            session.add(new_relation)
            session.flush()
            assignments.append({
                "main_agent_id": main_agent['agent_id'],
                "sub_agent_id": agent_id
            })

        return assignments

