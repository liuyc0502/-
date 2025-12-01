import logging

from typing import Any, List, Dict, Optional
from datetime import datetime
from sqlalchemy import and_, or_

from database.client import get_db_session, as_dict
from database.db_models import (
    CarePlan, CarePlanMedication, CarePlanTask,
    CarePlanPrecaution, CarePlanCompletion
)
from database.patient_db import get_patient_by_medical_record_no

logger = logging.getLogger(__name__)


# ============================================================================
# Care Plan Operations
# ============================================================================

def create_care_plan(plan_data: dict, tenant_id: str, user_id: str) -> dict:
    """
    Create a new care plan
    """
    with get_db_session() as session:
        new_plan = CarePlan(
            patient_id=plan_data.get('patient_id'),
            plan_name=plan_data.get('plan_name'),
            plan_description=plan_data.get('plan_description'),
            start_date=plan_data.get('start_date'),
            end_date=plan_data.get('end_date'),
            status=plan_data.get('status', 'active'),
            doctor_id=user_id,
            tenant_id=tenant_id,
            created_by=user_id,
            updated_by=user_id,
            delete_flag='N'
        )

        session.add(new_plan)
        session.flush()

        plan_id = new_plan.plan_id
        session.commit()

        logger.info(f"Created care plan: {plan_id} for patient: {plan_data.get('patient_id')}")
        return {"plan_id": plan_id}


def get_care_plan_by_id(plan_id: int, tenant_id: str) -> Optional[dict]:
    """
    Get care plan by ID
    """
    with get_db_session() as session:
        plan = session.query(CarePlan).filter(
            CarePlan.plan_id == plan_id,
            CarePlan.tenant_id == tenant_id,
            CarePlan.delete_flag != 'Y'
        ).first()

        if plan:
            return as_dict(plan)
        return None


def list_care_plans_by_patient(patient_id: int, tenant_id: str,
                                status: Optional[str] = None) -> List[dict]:
    """
    List all care plans for a specific patient by patient ID
    
    Args:
        patient_id: Patient ID (integer)
        tenant_id: Tenant ID for data isolation
        status: Optional status filter (active/completed/paused)
    
    Returns:
        List of care plans for the patient
    """
    with get_db_session() as session:
        query = session.query(CarePlan).filter(
            CarePlan.patient_id == patient_id,
            CarePlan.tenant_id == tenant_id,
            CarePlan.delete_flag != 'Y'
        )

        if status:
            query = query.filter(CarePlan.status == status)

        plans = query.order_by(CarePlan.create_time.desc()).all()
        return [as_dict(plan) for plan in plans]


def update_care_plan(plan_id: int, plan_data: dict, tenant_id: str, user_id: str) -> bool:
    """
    Update care plan
    """
    with get_db_session() as session:
        plan = session.query(CarePlan).filter(
            CarePlan.plan_id == plan_id,
            CarePlan.tenant_id == tenant_id,
            CarePlan.delete_flag != 'Y'
        ).first()

        if not plan:
            return False

        # Update fields
        if 'plan_name' in plan_data:
            plan.plan_name = plan_data['plan_name']
        if 'plan_description' in plan_data:
            plan.plan_description = plan_data['plan_description']
        if 'start_date' in plan_data:
            plan.start_date = plan_data['start_date']
        if 'end_date' in plan_data:
            plan.end_date = plan_data['end_date']
        if 'status' in plan_data:
            plan.status = plan_data['status']

        plan.updated_by = user_id
        session.commit()

        logger.info(f"Updated care plan: {plan_id}")
        return True


def update_care_plan_for_patient(
    medical_record_no: str,
    plan_id: int,
    tenant_id: str,
    user_id: str,
    plan_name: Optional[str] = None,
    plan_description: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    status: Optional[str] = None
) -> dict:
    """
    Update a care plan after validating patient ownership and fields
    """
    patient = get_patient_by_medical_record_no(medical_record_no, tenant_id)
    if not patient:
        return {"success": False, "error": "Patient not found", "medical_record_no": medical_record_no}

    plan = get_care_plan_by_id(plan_id, tenant_id)
    if not plan:
        return {"success": False, "error": "Care plan not found", "plan_id": plan_id}

    if plan.get("patient_id") != patient.get("patient_id"):
        return {
            "success": False,
            "error": "Care plan does not belong to this patient",
            "plan_id": plan_id,
            "medical_record_no": medical_record_no
        }

    update_data: Dict[str, str] = {}
    if plan_name is not None:
        update_data["plan_name"] = plan_name
    if plan_description is not None:
        update_data["plan_description"] = plan_description
    if start_date is not None:
        update_data["start_date"] = start_date
    if end_date is not None:
        update_data["end_date"] = end_date
    if status is not None:
        update_data["status"] = status

    if not update_data:
        return {"success": False, "error": "No fields to update"}

    success = update_care_plan(plan_id, update_data, tenant_id, user_id)
    if not success:
        return {"success": False, "error": "Failed to update care plan", "plan_id": plan_id}

    updated_plan = get_care_plan_by_id(plan_id, tenant_id)
    return {
        "success": True,
        "plan_id": plan_id,
        "patient_id": patient.get("patient_id"),
        "medical_record_no": medical_record_no,
        "updated_fields": list(update_data.keys()),
        "plan": updated_plan
    }


def delete_care_plan(plan_id: int, tenant_id: str, user_id: str) -> bool:
    """
    Hard delete care plan
    """
    with get_db_session() as session:
        plan = session.query(CarePlan).filter(
            CarePlan.plan_id == plan_id,
            CarePlan.tenant_id == tenant_id
        ).first()
 
        if not plan:
            return False
 
        session.delete(plan)
        session.commit()
 
        logger.info(f"Hard deleted care plan: {plan_id}")
        return True


# ============================================================================
# Medication Operations
# ============================================================================

def create_medication(medication_data: dict, tenant_id: str, user_id: str) -> dict:
    """
    Create a medication entry for a care plan
    """
    with get_db_session() as session:
        new_medication = CarePlanMedication(
            plan_id=medication_data.get('plan_id'),
            medication_name=medication_data.get('medication_name'),
            dosage=medication_data.get('dosage'),
            frequency=medication_data.get('frequency'),
            time_slots=medication_data.get('time_slots', []),
            notes=medication_data.get('notes'),
            tenant_id=tenant_id,
            created_by=user_id,
            updated_by=user_id,
            delete_flag='N'
        )

        session.add(new_medication)
        session.flush()

        medication_id = new_medication.medication_id
        session.commit()

        logger.info(f"Created medication: {medication_id} for plan: {medication_data.get('plan_id')}")
        return {"medication_id": medication_id}


def list_medications_by_plan(plan_id: int, tenant_id: str) -> List[dict]:
    """
    List all medications for a specific care plan
    """
    with get_db_session() as session:
        medications = session.query(CarePlanMedication).filter(
            CarePlanMedication.plan_id == plan_id,
            CarePlanMedication.tenant_id == tenant_id,
            CarePlanMedication.delete_flag != 'Y'
        ).all()

        return [as_dict(med) for med in medications]


def get_medication_by_id(medication_id: int, tenant_id: str) -> Optional[dict]:
    """
    Get medication by ID
    """
    with get_db_session() as session:
        medication = session.query(CarePlanMedication).filter(
            CarePlanMedication.medication_id == medication_id,
            CarePlanMedication.tenant_id == tenant_id,
            CarePlanMedication.delete_flag != 'Y'
        ).first()

        if medication:
            return as_dict(medication)
        return None


def update_medication(medication_id: int, medication_data: dict,
                     tenant_id: str, user_id: str) -> bool:
    """
    Update medication
    """
    with get_db_session() as session:
        medication = session.query(CarePlanMedication).filter(
            CarePlanMedication.medication_id == medication_id,
            CarePlanMedication.tenant_id == tenant_id,
            CarePlanMedication.delete_flag != 'Y'
        ).first()

        if not medication:
            return False

        # Update fields
        for key in ['medication_name', 'dosage', 'frequency', 'time_slots', 'notes']:
            if key in medication_data:
                setattr(medication, key, medication_data[key])

        medication.updated_by = user_id
        session.commit()

        logger.info(f"Updated medication: {medication_id}")
        return True


def update_medication_for_patient(
    medical_record_no: str,
    medication_id: int,
    tenant_id: str,
    user_id: str,
    medication_name: Optional[str] = None,
    dosage: Optional[str] = None,
    frequency: Optional[str] = None,
    time_slots: Optional[List[str]] = None,
    notes: Optional[str] = None
) -> dict:
    """
    Update medication after validating patient ownership and fields
    """
    patient = get_patient_by_medical_record_no(medical_record_no, tenant_id)
    if not patient:
        return {"success": False, "error": "Patient not found", "medical_record_no": medical_record_no}

    medication = get_medication_by_id(medication_id, tenant_id)
    if not medication:
        return {"success": False, "error": "Medication not found", "medication_id": medication_id}

    plan = get_care_plan_by_id(medication.get("plan_id"), tenant_id)
    if not plan or plan.get("patient_id") != patient.get("patient_id"):
        return {
            "success": False,
            "error": "Medication does not belong to this patient",
            "medication_id": medication_id,
            "medical_record_no": medical_record_no
        }

    update_data: Dict[str, Any] = {}
    if medication_name is not None:
        update_data["medication_name"] = medication_name
    if dosage is not None:
        update_data["dosage"] = dosage
    if frequency is not None:
        update_data["frequency"] = frequency
    if time_slots is not None:
        update_data["time_slots"] = time_slots
    if notes is not None:
        update_data["notes"] = notes

    if not update_data:
        return {"success": False, "error": "No fields to update"}

    success = update_medication(medication_id, update_data, tenant_id, user_id)
    if not success:
        return {"success": False, "error": "Failed to update medication", "medication_id": medication_id}

    return {
        "success": True,
        "medication_id": medication_id,
        "plan_id": medication.get("plan_id"),
        "patient_id": patient.get("patient_id"),
        "medical_record_no": medical_record_no,
        "updated_fields": list(update_data.keys())
    }


def delete_medication(medication_id: int, tenant_id: str, user_id: str) -> bool:
    """
    Hard delete medication
    """
    with get_db_session() as session:
        medication = session.query(CarePlanMedication).filter(
            CarePlanMedication.medication_id == medication_id,
            CarePlanMedication.tenant_id == tenant_id
        ).first()
 
        if not medication:
            return False
 
        session.delete(medication)
        session.commit()
 
        logger.info(f"Hard deleted medication: {medication_id}")
        return True


# ============================================================================
# Task Operations
# ============================================================================

def create_task(task_data: dict, tenant_id: str, user_id: str) -> dict:
    """
    Create a task entry for a care plan
    """
    with get_db_session() as session:
        new_task = CarePlanTask(
            plan_id=task_data.get('plan_id'),
            task_title=task_data.get('task_title'),
            task_description=task_data.get('task_description'),
            task_category=task_data.get('task_category'),
            frequency=task_data.get('frequency'),
            duration=task_data.get('duration'),
            tenant_id=tenant_id,
            created_by=user_id,
            updated_by=user_id,
            delete_flag='N'
        )

        session.add(new_task)
        session.flush()

        task_id = new_task.task_id
        session.commit()

        logger.info(f"Created task: {task_id} for plan: {task_data.get('plan_id')}")
        return {"task_id": task_id}


def list_tasks_by_plan(plan_id: int, tenant_id: str) -> List[dict]:
    """
    List all tasks for a specific care plan
    """
    with get_db_session() as session:
        tasks = session.query(CarePlanTask).filter(
            CarePlanTask.plan_id == plan_id,
            CarePlanTask.tenant_id == tenant_id,
            CarePlanTask.delete_flag != 'Y'
        ).all()

        return [as_dict(task) for task in tasks]


def get_task_by_id(task_id: int, tenant_id: str) -> Optional[dict]:
    """
    Get task by ID
    """
    with get_db_session() as session:
        task = session.query(CarePlanTask).filter(
            CarePlanTask.task_id == task_id,
            CarePlanTask.tenant_id == tenant_id,
            CarePlanTask.delete_flag != 'Y'
        ).first()

        if task:
            return as_dict(task)
        return None


def update_task(task_id: int, task_data: dict, tenant_id: str, user_id: str) -> bool:
    """
    Update task
    """
    with get_db_session() as session:
        task = session.query(CarePlanTask).filter(
            CarePlanTask.task_id == task_id,
            CarePlanTask.tenant_id == tenant_id,
            CarePlanTask.delete_flag != 'Y'
        ).first()

        if not task:
            return False

        # Update fields
        for key in ['task_title', 'task_description', 'task_category', 'frequency', 'duration']:
            if key in task_data:
                setattr(task, key, task_data[key])

        task.updated_by = user_id
        session.commit()

        logger.info(f"Updated task: {task_id}")
        return True


def update_task_for_patient(
    medical_record_no: str,
    task_id: int,
    tenant_id: str,
    user_id: str,
    task_title: Optional[str] = None,
    task_description: Optional[str] = None,
    task_category: Optional[str] = None,
    frequency: Optional[str] = None,
    duration: Optional[str] = None
) -> dict:
    """
    Update task after validating patient ownership and fields
    """
    patient = get_patient_by_medical_record_no(medical_record_no, tenant_id)
    if not patient:
        return {"success": False, "error": "Patient not found", "medical_record_no": medical_record_no}

    task = get_task_by_id(task_id, tenant_id)
    if not task:
        return {"success": False, "error": "Task not found", "task_id": task_id}

    plan = get_care_plan_by_id(task.get("plan_id"), tenant_id)
    if not plan or plan.get("patient_id") != patient.get("patient_id"):
        return {
            "success": False,
            "error": "Task does not belong to this patient",
            "task_id": task_id,
            "medical_record_no": medical_record_no
        }

    update_data: Dict[str, Any] = {}
    if task_title is not None:
        update_data["task_title"] = task_title
    if task_description is not None:
        update_data["task_description"] = task_description
    if task_category is not None:
        update_data["task_category"] = task_category
    if frequency is not None:
        update_data["frequency"] = frequency
    if duration is not None:
        update_data["duration"] = duration

    if not update_data:
        return {"success": False, "error": "No fields to update"}

    success = update_task(task_id, update_data, tenant_id, user_id)
    if not success:
        return {"success": False, "error": "Failed to update task", "task_id": task_id}

    return {
        "success": True,
        "task_id": task_id,
        "plan_id": task.get("plan_id"),
        "patient_id": patient.get("patient_id"),
        "medical_record_no": medical_record_no,
        "updated_fields": list(update_data.keys())
    }


def delete_task(task_id: int, tenant_id: str, user_id: str) -> bool:
    """
    Hard delete task
    """
    with get_db_session() as session:
        task = session.query(CarePlanTask).filter(
            CarePlanTask.task_id == task_id,
            CarePlanTask.tenant_id == tenant_id
        ).first()
 
        if not task:
            return False
 
        session.delete(task)
        session.commit()
 
        logger.info(f"Hard deleted task: {task_id}")
        return True


# ============================================================================
# Precaution Operations
# ============================================================================

def create_precaution(precaution_data: dict, tenant_id: str, user_id: str) -> dict:
    """
    Create a precaution entry for a care plan
    """
    with get_db_session() as session:
        new_precaution = CarePlanPrecaution(
            plan_id=precaution_data.get('plan_id'),
            precaution_content=precaution_data.get('precaution_content'),
            priority=precaution_data.get('priority', 'medium'),
            tenant_id=tenant_id,
            created_by=user_id,
            updated_by=user_id,
            delete_flag='N'
        )

        session.add(new_precaution)
        session.flush()

        precaution_id = new_precaution.precaution_id
        session.commit()

        logger.info(f"Created precaution: {precaution_id} for plan: {precaution_data.get('plan_id')}")
        return {"precaution_id": precaution_id}


def list_precautions_by_plan(plan_id: int, tenant_id: str) -> List[dict]:
    """
    List all precautions for a specific care plan
    """
    with get_db_session() as session:
        precautions = session.query(CarePlanPrecaution).filter(
            CarePlanPrecaution.plan_id == plan_id,
            CarePlanPrecaution.tenant_id == tenant_id,
            CarePlanPrecaution.delete_flag != 'Y'
        ).all()

        return [as_dict(precaution) for precaution in precautions]


def get_precaution_by_id(precaution_id: int, tenant_id: str) -> Optional[dict]:
    """
    Get precaution by ID
    """
    with get_db_session() as session:
        precaution = session.query(CarePlanPrecaution).filter(
            CarePlanPrecaution.precaution_id == precaution_id,
            CarePlanPrecaution.tenant_id == tenant_id,
            CarePlanPrecaution.delete_flag != 'Y'
        ).first()

        if precaution:
            return as_dict(precaution)
        return None


def update_precaution(precaution_id: int, precaution_data: dict,
                      tenant_id: str, user_id: str) -> bool:
    """
    Update precaution
    """
    with get_db_session() as session:
        precaution = session.query(CarePlanPrecaution).filter(
            CarePlanPrecaution.precaution_id == precaution_id,
            CarePlanPrecaution.tenant_id == tenant_id,
            CarePlanPrecaution.delete_flag != 'Y'
        ).first()

        if not precaution:
            return False

        for key in ['precaution_content', 'priority']:
            if key in precaution_data:
                setattr(precaution, key, precaution_data[key])

        precaution.updated_by = user_id
        session.commit()

        logger.info(f"Updated precaution: {precaution_id}")
        return True


def update_precaution_for_patient(
    medical_record_no: str,
    precaution_id: int,
    tenant_id: str,
    user_id: str,
    precaution_content: Optional[str] = None,
    priority: Optional[str] = None
) -> dict:
    """
    Update precaution after validating patient ownership and fields
    """
    patient = get_patient_by_medical_record_no(medical_record_no, tenant_id)
    if not patient:
        return {"success": False, "error": "Patient not found", "medical_record_no": medical_record_no}

    precaution = get_precaution_by_id(precaution_id, tenant_id)
    if not precaution:
        return {"success": False, "error": "Precaution not found", "precaution_id": precaution_id}

    plan = get_care_plan_by_id(precaution.get("plan_id"), tenant_id)
    if not plan or plan.get("patient_id") != patient.get("patient_id"):
        return {
            "success": False,
            "error": "Precaution does not belong to this patient",
            "precaution_id": precaution_id,
            "medical_record_no": medical_record_no
        }

    update_data: Dict[str, Any] = {}
    if precaution_content is not None:
        update_data["precaution_content"] = precaution_content
    if priority is not None:
        update_data["priority"] = priority

    if not update_data:
        return {"success": False, "error": "No fields to update"}

    success = update_precaution(precaution_id, update_data, tenant_id, user_id)
    if not success:
        return {"success": False, "error": "Failed to update precaution", "precaution_id": precaution_id}

    return {
        "success": True,
        "precaution_id": precaution_id,
        "plan_id": precaution.get("plan_id"),
        "patient_id": patient.get("patient_id"),
        "medical_record_no": medical_record_no,
        "updated_fields": list(update_data.keys())
    }


def delete_precaution(precaution_id: int, tenant_id: str, user_id: str) -> bool:
    """
    Hard delete precaution
    """
    with get_db_session() as session:
        precaution = session.query(CarePlanPrecaution).filter(
            CarePlanPrecaution.precaution_id == precaution_id,
            CarePlanPrecaution.tenant_id == tenant_id
        ).first()
 
        if not precaution:
            return False
 
        session.delete(precaution)
        session.commit()
 
        logger.info(f"Hard deleted precaution: {precaution_id}")
        return True


# ============================================================================
# Completion Record Operations
# ============================================================================

def record_completion(completion_data: dict, tenant_id: str, user_id: str) -> dict:
    """
    Record completion status for a medication or task
    """
    with get_db_session() as session:
        # Check if record already exists for this date and item
        existing = session.query(CarePlanCompletion).filter(
            CarePlanCompletion.plan_id == completion_data.get('plan_id'),
            CarePlanCompletion.patient_id == completion_data.get('patient_id'),
            CarePlanCompletion.record_date == completion_data.get('record_date'),
            CarePlanCompletion.item_type == completion_data.get('item_type'),
            CarePlanCompletion.item_id == completion_data.get('item_id'),
            CarePlanCompletion.tenant_id == tenant_id,
            CarePlanCompletion.delete_flag != 'Y'
        ).first()

        if existing:
            # Update existing record
            existing.completed = completion_data.get('completed', False)
            if completion_data.get('completed'):
                existing.completion_time = datetime.now()
            existing.notes = completion_data.get('notes')
            existing.updated_by = user_id
            session.commit()

            logger.info(f"Updated completion record: {existing.completion_id}")
            return {"completion_id": existing.completion_id}
        else:
            # Create new record
            new_completion = CarePlanCompletion(
                plan_id=completion_data.get('plan_id'),
                patient_id=completion_data.get('patient_id'),
                record_date=completion_data.get('record_date'),
                item_type=completion_data.get('item_type'),
                item_id=completion_data.get('item_id'),
                completed=completion_data.get('completed', False),
                completion_time=datetime.now() if completion_data.get('completed') else None,
                notes=completion_data.get('notes'),
                tenant_id=tenant_id,
                created_by=user_id,
                updated_by=user_id,
                delete_flag='N'
            )

            session.add(new_completion)
            session.flush()

            completion_id = new_completion.completion_id
            session.commit()

            logger.info(f"Created completion record: {completion_id}")
            return {"completion_id": completion_id}


def get_completion_records(plan_id: int, patient_id: int, record_date: str,
                          tenant_id: str) -> List[dict]:
    """
    Get completion records for a specific plan, patient and date
    """
    with get_db_session() as session:
        records = session.query(CarePlanCompletion).filter(
            CarePlanCompletion.plan_id == plan_id,
            CarePlanCompletion.patient_id == patient_id,
            CarePlanCompletion.record_date == record_date,
            CarePlanCompletion.tenant_id == tenant_id,
            CarePlanCompletion.delete_flag != 'Y'
        ).all()

        return [as_dict(record) for record in records]


def get_completion_stats(plan_id: int, patient_id: int, start_date: str,
                        end_date: str, tenant_id: str) -> dict:
    """
    Get completion statistics for a date range
    """
    with get_db_session() as session:
        records = session.query(CarePlanCompletion).filter(
            CarePlanCompletion.plan_id == plan_id,
            CarePlanCompletion.patient_id == patient_id,
            CarePlanCompletion.record_date >= start_date,
            CarePlanCompletion.record_date <= end_date,
            CarePlanCompletion.tenant_id == tenant_id,
            CarePlanCompletion.delete_flag != 'Y'
        ).all()

        total_items = len(records)
        completed_items = sum(1 for r in records if r.completed)

        medication_records = [r for r in records if r.item_type == 'medication']
        task_records = [r for r in records if r.item_type == 'task']

        medication_completed = sum(1 for r in medication_records if r.completed)
        task_completed = sum(1 for r in task_records if r.completed)

        return {
            "total_items": total_items,
            "completed_items": completed_items,
            "completion_rate": round(completed_items / total_items * 100) if total_items > 0 else 0,
            "medication_total": len(medication_records),
            "medication_completed": medication_completed,
            "medication_compliance": round(medication_completed / len(medication_records) * 100) if medication_records else 0,
            "task_total": len(task_records),
            "task_completed": task_completed,
            "task_completion_rate": round(task_completed / len(task_records) * 100) if task_records else 0
        }


# ============================================================================
# Combined Operations
# ============================================================================

def get_care_plan_with_details(plan_id: int, tenant_id: str) -> Optional[dict]:
    """
    Get care plan with all related medications, tasks, and precautions
    """
    plan = get_care_plan_by_id(plan_id, tenant_id)
    if not plan:
        return None

    plan['medications'] = list_medications_by_plan(plan_id, tenant_id)
    plan['tasks'] = list_tasks_by_plan(plan_id, tenant_id)
    plan['precautions'] = list_precautions_by_plan(plan_id, tenant_id)

    return plan


def create_care_plan_from_medical_order(
    plan_data: dict,
    medications: List[dict],
    tasks: List[dict],
    precautions: List[dict],
    tenant_id: str,
    user_id: str
) -> dict:
    """
    Create a care plan with all related medications, tasks, and precautions in one transaction.
    Used when importing medical order data from parsed documents.

    Args:
        plan_data: Care plan basic information
        medications: List of medication data
        tasks: List of task data
        precautions: List of precaution data
        tenant_id: Tenant ID
        user_id: User ID

    Returns:
        Dict with plan_id and counts of created items
    """
    with get_db_session() as session:
        # Step 1: Create the care plan
        new_plan = CarePlan(
            patient_id=plan_data.get('patient_id'),
            plan_name=plan_data.get('plan_name'),
            plan_description=plan_data.get('plan_description'),
            start_date=plan_data.get('start_date'),
            end_date=plan_data.get('end_date'),
            status=plan_data.get('status', 'active'),
            doctor_id=user_id,
            tenant_id=tenant_id,
            created_by=user_id,
            updated_by=user_id,
            delete_flag='N'
        )

        session.add(new_plan)
        session.flush()  # Get plan_id

        plan_id = new_plan.plan_id

        # Step 2: Create medications
        medication_count = 0
        for med_data in medications:
            new_medication = CarePlanMedication(
                plan_id=plan_id,
                medication_name=med_data.get('medication_name'),
                dosage=med_data.get('dosage'),
                frequency=med_data.get('frequency'),
                time_slots=med_data.get('time_slots', []),
                notes=med_data.get('notes'),
                tenant_id=tenant_id,
                created_by=user_id,
                updated_by=user_id,
                delete_flag='N'
            )
            session.add(new_medication)
            medication_count += 1

        # Step 3: Create tasks
        task_count = 0
        for task_data in tasks:
            new_task = CarePlanTask(
                plan_id=plan_id,
                task_title=task_data.get('task_title'),
                task_description=task_data.get('task_description'),
                task_category=task_data.get('task_category'),
                frequency=task_data.get('frequency'),
                duration=task_data.get('duration'),
                tenant_id=tenant_id,
                created_by=user_id,
                updated_by=user_id,
                delete_flag='N'
            )
            session.add(new_task)
            task_count += 1

        # Step 4: Create precautions
        precaution_count = 0
        for precaution_data in precautions:
            new_precaution = CarePlanPrecaution(
                plan_id=plan_id,
                precaution_content=precaution_data.get('precaution_content'),
                priority=precaution_data.get('priority', 'medium'),
                tenant_id=tenant_id,
                created_by=user_id,
                updated_by=user_id,
                delete_flag='N'
            )
            session.add(new_precaution)
            precaution_count += 1

        session.commit()

        logger.info(f"Created care plan {plan_id} with {medication_count} medications, {task_count} tasks, {precaution_count} precautions")

        return {
            "plan_id": plan_id,
            "medication_count": medication_count,
            "task_count": task_count,
            "precaution_count": precaution_count
        }
