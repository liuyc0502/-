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
    """
    Create a new timeline event for a patient.

    Use this tool when:
    - Recording a new medical event (surgery, test, procedure)
    - Adding a report to patient timeline
    - Creating a new stage in patient's medical history

    Args:
        patient_id: Patient identifier (required)
        stage_type: Event type (required) - e.g., "手术记录", "病理报告", "血常规", "CT", "MRI"
        stage_date: Event date (required, format: YYYY-MM-DD)
        stage_title: Event title/name (required)
        diagnosis: Diagnosis at this stage, optional
        status: Event status (default "completed"), can be "pending", "completed", "cancelled"
        display_order: Display order for sorting (default 0)
        tenant_id: Tenant identifier (optional)
        user_id: Doctor creating the event (optional)

    Returns:
        - success: Whether creation was successful
        - timeline_id: New timeline event identifier (use for adding details/images/metrics)
        - patient_id: Patient identifier

    Next steps:
    - Call save_timeline_detail() to add detailed information
    - Call save_timeline_metrics() to add lab values
    - Call upload_timeline_image() to add medical images

    Example:
        result = create_timeline_event(
            patient_id="123",
            stage_type="手术记录",
            stage_date="2025-01-15",
            stage_title="左肺上叶切除术",
            diagnosis="肺腺癌"
        )
        timeline_id = result['timeline_id']
    """
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
        return {
            "success": False,
            "error": str(e)
        }


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
    """
    Save or update detailed information for a timeline event.

    Use this tool when:
    - Adding clinical notes to a timeline event
    - Recording pathology findings
    - Adding patient-friendly summary
    - Recording medications

    Args:
        timeline_id: Timeline event identifier (required)
        doctor_notes: Clinical notes from doctor, optional
        pathology_findings: Pathology report findings, optional
        patient_summary: Patient-friendly summary, optional
        patient_suggestions: List of suggestions for patient, optional
        medications: List of medications, optional
        tenant_id: Tenant identifier (optional)
        user_id: Doctor saving the detail (optional)

    Returns:
        - success: Whether save was successful
        - detail_id: Detail record identifier
        - timeline_id: Timeline event identifier

    Example:
        result = save_timeline_detail(
            timeline_id="456",
            pathology_findings="左肺上叶腺癌,浸润性,大小3.5×2.8cm...",
            patient_summary="病理报告确认为早期肺癌,预后良好",
            patient_suggestions=["按时服药", "定期复查", "戒烟"]
        )
    """
    try:
        tenant = tenant_id or DEFAULT_TENANT_ID
        saver = user_id or "system"

        detail_data = {
            "timeline_id": int(timeline_id)
        }

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
        return {
            "success": False,
            "error": str(e)
        }


@doctor_timeline_mgmt_tools.tool()
async def save_timeline_metrics(
    timeline_id: str,
    metrics: List[Dict[str, Any]],
    tenant_id: Optional[str] = None,
    user_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Batch save lab test metrics for a timeline event.

    Use this tool when:
    - Recording lab test results (blood test, etc.)
    - Saving multiple metric values at once
    - After OCR recognition of lab reports

    Args:
        timeline_id: Timeline event identifier (required)
        metrics: List of metric dictionaries (required), each containing:
          - metric_name: Short name (e.g., "WBC", "HGB") (required)
          - metric_full_name: Full name (e.g., "White Blood Cell Count"), optional
          - metric_value: Measured value (required)
          - metric_unit: Unit (e.g., "×10⁹/L"), optional
          - normal_range_min: Minimum normal value, optional
          - normal_range_max: Maximum normal value, optional
          - metric_status: "normal", "high", "low", optional
          - metric_trend: "up", "down", "stable", optional
        tenant_id: Tenant identifier (optional)
        user_id: Doctor saving the metrics (optional)

    Returns:
        - success: Whether save was successful
        - created_count: Number of metrics saved
        - timeline_id: Timeline event identifier

    Example:
        result = save_timeline_metrics(
            timeline_id="456",
            metrics=[
                {
                    "metric_name": "WBC",
                    "metric_full_name": "白细胞计数",
                    "metric_value": "6.2",
                    "metric_unit": "×10⁹/L",
                    "normal_range_min": "4.0",
                    "normal_range_max": "10.0",
                    "metric_status": "normal"
                },
                {
                    "metric_name": "HGB",
                    "metric_full_name": "血红蛋白",
                    "metric_value": "135",
                    "metric_unit": "g/L",
                    "normal_range_min": "120",
                    "normal_range_max": "160",
                    "metric_status": "normal"
                }
            ]
        )
    """
    try:
        tenant = tenant_id or DEFAULT_TENANT_ID
        saver = user_id or "system"

        # Add timeline_id to each metric
        metrics_data = [
            {
                "timeline_id": int(timeline_id),
                **metric
            }
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
        return {
            "success": False,
            "error": str(e)
        }


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
    """
    Upload a medical image to a timeline event.

    Use this tool when:
    - Uploading medical imaging (X-ray, CT, MRI, ultrasound)
    - Adding surgical photos
    - Attaching pathology slides

    Args:
        timeline_id: Timeline event identifier (required)
        image_url: URL of the uploaded image (required)
        image_type: Type of image (required) - e.g., "CT", "MRI", "X-ray", "病理切片", "术中照片"
        image_label: Description/label for the image, optional
        thumbnail_url: URL of thumbnail image, optional
        display_order: Display order for sorting (default 0)
        tenant_id: Tenant identifier (optional)
        user_id: Doctor uploading the image (optional)

    Returns:
        - success: Whether upload was successful
        - image_id: Image record identifier
        - timeline_id: Timeline event identifier

    Example:
        result = upload_timeline_image(
            timeline_id="456",
            image_url="https://storage.example.com/images/ct_001.jpg",
            image_type="CT",
            image_label="胸部CT扫描",
            thumbnail_url="https://storage.example.com/thumbs/ct_001_thumb.jpg"
        )
    """
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
        return {
            "success": False,
            "error": str(e)
        }


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
    """
    Upload a file attachment to a timeline event.

    Use this tool when:
    - Attaching PDF reports
    - Uploading original report files
    - Adding supplementary documents

    Args:
        timeline_id: Timeline event identifier (required)
        file_url: URL of the uploaded file (required)
        file_name: Original file name (required)
        file_type: File MIME type (required) - e.g., "application/pdf", "image/jpeg"
        file_size: File size in bytes (default 0)
        tenant_id: Tenant identifier (optional)
        user_id: Doctor uploading the file (optional)

    Returns:
        - success: Whether upload was successful
        - attachment_id: Attachment record identifier
        - timeline_id: Timeline event identifier

    Example:
        result = upload_timeline_attachment(
            timeline_id="456",
            file_url="https://storage.example.com/reports/lab_report_001.pdf",
            file_name="血常规报告.pdf",
            file_type="application/pdf",
            file_size=2048576
        )
    """
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
        return {
            "success": False,
            "error": str(e)
        }


@doctor_timeline_mgmt_tools.tool()
async def delete_timeline_event(
    timeline_id: str,
    tenant_id: Optional[str] = None,
    user_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Delete a timeline event (hard delete).

    Use this tool when:
    - Removing an incorrect or duplicate timeline event
    - Deleting test data

    WARNING: This is a hard delete operation. Use with caution.

    Args:
        timeline_id: Timeline event identifier (required)
        tenant_id: Tenant identifier (optional)
        user_id: Doctor performing deletion (optional)

    Returns:
        - success: Whether deletion was successful
        - timeline_id: Deleted timeline identifier

    Example:
        result = delete_timeline_event(timeline_id="456")
    """
    try:
        tenant = tenant_id or DEFAULT_TENANT_ID
        deleter = user_id or "system"

        success = delete_timeline(int(timeline_id), tenant, deleter)

        if success:
            logger.info(f"Deleted timeline event {timeline_id}")
            return {
                "success": True,
                "timeline_id": timeline_id,
                "message": "Timeline event deleted successfully"
            }
        else:
            return {
                "success": False,
                "error": "Timeline event not found or deletion failed"
            }

    except Exception as e:
        logger.error(f"Error deleting timeline event: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }


@doctor_timeline_mgmt_tools.tool()
async def delete_timeline_images_all(
    timeline_id: str,
    tenant_id: Optional[str] = None,
    user_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Delete all images for a timeline event.

    Use this tool when:
    - Removing all medical images from a timeline event
    - Cleaning up before re-uploading images

    Args:
        timeline_id: Timeline event identifier (required)
        tenant_id: Tenant identifier (optional)
        user_id: Doctor performing deletion (optional)

    Returns:
        - success: Whether deletion was successful
        - timeline_id: Timeline identifier

    Example:
        result = delete_timeline_images_all(timeline_id="456")
    """
    try:
        tenant = tenant_id or DEFAULT_TENANT_ID
        deleter = user_id or "system"

        success = delete_timeline_images(int(timeline_id), tenant, deleter)

        if success:
            logger.info(f"Deleted all images for timeline {timeline_id}")
            return {
                "success": True,
                "timeline_id": timeline_id,
                "message": "All timeline images deleted successfully"
            }
        else:
            return {
                "success": False,
                "error": "Timeline not found or deletion failed"
            }

    except Exception as e:
        logger.error(f"Error deleting timeline images: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }


@doctor_timeline_mgmt_tools.tool()
async def delete_timeline_metrics_all(
    timeline_id: str,
    tenant_id: Optional[str] = None,
    user_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Delete all metrics for a timeline event.

    Use this tool when:
    - Removing all lab test results from a timeline event
    - Cleaning up before re-saving metrics

    Args:
        timeline_id: Timeline event identifier (required)
        tenant_id: Tenant identifier (optional)
        user_id: Doctor performing deletion (optional)

    Returns:
        - success: Whether deletion was successful
        - timeline_id: Timeline identifier

    Example:
        result = delete_timeline_metrics_all(timeline_id="456")
    """
    try:
        tenant = tenant_id or DEFAULT_TENANT_ID
        deleter = user_id or "system"

        success = delete_timeline_metrics(int(timeline_id), tenant, deleter)

        if success:
            logger.info(f"Deleted all metrics for timeline {timeline_id}")
            return {
                "success": True,
                "timeline_id": timeline_id,
                "message": "All timeline metrics deleted successfully"
            }
        else:
            return {
                "success": False,
                "error": "Timeline not found or deletion failed"
            }

    except Exception as e:
        logger.error(f"Error deleting timeline metrics: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }


@doctor_timeline_mgmt_tools.tool()
async def delete_timeline_attachments_all(
    timeline_id: str,
    tenant_id: Optional[str] = None,
    user_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Delete all attachments for a timeline event.

    Use this tool when:
    - Removing all file attachments from a timeline event
    - Cleaning up before re-uploading files

    Args:
        timeline_id: Timeline event identifier (required)
        tenant_id: Tenant identifier (optional)
        user_id: Doctor performing deletion (optional)

    Returns:
        - success: Whether deletion was successful
        - timeline_id: Timeline identifier

    Example:
        result = delete_timeline_attachments_all(timeline_id="456")
    """
    try:
        tenant = tenant_id or DEFAULT_TENANT_ID
        deleter = user_id or "system"

        success = delete_timeline_attachments(int(timeline_id), tenant, deleter)

        if success:
            logger.info(f"Deleted all attachments for timeline {timeline_id}")
            return {
                "success": True,
                "timeline_id": timeline_id,
                "message": "All timeline attachments deleted successfully"
            }
        else:
            return {
                "success": False,
                "error": "Timeline not found or deletion failed"
            }

    except Exception as e:
        logger.error(f"Error deleting timeline attachments: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }
