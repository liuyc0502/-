"""
Care Plan Tools - MCP Format
14 tools for rehabilitation and care planning
All tools accept medical_record_no (病历号) as input and automatically convert to patient_id
"""
import logging
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
 
from fastmcp import FastMCP
 
from database.care_plan_db import (
    create_care_plan as db_create_care_plan,
    list_care_plans_by_patient,
    get_care_plan_with_details as get_care_plan_detail,
    get_care_plan_by_id,
    update_care_plan_for_patient,
    delete_care_plan,
    create_medication as create_care_plan_medication,
    update_medication_for_patient,
    delete_medication,
    create_task as create_care_plan_task,
    update_task_for_patient,
    delete_task,
    create_precaution as create_care_plan_precaution,
    update_precaution_for_patient,
    delete_precaution,
    record_completion,
    get_completion_stats
)
from consts.const import DEFAULT_TENANT_ID

from database.patient_db import get_patient_by_medical_record_no


logger = logging.getLogger(__name__)
 
care_plan_tools = FastMCP("care_plan")
 
 
@care_plan_tools.tool(
    name="create_care_plan",
    description="Create a rehabilitation care plan for a patient. Use when doctor wants to set up a post-treatment or post-surgery care plan including medications, tasks, and precautions."
)
async def create_care_plan(
    medical_record_no: str,
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
        medical_record_no: Patient's medical record number (病历号)
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
        # Get patient by medical record number
        patient = get_patient_by_medical_record_no(medical_record_no, tenant_id)
        if not patient:
            return {"error": "Patient not found", "medical_record_no": medical_record_no}
        patient_id = patient.get("patient_id")
        if not patient_id:
            return {"error": "Patient ID not found", "medical_record_no": medical_record_no}
 
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
 
        logger.info(f"Created care plan {plan_id} for patient {medical_record_no}")
 
        return {
            "success": True,
            "plan_id": plan_id,
            "medical_record_no": medical_record_no,
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
    medical_record_no: str,
    tenant_id: str,
    status: Optional[str] = None
) -> Dict[str, Any]:
    """
    Get all care plans for a patient.
 
    Args:
        medical_record_no: Patient's medical record number (病历号)
        tenant_id: Tenant ID for data isolation
        status: Filter by status (active/completed/paused)


    Returns:
        List of care plans with details
    """
    try:
        # Get patient_id from medical_record_no
        patient = get_patient_by_medical_record_no(medical_record_no, tenant_id)
        if not patient:
            return {"error": "Patient not found", "medical_record_no": medical_record_no}
        
        patient_id = patient.get("patient_id")
        if not patient_id:
            return {"error": "Patient ID not found", "medical_record_no": medical_record_no}
        
        plans = list_care_plans_by_patient(patient_id, tenant_id, status)
 
        result = {
            "medical_record_no": medical_record_no,
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
 
        logger.info(f"Retrieved {len(plans)} care plans for patient {medical_record_no}")
        return result
 
    except Exception as e:
        logger.error(f"Error getting patient care plans: {str(e)}")
        return {"error": str(e)}
 
 
@care_plan_tools.tool(
    name="update_care_plan",
    description="Update an existing care plan's basic information. Use when doctor needs to modify plan name, description, dates, or status."
)
async def update_care_plan_tool(
    medical_record_no: str,
    plan_id: int,
    tenant_id: str,
    user_id: str,
    plan_name: Optional[str] = None,
    plan_description: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    status: Optional[str] = None
) -> Dict[str, Any]:
    """
    Update an existing care plan.
    
    Args:
        medical_record_no: Patient's medical record number (病历号)
        plan_id: Care plan ID to update
        tenant_id: Tenant ID for data isolation
        user_id: Doctor user ID updating the plan
        plan_name: Updated plan name (optional)
        plan_description: Updated plan description (optional)
        start_date: Updated start date (YYYY-MM-DD, optional)
        end_date: Updated end date (YYYY-MM-DD, optional)
        status: Updated status (active/completed/paused, optional)
    
    Returns:
        Update result
    """
    try:
        result = update_care_plan_for_patient(
            medical_record_no=medical_record_no,
            plan_id=plan_id,
            tenant_id=tenant_id,
            user_id=user_id,
            plan_name=plan_name,
            plan_description=plan_description,
            start_date=start_date,
            end_date=end_date,
            status=status
        )

        if not result.get("success"):
            return result

        logger.info(f"Updated care plan {plan_id} for patient {medical_record_no}")
        return result
    
    except Exception as e:
        logger.error(f"Error updating care plan: {str(e)}")
        return {"error": str(e)}


@care_plan_tools.tool(
    name="delete_care_plan",
    description="Delete a care plan for a patient. Use when doctor needs to remove an obsolete or incorrect care plan."
)
async def delete_care_plan_tool(
    medical_record_no: str,
    plan_id: int,
    tenant_id: str,
    user_id: str
) -> Dict[str, Any]:
    """
    Delete a care plan.
    
    Args:
        medical_record_no: Patient's medical record number (病历号)
        plan_id: Care plan ID to delete
        tenant_id: Tenant ID for data isolation
        user_id: Doctor user ID deleting the plan
    
    Returns:
        Deletion result
    """
    try:
        # Get patient_id from medical_record_no
        patient = get_patient_by_medical_record_no(medical_record_no, tenant_id)
        if not patient:
            return {"error": "Patient not found", "medical_record_no": medical_record_no}
        
        # Verify plan belongs to patient
        plan = get_care_plan_by_id(plan_id, tenant_id)
        if not plan:
            return {"error": "Care plan not found", "plan_id": plan_id}
        
        if plan.get("patient_id") != patient.get("patient_id"):
            return {"error": "Care plan does not belong to this patient", "plan_id": plan_id, "medical_record_no": medical_record_no}
        
        success = delete_care_plan(plan_id, tenant_id, user_id)
        
        if success:
            logger.info(f"Deleted care plan {plan_id} for patient {medical_record_no}")
            return {
                "success": True,
                "plan_id": plan_id,
                "medical_record_no": medical_record_no,
                "message": "Care plan deleted successfully"
            }
        else:
            return {"error": "Failed to delete care plan", "plan_id": plan_id}
    
    except Exception as e:
        logger.error(f"Error deleting care plan: {str(e)}")
        return {"error": str(e)}


@care_plan_tools.tool(
    name="add_medication_to_plan",
    description="Add a medication to an existing care plan. Use when doctor needs to add or modify medication prescriptions in a care plan."
)
async def add_medication_to_plan_tool(
    medical_record_no: str,
    plan_id: int,
    tenant_id: str,
    user_id: str,
    medication_name: str,
    dosage: str,
    frequency: str,
    time_slots: Optional[List[str]] = None,
    notes: Optional[str] = None
) -> Dict[str, Any]:
    """
    Add a medication to an existing care plan.
    
    Args:
        medical_record_no: Patient's medical record number (病历号)
        plan_id: Care plan ID
        tenant_id: Tenant ID for data isolation
        user_id: Doctor user ID
        medication_name: Name of the medication
        dosage: Dosage information
        frequency: Frequency of intake
        time_slots: Specific time slots for medication (optional)
        notes: Additional notes (optional)
    
    Returns:
        Created medication details
    """
    try:
        # Get patient_id from medical_record_no
        patient = get_patient_by_medical_record_no(medical_record_no, tenant_id)
        if not patient:
            return {"error": "Patient not found", "medical_record_no": medical_record_no}
        
        # Verify plan belongs to patient
        plan = get_care_plan_by_id(plan_id, tenant_id)
        if not plan:
            return {"error": "Care plan not found", "plan_id": plan_id}
        
        if plan.get("patient_id") != patient.get("patient_id"):
            return {"error": "Care plan does not belong to this patient", "plan_id": plan_id, "medical_record_no": medical_record_no}
        
        medication_data = {
            "plan_id": plan_id,
            "medication_name": medication_name,
            "dosage": dosage,
            "frequency": frequency,
            "time_slots": time_slots or [],
            "notes": notes
        }
        
        result = create_care_plan_medication(medication_data, tenant_id, user_id)
        
        logger.info(f"Added medication to plan {plan_id} for patient {medical_record_no}")
        return {
            "success": True,
            "medication_id": result.get("medication_id"),
            "plan_id": plan_id,
            "medical_record_no": medical_record_no,
            "medication_name": medication_name
        }
    
    except Exception as e:
        logger.error(f"Error adding medication to plan: {str(e)}")
        return {"error": str(e)}


@care_plan_tools.tool(
    name="update_medication_in_plan",
    description="Update medication information in a care plan. Use when doctor needs to modify dosage, frequency, or other medication details."
)
async def update_medication_in_plan_tool(
    medical_record_no: str,
    medication_id: int,
    tenant_id: str,
    user_id: str,
    medication_name: Optional[str] = None,
    dosage: Optional[str] = None,
    frequency: Optional[str] = None,
    time_slots: Optional[List[str]] = None,
    notes: Optional[str] = None
) -> Dict[str, Any]:
    """
    Update medication information in a care plan.
    
    Args:
        medical_record_no: Patient's medical record number (病历号)
        medication_id: Medication ID to update
        tenant_id: Tenant ID for data isolation
        user_id: Doctor user ID
        medication_name: Updated medication name (optional)
        dosage: Updated dosage (optional)
        frequency: Updated frequency (optional)
        time_slots: Updated time slots (optional)
        notes: Updated notes (optional)
    
    Returns:
        Update result
    """
    try:
        result = update_medication_for_patient(
            medical_record_no=medical_record_no,
            medication_id=medication_id,
            tenant_id=tenant_id,
            user_id=user_id,
            medication_name=medication_name,
            dosage=dosage,
            frequency=frequency,
            time_slots=time_slots,
            notes=notes
        )

        if not result.get("success"):
            return result

        logger.info(f"Updated medication {medication_id} for patient {medical_record_no}")
        return result
    
    except Exception as e:
        logger.error(f"Error updating medication: {str(e)}")
        return {"error": str(e)}


@care_plan_tools.tool(
    name="delete_medication_from_plan",
    description="Remove a medication from a care plan. Use when doctor needs to stop or remove a medication prescription."
)
async def delete_medication_from_plan_tool(
    medical_record_no: str,
    medication_id: int,
    tenant_id: str,
    user_id: str
) -> Dict[str, Any]:
    """
    Delete a medication from a care plan.
    
    Args:
        medical_record_no: Patient's medical record number (病历号)
        medication_id: Medication ID to delete
        tenant_id: Tenant ID for data isolation
        user_id: Doctor user ID
    
    Returns:
        Deletion result
    """
    try:
        # Get patient_id from medical_record_no
        patient = get_patient_by_medical_record_no(medical_record_no, tenant_id)
        if not patient:
            return {"error": "Patient not found", "medical_record_no": medical_record_no}
        
        success = delete_medication(medication_id, tenant_id, user_id)
        
        if success:
            logger.info(f"Deleted medication {medication_id} for patient {medical_record_no}")
            return {
                "success": True,
                "medication_id": medication_id,
                "medical_record_no": medical_record_no,
                "message": "Medication deleted successfully"
            }
        else:
            return {"error": "Failed to delete medication", "medication_id": medication_id}
    
    except Exception as e:
        logger.error(f"Error deleting medication: {str(e)}")
        return {"error": str(e)}


@care_plan_tools.tool(
    name="add_task_to_plan",
    description="Add a rehabilitation task to an existing care plan. Use when doctor needs to add exercise, therapy, or other rehabilitation tasks."
)
async def add_task_to_plan_tool(
    medical_record_no: str,
    plan_id: int,
    tenant_id: str,
    user_id: str,
    task_title: str,
    task_description: str,
    task_category: str,
    frequency: str,
    duration: Optional[str] = None
) -> Dict[str, Any]:
    """
    Add a task to an existing care plan.
    
    Args:
        medical_record_no: Patient's medical record number (病历号)
        plan_id: Care plan ID
        tenant_id: Tenant ID for data isolation
        user_id: Doctor user ID
        task_title: Title of the task
        task_description: Description of the task
        task_category: Category of the task
        frequency: Frequency of the task
        duration: Duration of the task (optional)
    
    Returns:
        Created task details
    """
    try:
        # Get patient_id from medical_record_no
        patient = get_patient_by_medical_record_no(medical_record_no, tenant_id)
        if not patient:
            return {"error": "Patient not found", "medical_record_no": medical_record_no}
        
        # Verify plan belongs to patient
        plan = get_care_plan_by_id(plan_id, tenant_id)
        if not plan:
            return {"error": "Care plan not found", "plan_id": plan_id}
        
        if plan.get("patient_id") != patient.get("patient_id"):
            return {"error": "Care plan does not belong to this patient", "plan_id": plan_id, "medical_record_no": medical_record_no}
        
        task_data = {
            "plan_id": plan_id,
            "task_title": task_title,
            "task_description": task_description,
            "task_category": task_category,
            "frequency": frequency,
            "duration": duration
        }
        
        result = create_care_plan_task(task_data, tenant_id, user_id)
        
        logger.info(f"Added task to plan {plan_id} for patient {medical_record_no}")
        return {
            "success": True,
            "task_id": result.get("task_id"),
            "plan_id": plan_id,
            "medical_record_no": medical_record_no,
            "task_title": task_title
        }
    
    except Exception as e:
        logger.error(f"Error adding task to plan: {str(e)}")
        return {"error": str(e)}


@care_plan_tools.tool(
    name="update_task_in_plan",
    description="Update task information in a care plan. Use when doctor needs to modify task details, frequency, or duration."
)
async def update_task_in_plan_tool(
    medical_record_no: str,
    task_id: int,
    tenant_id: str,
    user_id: str,
    task_title: Optional[str] = None,
    task_description: Optional[str] = None,
    task_category: Optional[str] = None,
    frequency: Optional[str] = None,
    duration: Optional[str] = None
) -> Dict[str, Any]:
    """
    Update task information in a care plan.
    
    Args:
        medical_record_no: Patient's medical record number (病历号)
        task_id: Task ID to update
        tenant_id: Tenant ID for data isolation
        user_id: Doctor user ID
        task_title: Updated task title (optional)
        task_description: Updated task description (optional)
        task_category: Updated task category (optional)
        frequency: Updated frequency (optional)
        duration: Updated duration (optional)
    
    Returns:
        Update result
    """
    try:
        result = update_task_for_patient(
            medical_record_no=medical_record_no,
            task_id=task_id,
            tenant_id=tenant_id,
            user_id=user_id,
            task_title=task_title,
            task_description=task_description,
            task_category=task_category,
            frequency=frequency,
            duration=duration
        )

        if not result.get("success"):
            return result

        logger.info(f"Updated task {task_id} for patient {medical_record_no}")
        return result
    
    except Exception as e:
        logger.error(f"Error updating task: {str(e)}")
        return {"error": str(e)}


@care_plan_tools.tool(
    name="delete_task_from_plan",
    description="Remove a task from a care plan. Use when doctor needs to stop or remove a rehabilitation task."
)
async def delete_task_from_plan_tool(
    medical_record_no: str,
    task_id: int,
    tenant_id: str,
    user_id: str
) -> Dict[str, Any]:
    """
    Delete a task from a care plan.
    
    Args:
        medical_record_no: Patient's medical record number (病历号)
        task_id: Task ID to delete
        tenant_id: Tenant ID for data isolation
        user_id: Doctor user ID
    
    Returns:
        Deletion result
    """
    try:
        # Get patient_id from medical_record_no
        patient = get_patient_by_medical_record_no(medical_record_no, tenant_id)
        if not patient:
            return {"error": "Patient not found", "medical_record_no": medical_record_no}
        
        success = delete_task(task_id, tenant_id, user_id)
        
        if success:
            logger.info(f"Deleted task {task_id} for patient {medical_record_no}")
            return {
                "success": True,
                "task_id": task_id,
                "medical_record_no": medical_record_no,
                "message": "Task deleted successfully"
            }
        else:
            return {"error": "Failed to delete task", "task_id": task_id}
    
    except Exception as e:
        logger.error(f"Error deleting task: {str(e)}")
        return {"error": str(e)}


@care_plan_tools.tool(
    name="add_precaution_to_plan",
    description="Add a precaution or warning to a care plan. Use when doctor needs to add important safety notes or warnings."
)
async def add_precaution_to_plan_tool(
    medical_record_no: str,
    plan_id: int,
    tenant_id: str,
    user_id: str,
    precaution_content: str,
    priority: str = "medium"
) -> Dict[str, Any]:
    """
    Add a precaution to an existing care plan.
    
    Args:
        medical_record_no: Patient's medical record number (病历号)
        plan_id: Care plan ID
        tenant_id: Tenant ID for data isolation
        user_id: Doctor user ID
        precaution_content: Content of the precaution
        priority: Priority level (high/medium/low, default: medium)
    
    Returns:
        Created precaution details
    """
    try:
        # Get patient_id from medical_record_no
        patient = get_patient_by_medical_record_no(medical_record_no, tenant_id)
        if not patient:
            return {"error": "Patient not found", "medical_record_no": medical_record_no}
        
        # Verify plan belongs to patient
        plan = get_care_plan_by_id(plan_id, tenant_id)
        if not plan:
            return {"error": "Care plan not found", "plan_id": plan_id}
        
        if plan.get("patient_id") != patient.get("patient_id"):
            return {"error": "Care plan does not belong to this patient", "plan_id": plan_id, "medical_record_no": medical_record_no}
        
        precaution_data = {
            "plan_id": plan_id,
            "precaution_content": precaution_content,
            "priority": priority
        }
        
        result = create_care_plan_precaution(precaution_data, tenant_id, user_id)
        
        logger.info(f"Added precaution to plan {plan_id} for patient {medical_record_no}")
        return {
            "success": True,
            "precaution_id": result.get("precaution_id"),
            "plan_id": plan_id,
            "medical_record_no": medical_record_no,
            "priority": priority
        }
    
    except Exception as e:
        logger.error(f"Error adding precaution to plan: {str(e)}")
        return {"error": str(e)}


@care_plan_tools.tool(
    name="delete_precaution_from_plan",
    description="Remove a precaution from a care plan. Use when doctor needs to remove an obsolete precaution."
)
async def delete_precaution_from_plan_tool(
    medical_record_no: str,
    precaution_id: int,
    tenant_id: str,
    user_id: str
) -> Dict[str, Any]:
    """
    Delete a precaution from a care plan.
    
    Args:
        medical_record_no: Patient's medical record number (病历号)
        precaution_id: Precaution ID to delete
        tenant_id: Tenant ID for data isolation
        user_id: Doctor user ID
    
    Returns:
        Deletion result
    """
    try:
        # Get patient_id from medical_record_no
        patient = get_patient_by_medical_record_no(medical_record_no, tenant_id)
        if not patient:
            return {"error": "Patient not found", "medical_record_no": medical_record_no}
        
        success = delete_precaution(precaution_id, tenant_id, user_id)
        
        if success:
            logger.info(f"Deleted precaution {precaution_id} for patient {medical_record_no}")
            return {
                "success": True,
                "precaution_id": precaution_id,
                "medical_record_no": medical_record_no,
                "message": "Precaution deleted successfully"
            }
        else:
            return {"error": "Failed to delete precaution", "precaution_id": precaution_id}
    
    except Exception as e:
        logger.error(f"Error deleting precaution: {str(e)}")
        return {"error": str(e)}


@care_plan_tools.tool(
    name="update_precaution_in_plan",
    description="Update precaution information in a care plan. Use when doctor needs to modify precaution content or priority."
)
async def update_precaution_in_plan_tool(
    medical_record_no: str,
    precaution_id: int,
    tenant_id: str,
    user_id: str,
    precaution_content: Optional[str] = None,
    priority: Optional[str] = None
) -> Dict[str, Any]:
    """
    Update precaution information in a care plan.
    """
    try:
        result = update_precaution_for_patient(
            medical_record_no=medical_record_no,
            precaution_id=precaution_id,
            tenant_id=tenant_id,
            user_id=user_id,
            precaution_content=precaution_content,
            priority=priority
        )

        if not result.get("success"):
            return result

        logger.info(f"Updated precaution {precaution_id} for patient {medical_record_no}")
        return result

    except Exception as e:
        logger.error(f"Error updating precaution: {str(e)}")
        return {"error": str(e)}


@care_plan_tools.tool(
    name="get_care_plan_completion_stats",
    description="Get completion statistics for a care plan. Use when doctor asks about patient's compliance, medication adherence, or task completion rates."
)
async def get_care_plan_completion_stats_tool(
    medical_record_no: str,
    plan_id: int,
    tenant_id: str,
    start_date: str,
    end_date: str
) -> Dict[str, Any]:
    """
    Get completion statistics for a care plan.
    
    Args:
        medical_record_no: Patient's medical record number (病历号)
        plan_id: Care plan ID
        tenant_id: Tenant ID for data isolation
        start_date: Start date for statistics (YYYY-MM-DD)
        end_date: End date for statistics (YYYY-MM-DD)
    
    Returns:
        Completion statistics
    """
    try:
        # Get patient_id from medical_record_no
        patient = get_patient_by_medical_record_no(medical_record_no, tenant_id)
        if not patient:
            return {"error": "Patient not found", "medical_record_no": medical_record_no}
        
        patient_id = patient.get("patient_id")
        
        # Verify plan belongs to patient
        plan = get_care_plan_by_id(plan_id, tenant_id)
        if not plan:
            return {"error": "Care plan not found", "plan_id": plan_id}
        
        if plan.get("patient_id") != patient_id:
            return {"error": "Care plan does not belong to this patient", "plan_id": plan_id, "medical_record_no": medical_record_no}
        
        stats = get_completion_stats(plan_id, patient_id, start_date, end_date, tenant_id)
        
        logger.info(f"Retrieved completion stats for plan {plan_id} for patient {medical_record_no}")
        return {
            "medical_record_no": medical_record_no,
            "plan_id": plan_id,
            "date_range": f"{start_date} to {end_date}",
            "statistics": stats
        }
    
    except Exception as e:
        logger.error(f"Error getting completion stats: {str(e)}")
        return {"error": str(e)}


@care_plan_tools.tool(
    name="update_care_plan_progress",
    description="Update care plan execution progress. Use when recording patient's medication intake, completed tasks, or daily progress updates."
)
async def update_care_plan_progress_tool(
    medical_record_no: str,
    plan_id: int,
    tenant_id: str,
    user_id: str,
    record_date: str,
    completed_items: List[Dict]
) -> Dict[str, Any]:

    """
    Update care plan execution progress.
 
    Args:
        medical_record_no: Patient's medical record number (病历号)
        plan_id: Care plan ID
        tenant_id: Tenant ID for data isolation
        user_id: User ID recording the progress
        record_date: Date of the record (YYYY-MM-DD)
        completed_items: List of completed items with type and id
 
    Returns:
        Updated progress summary
    """
    try:
        # Get patient_id from medical_record_no
        patient = get_patient_by_medical_record_no(medical_record_no, tenant_id)
        if not patient:
            return {"error": "Patient not found", "medical_record_no": medical_record_no}
        
        patient_id = patient.get("patient_id")
        
        # Verify plan belongs to patient
        plan = get_care_plan_by_id(plan_id, tenant_id)
        if not plan:
            return {"error": "Care plan not found", "plan_id": plan_id}
        
        if plan.get("patient_id") != patient_id:
            return {"error": "Care plan does not belong to this patient", "plan_id": plan_id, "medical_record_no": medical_record_no}
        
        updated_count = 0
 
        for item in completed_items:
            item_type = item.get("type")  # medication or task
            item_id = item.get("item_id")
            completed = item.get("completed", True)
            notes = item.get("notes")
 
            completion_data = {
                "plan_id": plan_id,
                "patient_id": patient_id,
                "record_date": record_date,
                "item_type": item_type,
                "item_id": item_id,
                "completed": completed,
                "notes": notes
            }
            
            result = record_completion(completion_data, tenant_id, user_id)
 
            if result:
                updated_count += 1
 
        # Get updated plan detail
        plan_detail = get_care_plan_detail(plan_id, tenant_id)
 
        logger.info(f"Updated progress for plan {plan_id} for patient {medical_record_no}")
        return {
            "success": True,
            "medical_record_no": medical_record_no,
            "plan_id": plan_id,
            "record_date": record_date,
            "items_updated": updated_count,
            "total_items_submitted": len(completed_items),
            "plan_status": plan_detail.get("status") if plan_detail else "unknown"
        }
 
    except Exception as e:
        logger.error(f"Error updating care plan progress: {str(e)}")
        return {"error": str(e)}
 
 
