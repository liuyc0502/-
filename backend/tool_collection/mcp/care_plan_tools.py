"""
Care Plan Tools - MCP Format
4 tools for rehabilitation and care planning
"""
import logging
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta

from fastmcp import FastMCP

from database.care_plan_db import (
    create_care_plan as db_create_care_plan,
    get_care_plans_by_patient,
    get_care_plan_detail,
    update_care_plan_progress,
    create_care_plan_medication,
    create_care_plan_task,
    create_care_plan_precaution
)
from database.patient_db import get_patient_by_id

logger = logging.getLogger(__name__)

care_plan_tools = FastMCP("care_plan")


@care_plan_tools.tool(
    name="create_care_plan",
    description="Create a rehabilitation care plan for a patient. Use when doctor wants to set up a post-treatment or post-surgery care plan including medications, tasks, and precautions."
)
async def create_care_plan(
    patient_id: int,
    tenant_id: str,
    user_id: str,
    plan_name: str,
    plan_description: str,
    start_date: str,
    duration_days: int = 14,
    medications: Optional[List[Dict]] = None,
    tasks: Optional[List[Dict]] = None,
    precautions: Optional[List[str]] = None
) -> Dict[str, Any]:
    """
    Create a care plan for patient rehabilitation.

    Args:
        patient_id: The unique patient identifier
        tenant_id: Tenant ID for data isolation
        user_id: Doctor user ID creating the plan
        plan_name: Name of the care plan
        plan_description: Description of the care plan
        start_date: Plan start date (YYYY-MM-DD)
        duration_days: Duration in days
        medications: List of medications with dosage and frequency
        tasks: List of rehabilitation tasks
        precautions: List of precautions and warnings

    Returns:
        Created care plan details
    """
    try:
        # Verify patient exists
        patient = get_patient_by_id(patient_id, tenant_id)
        if not patient:
            return {"error": "Patient not found", "patient_id": patient_id}

        # Calculate end date
        start = datetime.strptime(start_date, "%Y-%m-%d")
        end_date = (start + timedelta(days=duration_days)).strftime("%Y-%m-%d")

        # Create the care plan
        plan_data = {
            "patient_id": patient_id,
            "plan_name": plan_name,
            "plan_description": plan_description,
            "start_date": start_date,
            "end_date": end_date,
            "status": "active",
            "doctor_id": user_id
        }

        result = db_create_care_plan(plan_data, tenant_id, user_id)
        plan_id = result.get("plan_id")

        # Add medications
        if medications:
            for med in medications:
                create_care_plan_medication({
                    "plan_id": plan_id,
                    "medication_name": med.get("name"),
                    "dosage": med.get("dosage"),
                    "frequency": med.get("frequency"),
                    "time_slots": med.get("time_slots", []),
                    "notes": med.get("notes")
                }, tenant_id, user_id)

        # Add tasks
        if tasks:
            for task in tasks:
                create_care_plan_task({
                    "plan_id": plan_id,
                    "task_title": task.get("title"),
                    "task_description": task.get("description"),
                    "task_category": task.get("category"),
                    "frequency": task.get("frequency"),
                    "duration": task.get("duration")
                }, tenant_id, user_id)

        # Add precautions
        if precautions:
            for idx, precaution in enumerate(precautions):
                priority = "high" if idx == 0 else "medium"
                create_care_plan_precaution({
                    "plan_id": plan_id,
                    "precaution_content": precaution,
                    "priority": priority
                }, tenant_id, user_id)

        logger.info(f"Created care plan {plan_id} for patient {patient_id}")

        return {
            "success": True,
            "plan_id": plan_id,
            "patient_id": patient_id,
            "patient_name": patient.get("name"),
            "plan_name": plan_name,
            "duration": f"{start_date} to {end_date}",
            "medications_count": len(medications) if medications else 0,
            "tasks_count": len(tasks) if tasks else 0,
            "precautions_count": len(precautions) if precautions else 0
        }

    except Exception as e:
        logger.error(f"Error creating care plan: {str(e)}")
        return {"error": str(e)}


@care_plan_tools.tool(
    name="get_patient_care_plans",
    description="Get all care plans for a patient. Use when doctor asks about patient's current rehabilitation plans, ongoing treatments, or care schedules."
)
async def get_patient_care_plans(
    patient_id: int,
    tenant_id: str,
    status: Optional[str] = None
) -> Dict[str, Any]:
    """
    Get all care plans for a patient.

    Args:
        patient_id: The unique patient identifier
        tenant_id: Tenant ID for data isolation
        status: Filter by status (active/completed/paused)

    Returns:
        List of care plans with details
    """
    try:
        plans = get_care_plans_by_patient(patient_id, tenant_id, status)

        result = {
            "patient_id": patient_id,
            "total_plans": len(plans),
            "active_plans": len([p for p in plans if p.get("status") == "active"]),
            "care_plans": []
        }

        for plan in plans:
            plan_detail = get_care_plan_detail(plan.get("plan_id"), tenant_id)

            result["care_plans"].append({
                "plan_id": plan.get("plan_id"),
                "plan_name": plan.get("plan_name"),
                "plan_description": plan.get("plan_description"),
                "status": plan.get("status"),
                "start_date": plan.get("start_date"),
                "end_date": plan.get("end_date"),
                "doctor_id": plan.get("doctor_id"),
                "medications": plan_detail.get("medications", []) if plan_detail else [],
                "tasks": plan_detail.get("tasks", []) if plan_detail else [],
                "precautions": plan_detail.get("precautions", []) if plan_detail else []
            })

        logger.info(f"Retrieved {len(plans)} care plans for patient {patient_id}")
        return result

    except Exception as e:
        logger.error(f"Error getting patient care plans: {str(e)}")
        return {"error": str(e)}


@care_plan_tools.tool(
    name="update_care_plan_progress",
    description="Update care plan execution progress. Use when recording patient's medication intake, completed tasks, or daily progress updates."
)
async def update_care_plan_progress_tool(
    plan_id: int,
    tenant_id: str,
    user_id: str,
    record_date: str,
    completed_items: List[Dict]
) -> Dict[str, Any]:
    """
    Update care plan execution progress.

    Args:
        plan_id: Care plan ID
        tenant_id: Tenant ID for data isolation
        user_id: User ID recording the progress
        record_date: Date of the record (YYYY-MM-DD)
        completed_items: List of completed items with type and id

    Returns:
        Updated progress summary
    """
    try:
        updated_count = 0

        for item in completed_items:
            item_type = item.get("type")  # medication or task
            item_id = item.get("item_id")
            completed = item.get("completed", True)
            notes = item.get("notes")

            result = update_care_plan_progress(
                plan_id=plan_id,
                item_type=item_type,
                item_id=item_id,
                record_date=record_date,
                completed=completed,
                notes=notes,
                tenant_id=tenant_id,
                user_id=user_id
            )

            if result:
                updated_count += 1

        # Get updated plan detail
        plan_detail = get_care_plan_detail(plan_id, tenant_id)

        return {
            "success": True,
            "plan_id": plan_id,
            "record_date": record_date,
            "items_updated": updated_count,
            "total_items_submitted": len(completed_items),
            "plan_status": plan_detail.get("status") if plan_detail else "unknown"
        }

    except Exception as e:
        logger.error(f"Error updating care plan progress: {str(e)}")
        return {"error": str(e)}


@care_plan_tools.tool(
    name="generate_care_plan_suggestions",
    description="Generate AI-powered care plan suggestions based on patient's diagnosis and condition. Use when doctor needs help creating an appropriate rehabilitation plan."
)
async def generate_care_plan_suggestions(
    patient_id: int,
    tenant_id: str,
    diagnosis: str,
    treatment_stage: str = "post-treatment"
) -> Dict[str, Any]:
    """
    Generate care plan suggestions based on patient condition.

    Args:
        patient_id: The unique patient identifier
        tenant_id: Tenant ID for data isolation
        diagnosis: Patient's diagnosis
        treatment_stage: Treatment stage (pre-treatment/during-treatment/post-surgery/post-treatment/recovery)

    Returns:
        Suggested care plan components
    """
    try:
        # Get patient information
        patient = get_patient_by_id(patient_id, tenant_id)
        if not patient:
            return {"error": "Patient not found", "patient_id": patient_id}

        # Generate suggestions based on diagnosis and stage
        suggestions = {
            "patient_id": patient_id,
            "patient_name": patient.get("name"),
            "diagnosis": diagnosis,
            "treatment_stage": treatment_stage,
            "suggested_duration_days": 14 if treatment_stage == "post-surgery" else 30,
            "medication_suggestions": [],
            "task_suggestions": [],
            "precautions": [],
            "monitoring_items": []
        }

        # Stage-specific suggestions
        if treatment_stage == "post-surgery":
            suggestions["medication_suggestions"] = [
                {"name": "bÛo", "dosage": "	 ", "frequency": "Ï4-6ö", "notes": "9n¼Û¦t"},
                {"name": "— ", "dosage": "	;1", "frequency": "Ïå2!", "notes": "„2Ó"},
                {"name": "Ão", "dosage": "1G", "frequency": "Ïå1!", "notes": "İ¤ÃÏœ"}
            ]
            suggestions["task_suggestions"] = [
                {"title": "$ã¤", "category": "¤", "frequency": "Ïå1!", "description": "Àå$ãÅµİrå"},
                {"title": "Š;¨", "category": "Ğ¨", "frequency": "Ïå2-3!", "description": "/S;¨ÃÛb"},
                {"title": "ñ|8Ã`", "category": "Ğ¨", "frequency": "Ïå3!", "description": "„2ºèvÑÇ"}
            ]
            suggestions["precautions"] = [
                "MgÈĞ¨ŒÍS›³¨",
                "İ$ãrå‚	¢¿²Êö1;",
                "	öoÅê\o",
                "èoİÁE³a ",
                "‚ú°ÑígÈ¼ÛI8ÅµËsTû;"
            ]
            suggestions["monitoring_items"] = ["S)", "$ãÅµ", "¼Û¦", ";¨ı›"]

        elif treatment_stage == "post-treatment":
            suggestions["medication_suggestions"] = [
                {"name": "ô(o", "dosage": "	;1", "frequency": "Ïå1!", "notes": "Z("}
            ]
            suggestions["task_suggestions"] = [
                {"title": "·;¼", "category": "Ğ¨", "frequency": "Ïå1!", "description": "¦	'Ğ¨‚ce"},
                {"title": "nß°U", "category": "ÑK", "frequency": "Ï", "description": "°UnßÅµ"},
                {"title": "Ç¶°U", "category": "ÑK", "frequency": "Ïå1!", "description": "°UÇ¶"}
            ]
            suggestions["precautions"] = [
                "šå	ö¿",
                "İo}„;`ï",
                "è%{Ga",
                "İïPÂ„Ã"
            ]
            suggestions["monitoring_items"] = ["SÍ", "¾^¶", "ß2", "a (Ï"]

        elif treatment_stage == "recovery":
            suggestions["task_suggestions"] = [
                {"title": "Sı­Ã", "category": "Ğ¨", "frequency": "Ïh3!", "description": " Ğ¨:¦"},
                {"title": "Ã", "category": "¤", "frequency": " ö", "description": "İïÃ"}
            ]
            suggestions["precautions"] = [
                "ªÛ%B",
                "šå",
                "è«Sá÷öo"
            ]

        logger.info(f"Generated care plan suggestions for patient {patient_id}")
        return suggestions

    except Exception as e:
        logger.error(f"Error generating care plan suggestions: {str(e)}")
        return {"error": str(e)}
