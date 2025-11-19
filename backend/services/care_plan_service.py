import logging
from typing import List, Dict, Optional
from datetime import datetime, timedelta

from consts.exceptions import AgentRunException
from database import care_plan_db

logger = logging.getLogger(__name__)


# ============================================================================
# Care Plan Services
# ============================================================================

async def create_care_plan_service(plan_data: dict, tenant_id: str, user_id: str) -> dict:
    """
    Create a new care plan with medications, tasks, and precautions
    """
    try:
        # Validate required fields
        required_fields = ['patient_id', 'plan_name', 'start_date']
        for field in required_fields:
            if not plan_data.get(field):
                raise ValueError(f"Missing required field: {field}")

        # Create the main care plan
        plan_result = care_plan_db.create_care_plan(plan_data, tenant_id, user_id)
        plan_id = plan_result['plan_id']

        # Create medications
        medications = plan_data.get('medications', [])
        for med in medications:
            med['plan_id'] = plan_id
            care_plan_db.create_medication(med, tenant_id, user_id)

        # Create tasks
        tasks = plan_data.get('tasks', [])
        for task in tasks:
            task['plan_id'] = plan_id
            care_plan_db.create_task(task, tenant_id, user_id)

        # Create precautions
        precautions = plan_data.get('precautions', [])
        for precaution in precautions:
            precaution['plan_id'] = plan_id
            care_plan_db.create_precaution(precaution, tenant_id, user_id)

        logger.info(f"Created care plan {plan_id} with {len(medications)} medications, "
                   f"{len(tasks)} tasks, {len(precautions)} precautions")

        return {
            "success": True,
            "plan_id": plan_id,
            "message": "Care plan created successfully"
        }
    except Exception as e:
        logger.error(f"Failed to create care plan: {str(e)}")
        raise AgentRunException(f"Failed to create care plan: {str(e)}")


async def get_care_plan_service(plan_id: int, tenant_id: str) -> Optional[dict]:
    """
    Get care plan with all details
    """
    try:
        plan = care_plan_db.get_care_plan_with_details(plan_id, tenant_id)
        if not plan:
            return None

        return plan
    except Exception as e:
        logger.error(f"Failed to get care plan: {str(e)}")
        raise AgentRunException(f"Failed to get care plan: {str(e)}")


async def list_care_plans_service(patient_id: int, tenant_id: str,
                                   status: Optional[str] = None) -> List[dict]:
    """
    List all care plans for a patient
    """
    try:
        plans = care_plan_db.list_care_plans_by_patient(patient_id, tenant_id, status)

        # Enrich each plan with counts
        for plan in plans:
            medications = care_plan_db.list_medications_by_plan(plan['plan_id'], tenant_id)
            tasks = care_plan_db.list_tasks_by_plan(plan['plan_id'], tenant_id)
            precautions = care_plan_db.list_precautions_by_plan(plan['plan_id'], tenant_id)

            plan['medication_count'] = len(medications)
            plan['task_count'] = len(tasks)
            plan['precaution_count'] = len(precautions)

        return plans
    except Exception as e:
        logger.error(f"Failed to list care plans: {str(e)}")
        raise AgentRunException(f"Failed to list care plans: {str(e)}")


async def update_care_plan_service(plan_id: int, plan_data: dict,
                                   tenant_id: str, user_id: str) -> dict:
    """
    Update care plan
    """
    try:
        success = care_plan_db.update_care_plan(plan_id, plan_data, tenant_id, user_id)
        if not success:
            raise ValueError(f"Care plan {plan_id} not found")

        return {
            "success": True,
            "message": "Care plan updated successfully"
        }
    except Exception as e:
        logger.error(f"Failed to update care plan: {str(e)}")
        raise AgentRunException(f"Failed to update care plan: {str(e)}")


async def delete_care_plan_service(plan_id: int, tenant_id: str, user_id: str) -> dict:
    """
    Delete care plan (soft delete)
    """
    try:
        success = care_plan_db.delete_care_plan(plan_id, tenant_id, user_id)
        if not success:
            raise ValueError(f"Care plan {plan_id} not found")

        return {
            "success": True,
            "message": "Care plan deleted successfully"
        }
    except Exception as e:
        logger.error(f"Failed to delete care plan: {str(e)}")
        raise AgentRunException(f"Failed to delete care plan: {str(e)}")


# ============================================================================
# Medication Services
# ============================================================================

async def add_medication_service(medication_data: dict, tenant_id: str, user_id: str) -> dict:
    """
    Add a medication to a care plan
    """
    try:
        result = care_plan_db.create_medication(medication_data, tenant_id, user_id)
        return {
            "success": True,
            "medication_id": result['medication_id'],
            "message": "Medication added successfully"
        }
    except Exception as e:
        logger.error(f"Failed to add medication: {str(e)}")
        raise AgentRunException(f"Failed to add medication: {str(e)}")


async def update_medication_service(medication_id: int, medication_data: dict,
                                    tenant_id: str, user_id: str) -> dict:
    """
    Update medication
    """
    try:
        success = care_plan_db.update_medication(medication_id, medication_data, tenant_id, user_id)
        if not success:
            raise ValueError(f"Medication {medication_id} not found")

        return {
            "success": True,
            "message": "Medication updated successfully"
        }
    except Exception as e:
        logger.error(f"Failed to update medication: {str(e)}")
        raise AgentRunException(f"Failed to update medication: {str(e)}")


async def delete_medication_service(medication_id: int, tenant_id: str, user_id: str) -> dict:
    """
    Delete medication
    """
    try:
        success = care_plan_db.delete_medication(medication_id, tenant_id, user_id)
        if not success:
            raise ValueError(f"Medication {medication_id} not found")

        return {
            "success": True,
            "message": "Medication deleted successfully"
        }
    except Exception as e:
        logger.error(f"Failed to delete medication: {str(e)}")
        raise AgentRunException(f"Failed to delete medication: {str(e)}")


# ============================================================================
# Task Services
# ============================================================================

async def add_task_service(task_data: dict, tenant_id: str, user_id: str) -> dict:
    """
    Add a task to a care plan
    """
    try:
        result = care_plan_db.create_task(task_data, tenant_id, user_id)
        return {
            "success": True,
            "task_id": result['task_id'],
            "message": "Task added successfully"
        }
    except Exception as e:
        logger.error(f"Failed to add task: {str(e)}")
        raise AgentRunException(f"Failed to add task: {str(e)}")


async def update_task_service(task_id: int, task_data: dict,
                              tenant_id: str, user_id: str) -> dict:
    """
    Update task
    """
    try:
        success = care_plan_db.update_task(task_id, task_data, tenant_id, user_id)
        if not success:
            raise ValueError(f"Task {task_id} not found")

        return {
            "success": True,
            "message": "Task updated successfully"
        }
    except Exception as e:
        logger.error(f"Failed to update task: {str(e)}")
        raise AgentRunException(f"Failed to update task: {str(e)}")


async def delete_task_service(task_id: int, tenant_id: str, user_id: str) -> dict:
    """
    Delete task
    """
    try:
        success = care_plan_db.delete_task(task_id, tenant_id, user_id)
        if not success:
            raise ValueError(f"Task {task_id} not found")

        return {
            "success": True,
            "message": "Task deleted successfully"
        }
    except Exception as e:
        logger.error(f"Failed to delete task: {str(e)}")
        raise AgentRunException(f"Failed to delete task: {str(e)}")


# ============================================================================
# Precaution Services
# ============================================================================

async def add_precaution_service(precaution_data: dict, tenant_id: str, user_id: str) -> dict:
    """
    Add a precaution to a care plan
    """
    try:
        result = care_plan_db.create_precaution(precaution_data, tenant_id, user_id)
        return {
            "success": True,
            "precaution_id": result['precaution_id'],
            "message": "Precaution added successfully"
        }
    except Exception as e:
        logger.error(f"Failed to add precaution: {str(e)}")
        raise AgentRunException(f"Failed to add precaution: {str(e)}")


async def delete_precaution_service(precaution_id: int, tenant_id: str, user_id: str) -> dict:
    """
    Delete precaution
    """
    try:
        success = care_plan_db.delete_precaution(precaution_id, tenant_id, user_id)
        if not success:
            raise ValueError(f"Precaution {precaution_id} not found")

        return {
            "success": True,
            "message": "Precaution deleted successfully"
        }
    except Exception as e:
        logger.error(f"Failed to delete precaution: {str(e)}")
        raise AgentRunException(f"Failed to delete precaution: {str(e)}")


# ============================================================================
# Completion Services
# ============================================================================

async def record_completion_service(completion_data: dict, tenant_id: str, user_id: str) -> dict:
    """
    Record completion status for a medication or task
    """
    try:
        required_fields = ['plan_id', 'patient_id', 'record_date', 'item_type', 'item_id']
        for field in required_fields:
            if field not in completion_data:
                raise ValueError(f"Missing required field: {field}")

        result = care_plan_db.record_completion(completion_data, tenant_id, user_id)
        return {
            "success": True,
            "completion_id": result['completion_id'],
            "message": "Completion recorded successfully"
        }
    except Exception as e:
        logger.error(f"Failed to record completion: {str(e)}")
        raise AgentRunException(f"Failed to record completion: {str(e)}")


async def get_today_plan_service(patient_id: int, tenant_id: str,
                                 record_date: Optional[str] = None) -> dict:
    """
    Get today's care plan for a patient including completion status
    """
    try:
        # Use today's date if not provided
        if not record_date:
            record_date = datetime.now().strftime('%Y-%m-%d')

        # Get active care plans for this patient
        plans = care_plan_db.list_care_plans_by_patient(patient_id, tenant_id, status='active')
        if not plans:
            return {
                "date": record_date,
                "medications": [],
                "tasks": [],
                "precautions": []
            }

        # Use the most recent active plan
        plan = plans[0]
        plan_id = plan['plan_id']

        # Get medications, tasks, and precautions
        medications = care_plan_db.list_medications_by_plan(plan_id, tenant_id)
        tasks = care_plan_db.list_tasks_by_plan(plan_id, tenant_id)
        precautions = care_plan_db.list_precautions_by_plan(plan_id, tenant_id)

        # Get completion records for today
        completion_records = care_plan_db.get_completion_records(
            plan_id, patient_id, record_date, tenant_id
        )

        # Build completion map
        completion_map = {}
        for record in completion_records:
            key = f"{record['item_type']}_{record['item_id']}"
            completion_map[key] = record['completed']

        # Add completion status to medications
        for med in medications:
            key = f"medication_{med['medication_id']}"
            med['completed'] = completion_map.get(key, False)

        # Add completion status to tasks
        for task in tasks:
            key = f"task_{task['task_id']}"
            task['completed'] = completion_map.get(key, False)

        return {
            "plan_id": plan_id,
            "date": record_date,
            "medications": medications,
            "tasks": tasks,
            "precautions": [p['precaution_content'] for p in precautions]
        }
    except Exception as e:
        logger.error(f"Failed to get today's plan: {str(e)}")
        raise AgentRunException(f"Failed to get today's plan: {str(e)}")


async def get_weekly_progress_service(patient_id: int, tenant_id: str,
                                      end_date: Optional[str] = None) -> dict:
    """
    Get weekly progress statistics
    """
    try:
        # Calculate date range (last 7 days)
        if not end_date:
            end_date_obj = datetime.now()
        else:
            end_date_obj = datetime.strptime(end_date, '%Y-%m-%d')

        start_date_obj = end_date_obj - timedelta(days=6)
        start_date = start_date_obj.strftime('%Y-%m-%d')
        end_date = end_date_obj.strftime('%Y-%m-%d')

        # Get active care plan
        plans = care_plan_db.list_care_plans_by_patient(patient_id, tenant_id, status='active')
        if not plans:
            return {
                "completionRate": 0,
                "medicationCompliance": 0,
                "taskCompletion": 0,
                "weekData": []
            }

        plan_id = plans[0]['plan_id']

        # Get overall statistics
        stats = care_plan_db.get_completion_stats(
            plan_id, patient_id, start_date, end_date, tenant_id
        )

        
        daily_stats = []
        completion_chart = []

        current_date_calc = start_date_obj
        for i in range(7):
            date_str = current_date_calc.strftime('%Y-%m-%d')
            day_records = care_plan_db.get_completion_records(
                plan_id, patient_id, date_str, tenant_id
            )

            total = len(day_records)
            completed = sum(1 for r in day_records if r['completed'])
            completion_rate = round(completed / total * 100) if total > 0 else 0

            # Separate medication and task stats
            medication_records = [r for r in day_records if r['item_type'] == 'medication']
            task_records = [r for r in day_records if r['item_type'] == 'task']

            medication_completed = sum(1 for r in medication_records if r['completed'])
            task_completed = sum(1 for r in task_records if r['completed'])

            daily_stats.append({
                "date": date_str,
                "total_items": total,
                "completed_items": completed,
                "completion_rate": completion_rate,
                "medication_total": len(medication_records),
                "medication_completed": medication_completed,
                "task_total": len(task_records),
                "task_completed": task_completed
            })

            completion_chart.append({
                "date": date_str,
                "completion_rate": completion_rate
            })

            current_date_calc += timedelta(days=1)
 
        return {
            "overall_completion_rate": stats['completion_rate'],
            "medication_compliance_rate": stats['medication_compliance'],
            "task_completion_rate": stats['task_completion_rate'],
            "daily_stats": daily_stats,
            "completion_chart": completion_chart
        }
    except Exception as e:
        logger.error(f"Failed to get weekly progress: {str(e)}")
        raise AgentRunException(f"Failed to get weekly progress: {str(e)}")