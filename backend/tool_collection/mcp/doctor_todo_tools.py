"""
Doctor TODO Tools - Atomic MCP Tools
Patient TODO/task management for doctors.
"""
import logging
from typing import Optional, Dict, Any
from fastmcp import FastMCP
from consts.const import DEFAULT_TENANT_ID
from database.patient_db import (
    create_patient_todo as db_create_patient_todo,
    update_todo_status as db_update_todo_status,
    delete_patient_todo as db_delete_patient_todo
)

logger = logging.getLogger(__name__)
doctor_todo_tools = FastMCP("doctor_todos")


@doctor_todo_tools.tool()
async def create_patient_todo(
    patient_id: str,
    todo_title: str,
    todo_description: str,
    todo_type: str,
    due_date: Optional[str] = None,
    priority: str = "medium",
    status: str = "pending",
    assigned_doctor: Optional[str] = None,
    tenant_id: Optional[str] = None,
    user_id: Optional[str] = None
) -> Dict[str, Any]:
    """Create a TODO/task for a patient. Types: follow_up, lab_test, medication_review, consultation."""
    try:
        tenant = tenant_id or DEFAULT_TENANT_ID
        creator = user_id or "system"

        todo_data = {
            "patient_id": int(patient_id),
            "todo_title": todo_title,
            "todo_description": todo_description,
            "todo_type": todo_type,
            "due_date": due_date,
            "priority": priority,
            "status": status,
            "assigned_doctor": assigned_doctor or creator
        }

        result = db_create_patient_todo(todo_data, tenant, creator)

        logger.info(f"Created TODO {result['todo_id']} for patient {patient_id}")

        return {
            "success": True,
            "todo_id": result["todo_id"],
            "patient_id": patient_id,
            "message": f"Successfully created TODO: {todo_title}"
        }

    except Exception as e:
        logger.error(f"Error creating patient TODO: {str(e)}")
        return {"success": False, "error": str(e)}


@doctor_todo_tools.tool()
async def update_patient_todo_status(
    todo_id: str,
    status: str,
    tenant_id: Optional[str] = None,
    user_id: Optional[str] = None
) -> Dict[str, Any]:
    """Update TODO status. Status: pending, in_progress, completed, cancelled."""
    try:
        tenant = tenant_id or DEFAULT_TENANT_ID
        updater = user_id or "system"

        success = db_update_todo_status(int(todo_id), status, tenant, updater)

        if success:
            logger.info(f"Updated TODO {todo_id} status to {status}")
            return {"success": True, "todo_id": todo_id, "new_status": status, "message": f"TODO status updated to {status}"}
        else:
            return {"success": False, "error": "TODO not found or update failed"}

    except Exception as e:
        logger.error(f"Error updating TODO status: {str(e)}")
        return {"success": False, "error": str(e)}


@doctor_todo_tools.tool()
async def delete_patient_todo(
    todo_id: str,
    tenant_id: Optional[str] = None,
    user_id: Optional[str] = None
) -> Dict[str, Any]:
    """Delete a patient TODO (hard delete). Use with caution."""
    try:
        tenant = tenant_id or DEFAULT_TENANT_ID
        deleter = user_id or "system"

        success = db_delete_patient_todo(int(todo_id), tenant, deleter)

        if success:
            logger.info(f"Deleted TODO {todo_id}")
            return {"success": True, "todo_id": todo_id, "message": "TODO deleted successfully"}
        else:
            return {"success": False, "error": "TODO not found or deletion failed"}

    except Exception as e:
        logger.error(f"Error deleting TODO: {str(e)}")
        return {"success": False, "error": str(e)}
