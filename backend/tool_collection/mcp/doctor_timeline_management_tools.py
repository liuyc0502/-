"""
Doctor Timeline Management Tools - Atomic MCP Tools
Timeline event creation, update, deletion and related operations for doctors.
"""
import logging
from typing import Optional, Dict, Any, List
from fastmcp import FastMCP
from consts.const import DEFAULT_TENANT_ID
from database.patient_db import (
    create_timeline_stage,
    create_timeline_detail,
    create_medical_image,
    batch_create_metrics,
    create_attachment,
    delete_timeline,
    delete_timeline_images,
    delete_timeline_metrics,
    delete_timeline_attachments
)

logger = logging.getLogger(__name__)
doctor_timeline_mgmt_tools = FastMCP("doctor_timeline_management")


@doctor_timeline_mgmt_tools.tool()
async def create_timeline_event(
    patient_id: str,
    stage_type: str,
    stage_date: str,
    stage_title: str,
    diagnosis: Optional[str] = None,
    status: str = "completed",
    display_order: int = 0,
    tenant_id: Optional[str] = None,
    user_id: Optional[str] = None
) -> Dict[str, Any]:
    """Create a new timeline event (surgery, test, procedure). Returns timeline_id for adding details/images/metrics."""
    try:
        tenant = tenant_id or DEFAULT_TENANT_ID
        creator = user_id or "system"

        timeline_data = {
            "patient_id": int(patient_id),
            "stage_type": stage_type,
            "stage_date": stage_date,
            "stage_title": stage_title,
            "diagnosis": diagnosis,
            "status": status,
            "display_order": display_order
        }

        result = create_timeline_stage(timeline_data, tenant, creator)

        logger.info(f"Created timeline event {result['timeline_id']} for patient {patient_id}")

        return {
            "success": True,
            "timeline_id": result["timeline_id"],
            "patient_id": patient_id,
            "stage_type": stage_type,
            "message": f"Successfully created timeline event: {stage_title}"
        }

    except Exception as e:
        logger.error(f"Error creating timeline event: {str(e)}")
        return {"success": False, "error": str(e)}


@doctor_timeline_mgmt_tools.tool()
async def save_timeline_detail(
    timeline_id: str,
    doctor_notes: Optional[str] = None,
    pathology_findings: Optional[str] = None,
    patient_summary: Optional[str] = None,
    patient_suggestions: Optional[List[str]] = None,
    medications: Optional[List[str]] = None,
    tenant_id: Optional[str] = None,
    user_id: Optional[str] = None
) -> Dict[str, Any]:
    """Save or update detailed information for a timeline event."""
    try:
        tenant = tenant_id or DEFAULT_TENANT_ID
        saver = user_id or "system"

        detail_data = {"timeline_id": int(timeline_id)}

        if doctor_notes is not None:
            detail_data["doctor_notes"] = doctor_notes
        if pathology_findings is not None:
            detail_data["pathology_findings"] = pathology_findings
        if patient_summary is not None:
            detail_data["patient_summary"] = patient_summary
        if patient_suggestions is not None:
            detail_data["patient_suggestions"] = patient_suggestions
        if medications is not None:
            detail_data["medications"] = medications

        result = create_timeline_detail(detail_data, tenant, saver)

        logger.info(f"Saved detail {result['detail_id']} for timeline {timeline_id}")

        return {
            "success": True,
            "detail_id": result["detail_id"],
            "timeline_id": timeline_id,
            "message": "Timeline details saved successfully"
        }

    except Exception as e:
        logger.error(f"Error saving timeline detail: {str(e)}")
        return {"success": False, "error": str(e)}


@doctor_timeline_mgmt_tools.tool()
async def save_timeline_metrics(
    timeline_id: str,
    metrics: List[Dict[str, Any]],
    tenant_id: Optional[str] = None,
    user_id: Optional[str] = None
) -> Dict[str, Any]:
    """Batch save lab metrics. Each: {metric_name, metric_value, metric_unit?, normal_range_min?, normal_range_max?, metric_status?}"""
    try:
        tenant = tenant_id or DEFAULT_TENANT_ID
        saver = user_id or "system"

        metrics_data = [
            {"timeline_id": int(timeline_id), **metric}
            for metric in metrics
        ]

        result = batch_create_metrics(metrics_data, tenant, saver)

        logger.info(f"Saved {result['created_count']} metrics for timeline {timeline_id}")

        return {
            "success": True,
            "created_count": result["created_count"],
            "timeline_id": timeline_id,
            "message": f"Successfully saved {result['created_count']} metrics"
        }

    except Exception as e:
        logger.error(f"Error saving timeline metrics: {str(e)}")
        return {"success": False, "error": str(e)}


@doctor_timeline_mgmt_tools.tool()
async def upload_timeline_image(
    timeline_id: str,
    image_url: str,
    image_type: str,
    image_label: Optional[str] = None,
    thumbnail_url: Optional[str] = None,
    display_order: int = 0,
    tenant_id: Optional[str] = None,
    user_id: Optional[str] = None
) -> Dict[str, Any]:
    """Upload a medical image (CT/MRI/X-ray/pathology) to a timeline event."""
    try:
        tenant = tenant_id or DEFAULT_TENANT_ID
        uploader = user_id or "system"

        image_data = {
            "timeline_id": int(timeline_id),
            "image_url": image_url,
            "image_type": image_type,
            "image_label": image_label,
            "thumbnail_url": thumbnail_url,
            "display_order": display_order
        }

        result = create_medical_image(image_data, tenant, uploader)

        logger.info(f"Uploaded image {result['image_id']} to timeline {timeline_id}")

        return {
            "success": True,
            "image_id": result["image_id"],
            "timeline_id": timeline_id,
            "image_type": image_type,
            "message": "Image uploaded successfully"
        }

    except Exception as e:
        logger.error(f"Error uploading timeline image: {str(e)}")
        return {"success": False, "error": str(e)}


@doctor_timeline_mgmt_tools.tool()
async def upload_timeline_attachment(
    timeline_id: str,
    file_url: str,
    file_name: str,
    file_type: str,
    file_size: int = 0,
    tenant_id: Optional[str] = None,
    user_id: Optional[str] = None
) -> Dict[str, Any]:
    """Upload a file attachment (PDF reports, documents) to a timeline event."""
    try:
        tenant = tenant_id or DEFAULT_TENANT_ID
        uploader = user_id or "system"

        attachment_data = {
            "timeline_id": int(timeline_id),
            "file_url": file_url,
            "file_name": file_name,
            "file_type": file_type,
            "file_size": file_size
        }

        result = create_attachment(attachment_data, tenant, uploader)

        logger.info(f"Uploaded attachment {result['attachment_id']} to timeline {timeline_id}")

        return {
            "success": True,
            "attachment_id": result["attachment_id"],
            "timeline_id": timeline_id,
            "file_name": file_name,
            "message": "Attachment uploaded successfully"
        }

    except Exception as e:
        logger.error(f"Error uploading timeline attachment: {str(e)}")
        return {"success": False, "error": str(e)}


@doctor_timeline_mgmt_tools.tool()
async def delete_timeline_event(
    timeline_id: str,
    tenant_id: Optional[str] = None,
    user_id: Optional[str] = None
) -> Dict[str, Any]:
    """Delete a timeline event (hard delete). Use with caution."""
    try:
        tenant = tenant_id or DEFAULT_TENANT_ID
        deleter = user_id or "system"

        success = delete_timeline(int(timeline_id), tenant, deleter)

        if success:
            logger.info(f"Deleted timeline event {timeline_id}")
            return {"success": True, "timeline_id": timeline_id, "message": "Timeline event deleted successfully"}
        else:
            return {"success": False, "error": "Timeline event not found or deletion failed"}

    except Exception as e:
        logger.error(f"Error deleting timeline event: {str(e)}")
        return {"success": False, "error": str(e)}


@doctor_timeline_mgmt_tools.tool()
async def delete_timeline_images_all(
    timeline_id: str,
    tenant_id: Optional[str] = None,
    user_id: Optional[str] = None
) -> Dict[str, Any]:
    """Delete all images for a timeline event."""
    try:
        tenant = tenant_id or DEFAULT_TENANT_ID
        deleter = user_id or "system"

        success = delete_timeline_images(int(timeline_id), tenant, deleter)

        if success:
            logger.info(f"Deleted all images for timeline {timeline_id}")
            return {"success": True, "timeline_id": timeline_id, "message": "All timeline images deleted successfully"}
        else:
            return {"success": False, "error": "Timeline not found or deletion failed"}

    except Exception as e:
        logger.error(f"Error deleting timeline images: {str(e)}")
        return {"success": False, "error": str(e)}


@doctor_timeline_mgmt_tools.tool()
async def delete_timeline_metrics_all(
    timeline_id: str,
    tenant_id: Optional[str] = None,
    user_id: Optional[str] = None
) -> Dict[str, Any]:
    """Delete all metrics for a timeline event."""
    try:
        tenant = tenant_id or DEFAULT_TENANT_ID
        deleter = user_id or "system"

        success = delete_timeline_metrics(int(timeline_id), tenant, deleter)

        if success:
            logger.info(f"Deleted all metrics for timeline {timeline_id}")
            return {"success": True, "timeline_id": timeline_id, "message": "All timeline metrics deleted successfully"}
        else:
            return {"success": False, "error": "Timeline not found or deletion failed"}

    except Exception as e:
        logger.error(f"Error deleting timeline metrics: {str(e)}")
        return {"success": False, "error": str(e)}


@doctor_timeline_mgmt_tools.tool()
async def delete_timeline_attachments_all(
    timeline_id: str,
    tenant_id: Optional[str] = None,
    user_id: Optional[str] = None
) -> Dict[str, Any]:
    """Delete all attachments for a timeline event."""
    try:
        tenant = tenant_id or DEFAULT_TENANT_ID
        deleter = user_id or "system"

        success = delete_timeline_attachments(int(timeline_id), tenant, deleter)

        if success:
            logger.info(f"Deleted all attachments for timeline {timeline_id}")
            return {"success": True, "timeline_id": timeline_id, "message": "All timeline attachments deleted successfully"}
        else:
            return {"success": False, "error": "Timeline not found or deletion failed"}

    except Exception as e:
        logger.error(f"Error deleting timeline attachments: {str(e)}")
        return {"success": False, "error": str(e)}
