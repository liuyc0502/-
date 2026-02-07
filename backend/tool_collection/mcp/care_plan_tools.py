"""
Care Plan Tools - Atomic MCP Tools
Care plan, medication, and task management tools.
"""
import logging
from typing import Optional, Dict, Any, List
from fastmcp import FastMCP
from consts.const import DEFAULT_TENANT_ID
from database.care_plan_db import (
    list_care_plans_by_patient,
    get_care_plan_with_details,
    record_completion
)

logger = logging.getLogger(__name__)
care_plan_tools = FastMCP("care_plans")


@care_plan_tools.tool()
async def list_patient_care_plans(
    patient_id: str,
    status: Optional[str] = None,
    tenant_id: Optional[str] = None
) -> Dict[str, Any]:
    """List care plans for a patient. Filter by status: active/completed/all."""
    try:
        tenant = tenant_id or DEFAULT_TENANT_ID
        plans = list_care_plans_by_patient(patient_id, tenant, status=status)

        plan_list = []
        for plan in plans:
            plan_list.append({
                "plan_id": plan.get("plan_id"),
                "plan_name": plan.get("plan_name"),
                "plan_description": plan.get("plan_description"),
                "start_date": plan.get("start_date"),
                "end_date": plan.get("end_date"),
                "status": plan.get("status"),
                "created_by": plan.get("created_by")
            })

        logger.info(f"Retrieved {len(plan_list)} care plans for patient {patient_id}")

        return {
            "patient_id": patient_id,
            "total_plans": len(plan_list),
            "plans": plan_list,
            "status_filter": status or "all"
        }

    except Exception as e:
        logger.error(f"Error listing care plans: {str(e)}")
        return {"error": str(e)}


@care_plan_tools.tool()
async def get_care_plan_medications(
    plan_id: str,
    tenant_id: Optional[str] = None
) -> Dict[str, Any]:
    """Get medication list from a care plan with dosage and timing."""
    try:
        tenant = tenant_id or DEFAULT_TENANT_ID
        plan = get_care_plan_with_details(plan_id, tenant)

        if not plan:
            return {"error": "Care plan not found", "plan_id": plan_id}

        medications = plan.get("medications", [])

        med_list = []
        for med in medications:
            med_list.append({
                "medication_id": med.get("medication_id"),
                "medication_name": med.get("medication_name"),
                "dosage": med.get("dosage"),
                "frequency": med.get("frequency"),
                "time_slots": med.get("time_slots", []),
                "notes": med.get("notes")
            })

        logger.info(f"Retrieved {len(med_list)} medications for plan {plan_id}")

        return {
            "plan_id": plan_id,
            "plan_name": plan.get("plan_name"),
            "total_medications": len(med_list),
            "medications": med_list
        }

    except Exception as e:
        logger.error(f"Error getting care plan medications: {str(e)}")
        return {"error": str(e)}


@care_plan_tools.tool()
async def get_care_plan_tasks(
    plan_id: str,
    tenant_id: Optional[str] = None
) -> Dict[str, Any]:
    """Get rehabilitation/care tasks from a care plan."""
    try:
        tenant = tenant_id or DEFAULT_TENANT_ID
        plan = get_care_plan_with_details(plan_id, tenant)

        if not plan:
            return {"error": "Care plan not found", "plan_id": plan_id}

        tasks = plan.get("tasks", [])

        task_list = []
        for task in tasks:
            task_list.append({
                "task_id": task.get("task_id"),
                "task_title": task.get("task_title"),
                "task_description": task.get("task_description"),
                "task_category": task.get("task_category"),
                "frequency": task.get("frequency"),
                "duration": task.get("duration")
            })

        logger.info(f"Retrieved {len(task_list)} tasks for plan {plan_id}")

        return {
            "plan_id": plan_id,
            "plan_name": plan.get("plan_name"),
            "total_tasks": len(task_list),
            "tasks": task_list
        }

    except Exception as e:
        logger.error(f"Error getting care plan tasks: {str(e)}")
        return {"error": str(e)}


@care_plan_tools.tool()
async def get_care_plan_precautions(
    plan_id: str,
    tenant_id: Optional[str] = None
) -> Dict[str, Any]:
    """Get precautions and warnings from a care plan."""
    try:
        tenant = tenant_id or DEFAULT_TENANT_ID
        plan = get_care_plan_with_details(plan_id, tenant)

        if not plan:
            return {"error": "Care plan not found", "plan_id": plan_id}

        precautions = plan.get("precautions", [])

        precaution_list = []
        for precaution in precautions:
            precaution_list.append({
                "precaution_id": precaution.get("precaution_id"),
                "precaution_content": precaution.get("precaution_content"),
                "priority": precaution.get("priority")
            })

        logger.info(f"Retrieved {len(precaution_list)} precautions for plan {plan_id}")

        return {
            "plan_id": plan_id,
            "plan_name": plan.get("plan_name"),
            "total_precautions": len(precaution_list),
            "precautions": precaution_list
        }

    except Exception as e:
        logger.error(f"Error getting care plan precautions: {str(e)}")
        return {"error": str(e)}


@care_plan_tools.tool()
async def record_medication_taken(
    plan_id: str,
    patient_id: str,
    medication_id: str,
    record_date: str,
    notes: Optional[str] = None,
    tenant_id: Optional[str] = None
) -> Dict[str, Any]:
    """Record that patient took their medication."""
    try:
        tenant = tenant_id or DEFAULT_TENANT_ID

        completion_data = {
            "plan_id": plan_id,
            "patient_id": patient_id,
            "record_date": record_date,
            "item_type": "medication",
            "item_id": medication_id,
            "completed": True,
            "notes": notes
        }

        record_completion(completion_data, tenant, str(patient_id))

        logger.info(f"Recorded medication {medication_id} taken on {record_date} for patient {patient_id}")

        return {
            "success": True,
            "plan_id": plan_id,
            "medication_id": medication_id,
            "record_date": record_date,
            "message": "Medication compliance recorded successfully"
        }

    except Exception as e:
        logger.error(f"Error recording medication taken: {str(e)}")
        return {"success": False, "error": str(e)}


@care_plan_tools.tool()
async def record_task_completed(
    plan_id: str,
    patient_id: str,
    task_id: str,
    record_date: str,
    notes: Optional[str] = None,
    tenant_id: Optional[str] = None
) -> Dict[str, Any]:
    """Record that patient completed a care plan task."""
    try:
        tenant = tenant_id or DEFAULT_TENANT_ID

        completion_data = {
            "plan_id": plan_id,
            "patient_id": patient_id,
            "record_date": record_date,
            "item_type": "task",
            "item_id": task_id,
            "completed": True,
            "notes": notes
        }

        record_completion(completion_data, tenant, str(patient_id))

        logger.info(f"Recorded task {task_id} completed on {record_date} for patient {patient_id}")

        return {
            "success": True,
            "plan_id": plan_id,
            "task_id": task_id,
            "record_date": record_date,
            "message": "Task completion recorded successfully"
        }

    except Exception as e:
        logger.error(f"Error recording task completed: {str(e)}")
        return {"success": False, "error": str(e)}
