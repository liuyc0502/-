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
    """
    List care plans for a patient.

    Use this tool when:
    - Patient asks "What's my care plan?"
    - Need to find active treatment plans
    - Want to see plan overview before getting details

    Args:
        patient_id: Patient identifier
        status: Filter by status (active/completed/all), optional (default: all)
        tenant_id: Tenant identifier (optional)

    Returns:
        - patient_id: Patient identifier
        - total_plans: Number of plans found
        - plans: List of care plans, each containing:
          - plan_id: Use this to get plan details
          - plan_name: Plan name/title
          - plan_description: Brief description
          - start_date: Plan start date
          - end_date: Plan end date
          - status: Plan status (active/completed)
          - created_by: Who created the plan

    Next steps:
    - Call get_care_plan_medications(plan_id) for medication list
    - Call get_care_plan_tasks(plan_id) for task list
    - Call get_care_plan_precautions(plan_id) for precautions

    Example:
        # Get active care plans
        plans = list_patient_care_plans(patient_id, status="active")

        # Get medications from first plan
        if plans['plans']:
            meds = get_care_plan_medications(plans['plans'][0]['plan_id'])
    """
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
    """
    Get medication list from a care plan.

    Use this tool when:
    - Patient asks "What medications am I on?"
    - Need dosage and timing information
    - Patient asks "When should I take my medicine?"

    Args:
        plan_id: Care plan identifier (from list_patient_care_plans)
        tenant_id: Tenant identifier (optional)

    Returns:
        - plan_id: Care plan identifier
        - total_medications: Number of medications
        - medications: List of medications, each containing:
          - medication_id: Medication identifier
          - medication_name: Drug name
          - dosage: Dosage amount
          - frequency: How often to take (e.g., "每日3次")
          - time_slots: Specific times to take (e.g., ["08:00", "12:00", "18:00"])
          - notes: Special instructions

    Example:
        meds = get_care_plan_medications(plan_id)
        for med in meds['medications']:
            print(f"{med['medication_name']}: {med['dosage']}, {med['frequency']}")
    """
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
    """
    Get rehabilitation/care tasks from a care plan.

    Use this tool when:
    - Patient asks "What exercises should I do?"
    - Need care task instructions
    - Patient asks "What should I do daily?"

    Args:
        plan_id: Care plan identifier
        tenant_id: Tenant identifier (optional)

    Returns:
        - plan_id: Care plan identifier
        - total_tasks: Number of tasks
        - tasks: List of tasks, each containing:
          - task_id: Task identifier
          - task_title: Task name
          - task_description: Detailed instructions
          - task_category: Category (rehabilitation/monitoring/lifestyle/etc)
          - frequency: How often to do (e.g., "每日2次")
          - duration: How long to do

    Example:
        tasks = get_care_plan_tasks(plan_id)
        for task in tasks['tasks']:
            print(f"{task['task_title']}: {task['task_description']}")
    """
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
    """
    Get precautions and warnings from a care plan.

    Use this tool when:
    - Patient asks "What should I avoid?"
    - Need safety precautions
    - Patient asks "What should I watch out for?"

    Args:
        plan_id: Care plan identifier
        tenant_id: Tenant identifier (optional)

    Returns:
        - plan_id: Care plan identifier
        - total_precautions: Number of precautions
        - precautions: List of precautions, each containing:
          - precaution_id: Precaution identifier
          - precaution_content: Warning/precaution text
          - priority: Priority level (high/medium/low)

    Example:
        precautions = get_care_plan_precautions(plan_id)
        high_priority = [p for p in precautions['precautions'] if p['priority'] == 'high']
    """
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
    """
    Record that patient took their medication.

    Use this tool when:
    - Patient says "I took my medicine"
    - Recording medication compliance
    - Patient wants to log daily medication

    Args:
        plan_id: Care plan identifier
        patient_id: Patient identifier
        medication_id: Medication identifier (from get_care_plan_medications)
        record_date: Date medication was taken (YYYY-MM-DD)
        notes: Optional notes about the medication, optional
        tenant_id: Tenant identifier (optional)

    Returns:
        - success: Whether recording was successful
        - plan_id: Care plan identifier
        - medication_id: Medication identifier
        - record_date: Date recorded
        - message: Success/error message

    Example:
        result = record_medication_taken(
            plan_id=plan_id,
            patient_id=patient_id,
            medication_id=med_id,
            record_date="2025-01-15",
            notes="Took with breakfast"
        )
    """
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
        return {
            "success": False,
            "error": str(e)
        }


@care_plan_tools.tool()
async def record_task_completed(
    plan_id: str,
    patient_id: str,
    task_id: str,
    record_date: str,
    notes: Optional[str] = None,
    tenant_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Record that patient completed a care plan task.

    Use this tool when:
    - Patient says "I did my exercises"
    - Recording task completion
    - Patient wants to log daily activities

    Args:
        plan_id: Care plan identifier
        patient_id: Patient identifier
        task_id: Task identifier (from get_care_plan_tasks)
        record_date: Date task was completed (YYYY-MM-DD)
        notes: Optional notes about the task, optional
        tenant_id: Tenant identifier (optional)

    Returns:
        - success: Whether recording was successful
        - plan_id: Care plan identifier
        - task_id: Task identifier
        - record_date: Date recorded
        - message: Success/error message

    Example:
        result = record_task_completed(
            plan_id=plan_id,
            patient_id=patient_id,
            task_id=task_id,
            record_date="2025-01-15",
            notes="Completed 20 minute walk"
        )
    """
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
        return {
            "success": False,
            "error": str(e)
        }
