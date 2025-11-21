import logging
from typing import List, Dict, Optional
from consts.exceptions import AgentRunException
from database import patient_db
 
logger = logging.getLogger(__name__)
 
 
# ============================================================================
# Patient Basic Info Services
# ============================================================================
 
async def create_patient_record(patient_data: dict, tenant_id: str, user_id: str) -> dict:
    """
    Create a new patient record
    """
    try:
        # Validate required fields
        required_fields = ['name', 'gender', 'age', 'medical_record_no']
        for field in required_fields:
            if not patient_data.get(field):
                raise ValueError(f"Missing required field: {field}")
 
        result = patient_db.create_patient(patient_data, tenant_id, user_id)
        return {
            "success": True,
            "patient_id": result['patient_id'],
            "message": "Patient created successfully"
        }
    except Exception as e:
        logger.error(f"Failed to create patient: {str(e)}")
        raise AgentRunException(f"Failed to create patient: {str(e)}")
 
 
async def get_patient_info(patient_id: int, tenant_id: str) -> Optional[dict]:
    """
    Get patient information by ID
    """
    try:
        patient = patient_db.get_patient_by_id(patient_id, tenant_id)
        if not patient:
            return None
 
        return patient
    except Exception as e:
        logger.error(f"Failed to get patient info: {str(e)}")
        raise AgentRunException(f"Failed to get patient info: {str(e)}")
 
 
async def get_patient_by_email_service(email: str, tenant_id: str) -> Optional[dict]:
    """
    Get patient information by email address
    """
    try:
        patient = patient_db.get_patient_by_email(email, tenant_id)
        if not patient:
            return None

        return patient
    except Exception as e:
        logger.error(f"Failed to get patient by email: {str(e)}")
        raise AgentRunException(f"Failed to get patient by email: {str(e)}")


async def list_patients_service(tenant_id: str, search_query: Optional[str] = None,
                                filter_type: Optional[str] = None,
                                limit: int = 100, offset: int = 0) -> List[dict]:
    """
    List patients with search and filters
    """
    try:
        patients = patient_db.list_patients(tenant_id, search_query, filter_type, limit, offset)
        return patients
    except Exception as e:
        logger.error(f"Failed to list patients: {str(e)}")
        raise AgentRunException(f"Failed to list patients: {str(e)}")
 
 
async def update_patient_info(patient_id: int, patient_data: dict, tenant_id: str, user_id: str) -> dict:
    """
    Update patient information
    """
    try:
        success = patient_db.update_patient(patient_id, patient_data, tenant_id, user_id)
        if not success:
            raise ValueError("Patient not found")
 
        return {
            "success": True,
            "message": "Patient updated successfully"
        }
    except Exception as e:
        logger.error(f"Failed to update patient: {str(e)}")
        raise AgentRunException(f"Failed to update patient: {str(e)}")
 
 
async def delete_patient_record(patient_id: int, tenant_id: str, user_id: str) -> dict:
    """
    Delete patient record (soft delete)
    """
    try:
        success = patient_db.delete_patient(patient_id, tenant_id, user_id)
        if not success:
            raise ValueError("Patient not found")
 
        return {
            "success": True,
            "message": "Patient deleted successfully"
        }
    except Exception as e:
        logger.error(f"Failed to delete patient: {str(e)}")
        raise AgentRunException(f"Failed to delete patient: {str(e)}")
 
 
# ============================================================================
# Patient Timeline Services
# ============================================================================
 
async def create_timeline_stage_service(timeline_data: dict, tenant_id: str, user_id: str) -> dict:
    """
    Create a new timeline stage for a patient
    """
    try:
        # Validate required fields
        required_fields = ['patient_id', 'stage_type', 'stage_date', 'stage_title']
        for field in required_fields:
            if not timeline_data.get(field):
                raise ValueError(f"Missing required field: {field}")
 
        result = patient_db.create_timeline_stage(timeline_data, tenant_id, user_id)
        return {
            "success": True,
            "timeline_id": result['timeline_id'],
            "message": "Timeline stage created successfully"
        }
    except Exception as e:
        logger.error(f"Failed to create timeline stage: {str(e)}")
        raise AgentRunException(f"Failed to create timeline stage: {str(e)}")
 
 
async def get_patient_timeline_service(patient_id: int, tenant_id: str) -> List[dict]:
    """
    Get complete timeline for a patient
    """
    try:
        timelines = patient_db.get_patient_timeline(patient_id, tenant_id)
        return timelines
    except Exception as e:
        logger.error(f"Failed to get patient timeline: {str(e)}")
        raise AgentRunException(f"Failed to get patient timeline: {str(e)}")
 
 
async def get_timeline_detail_service(timeline_id: int, tenant_id: str) -> Optional[dict]:
    """
    Get detailed information for a specific timeline stage
    """
    try:
        detail = patient_db.get_timeline_detail(timeline_id, tenant_id)
        return detail
    except Exception as e:
        logger.error(f"Failed to get timeline detail: {str(e)}")
        raise AgentRunException(f"Failed to get timeline detail: {str(e)}")
 
 
async def create_timeline_detail_service(detail_data: dict, tenant_id: str, user_id: str) -> dict:
    """
    Create or update timeline detail information
    """
    try:
        if not detail_data.get('timeline_id'):
            raise ValueError("Missing required field: timeline_id")
 
        result = patient_db.create_timeline_detail(detail_data, tenant_id, user_id)
        return {
            "success": True,
            "detail_id": result['detail_id'],
            "message": "Timeline detail saved successfully"
        }
    except Exception as e:
        logger.error(f"Failed to save timeline detail: {str(e)}")
        raise AgentRunException(f"Failed to save timeline detail: {str(e)}")

 
# ============================================================================
# Medical Image Services
# ============================================================================
 
async def upload_medical_image_service(image_data: dict, tenant_id: str, user_id: str) -> dict:
    """
    Create a medical image record
    Note: This only creates the database record. Image upload to MinIO should be handled separately.
    """
    try:
        required_fields = ['timeline_id', 'image_type', 'image_label', 'image_url']
        for field in required_fields:
            if not image_data.get(field):
                raise ValueError(f"Missing required field: {field}")
        result = patient_db.create_medical_image(image_data, tenant_id, user_id)
        return {
            "success": True,
            "image_id": result['image_id'],
            "message": "Medical image record created successfully"
        }
    except Exception as e:
        logger.error(f"Failed to create medical image record: {str(e)}")
        raise AgentRunException(f"Failed to create medical image record: {str(e)}")
 
 
# ============================================================================
# Metrics Services
# ============================================================================
 
async def batch_create_metrics_service(metrics_data: List[dict], tenant_id: str, user_id: str) -> dict:
    """
    Batch create patient metrics
    """
    try:
        if not metrics_data or not isinstance(metrics_data, list):
            raise ValueError("metrics_data must be a non-empty list")
 
        result = patient_db.batch_create_metrics(metrics_data, tenant_id, user_id)
        return {
            "success": True,
            "created_count": result['created_count'],
            "message": f"Created {result['created_count']} metrics successfully"
        }
    except Exception as e:
        logger.error(f"Failed to batch create metrics: {str(e)}")
        raise AgentRunException(f"Failed to batch create metrics: {str(e)}")
 
 
# ============================================================================
# Patient Todo Services
# ============================================================================
 
async def create_patient_todo_service(todo_data: dict, tenant_id: str, user_id: str) -> dict:
    """
    Create a patient todo item
    """
    try:
        required_fields = ['patient_id', 'todo_title', 'todo_type', 'due_date']
        for field in required_fields:
            if not todo_data.get(field):
                raise ValueError(f"Missing required field: {field}")
 
        result = patient_db.create_patient_todo(todo_data, tenant_id, user_id)
        return {
            "success": True,
            "todo_id": result['todo_id'],
            "message": "Todo created successfully"
        }
    except Exception as e:
        logger.error(f"Failed to create todo: {str(e)}")
        raise AgentRunException(f"Failed to create todo: {str(e)}")
 
 
async def get_patient_todos_service(patient_id: int, tenant_id: str, status: Optional[str] = None) -> List[dict]:
    """
    Get patient todos with optional status filter
    """
    try:
        todos = patient_db.get_patient_todos(patient_id, tenant_id, status)
        return todos
    except Exception as e:
        logger.error(f"Failed to get patient todos: {str(e)}")
        raise AgentRunException(f"Failed to get patient todos: {str(e)}")
 
 
async def update_todo_status_service(todo_id: int, status: str, tenant_id: str, user_id: str) -> dict:
    """
    Update todo status
    """
    try:
        valid_statuses = ['pending', 'completed', 'overdue']
        if status not in valid_statuses:
            raise ValueError(f"Invalid status. Must be one of: {', '.join(valid_statuses)}")

        success = patient_db.update_todo_status(todo_id, status, tenant_id, user_id)

        if not success:
            raise ValueError("Todo not found")

        return {
            "success": True,
            "message": "Todo status updated successfully"
        }
    except Exception as e:
        logger.error(f"Failed to update todo status: {str(e)}")
        raise AgentRunException(f"Failed to update todo status: {str(e)}")

 

 

async def delete_timeline_service(timeline_id: int, tenant_id: str, user_id: str) -> dict:
    """
    Delete a timeline stage (soft delete)
    """
    try:
        success = patient_db.delete_timeline(timeline_id, tenant_id, user_id)

        if not success:
            raise ValueError("Timeline not found")

        return {
            "success": True,
            "message": "Timeline deleted successfully"
        }
    except Exception as e:
        logger.error(f"Failed to delete timeline: {str(e)}")
        raise AgentRunException(f"Failed to delete timeline: {str(e)}")

 

 

async def delete_patient_todo_service(todo_id: int, tenant_id: str, user_id: str) -> dict:
    """
    Delete a patient todo item (soft delete)
    """
    try:
        success = patient_db.delete_patient_todo(todo_id, tenant_id, user_id)

        if not success:
            raise ValueError("Todo not found")

        return {
            "success": True,
            "message": "Todo deleted successfully"
        }
    except Exception as e:
        logger.error(f"Failed to delete todo: {str(e)}")
        raise AgentRunException(f"Failed to delete todo: {str(e)}")


async def delete_timeline_images_service(timeline_id: int, tenant_id: str, user_id: str) -> dict:
    """
    Delete all images for a timeline (soft delete)
    """
    try:
        success = patient_db.delete_timeline_images(timeline_id, tenant_id, user_id)
        return {
            "success": True,
            "message": "Timeline images deleted successfully"
        }
    except Exception as e:
        logger.error(f"Failed to delete timeline images: {str(e)}")
        raise AgentRunException(f"Failed to delete timeline images: {str(e)}")
 
 
async def delete_timeline_metrics_service(timeline_id: int, tenant_id: str, user_id: str) -> dict:
    """
    Delete all metrics for a timeline (soft delete)
    """
    try:
        success = patient_db.delete_timeline_metrics(timeline_id, tenant_id, user_id)
        return {
            "success": True,
            "message": "Timeline metrics deleted successfully"
        }
    except Exception as e:
        logger.error(f"Failed to delete timeline metrics: {str(e)}")
        raise AgentRunException(f"Failed to delete timeline metrics: {str(e)}")


async def create_attachment_service(attachment_data: dict, tenant_id: str, user_id: str) -> dict:
    """
    Create a new attachment record
    """
    try:
        result = patient_db.create_attachment(attachment_data, tenant_id, user_id)
        return {
            "success": True,
            "attachment_id": result['attachment_id'],
            "message": "Attachment created successfully"
        }
    except Exception as e:
        logger.error(f"Failed to create attachment: {str(e)}")
        raise AgentRunException(f"Failed to create attachment: {str(e)}")

async def delete_attachment_service(attachment_id: int, tenant_id: str, user_id: str) -> dict:
    """
    Delete an attachment record
    """
    try:
        success = patient_db.delete_attachment(attachment_id, tenant_id, user_id)
        return {
            "success": True,
            "message": "Attachment deleted successfully"
        }
    except Exception as e:
        logger.error(f"Failed to delete attachment: {str(e)}")
        raise AgentRunException(f"Failed to delete attachment: {str(e)}")