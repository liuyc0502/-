"""
Doctor Case Management Tools - Atomic MCP Tools
Medical case creation, update, deletion and library management for doctors.
"""
import logging
from typing import Optional, Dict, Any, List
from fastmcp import FastMCP
from consts.const import DEFAULT_TENANT_ID
from database.medical_case_db import (
    create_medical_case,
    update_medical_case,
    delete_medical_case,
    create_case_detail,
    batch_create_symptoms,
    batch_create_lab_results,
    batch_create_case_images,
    delete_case_symptoms,
    delete_case_images,
    delete_case_lab_results,
    add_favorite,
    remove_favorite,
    add_view_history,
    create_case_with_details
)

logger = logging.getLogger(__name__)
doctor_case_mgmt_tools = FastMCP("doctor_case_management")


@doctor_case_mgmt_tools.tool()
async def create_medical_case(
    case_title: str,
    diagnosis: str,
    disease_type: str,
    chief_complaint: str,
    age: int,
    gender: str,
    case_no: Optional[str] = None,
    category: Optional[str] = None,
    tags: Optional[List[str]] = None,
    is_classic: bool = False,
    tenant_id: Optional[str] = None,
    user_id: Optional[str] = None
) -> Dict[str, Any]:
    """Create a new medical case. Returns case_id for adding details."""
    try:
        tenant = tenant_id or DEFAULT_TENANT_ID
        creator = user_id or "system"

        case_data = {
            "case_no": case_no,
            "case_title": case_title,
            "diagnosis": diagnosis,
            "disease_type": disease_type,
            "age": age,
            "gender": gender,
            "chief_complaint": chief_complaint,
            "category": category,
            "tags": tags or [],
            "is_classic": is_classic
        }

        result = create_medical_case(case_data, tenant, creator)

        logger.info(f"Created medical case {result['case_id']}")

        return {
            "success": True,
            "case_id": result["case_id"],
            "case_title": case_title,
            "message": f"Successfully created case: {case_title}"
        }

    except Exception as e:
        logger.error(f"Error creating medical case: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }


@doctor_case_mgmt_tools.tool()
async def update_medical_case_info(
    case_id: str,
    case_title: Optional[str] = None,
    diagnosis: Optional[str] = None,
    disease_type: Optional[str] = None,
    chief_complaint: Optional[str] = None,
    tags: Optional[List[str]] = None,
    is_classic: Optional[bool] = None,
    tenant_id: Optional[str] = None,
    user_id: Optional[str] = None
) -> Dict[str, Any]:
    """Update medical case basic information. Only provided fields are updated."""
    try:
        tenant = tenant_id or DEFAULT_TENANT_ID
        updater = user_id or "system"

        update_data = {}
        if case_title is not None:
            update_data["case_title"] = case_title
        if diagnosis is not None:
            update_data["diagnosis"] = diagnosis
        if disease_type is not None:
            update_data["disease_type"] = disease_type
        if chief_complaint is not None:
            update_data["chief_complaint"] = chief_complaint
        if tags is not None:
            update_data["tags"] = tags
        if is_classic is not None:
            update_data["is_classic"] = is_classic

        success = update_medical_case(int(case_id), update_data, tenant, updater)

        if success:
            logger.info(f"Updated medical case {case_id}")
            return {
                "success": True,
                "case_id": case_id,
                "message": "Case information updated successfully"
            }
        else:
            return {
                "success": False,
                "error": "Case not found or update failed"
            }

    except Exception as e:
        logger.error(f"Error updating medical case: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }


@doctor_case_mgmt_tools.tool()
async def delete_medical_case_record(
    case_id: str,
    tenant_id: Optional[str] = None,
    user_id: Optional[str] = None
) -> Dict[str, Any]:
    """Delete a medical case (hard delete). Use with caution."""
    try:
        tenant = tenant_id or DEFAULT_TENANT_ID
        deleter = user_id or "system"

        success = delete_medical_case(int(case_id), tenant, deleter)

        if success:
            logger.info(f"Deleted medical case {case_id}")
            return {
                "success": True,
                "case_id": case_id,
                "message": "Medical case deleted successfully"
            }
        else:
            return {
                "success": False,
                "error": "Case not found or deletion failed"
            }

    except Exception as e:
        logger.error(f"Error deleting medical case: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }


@doctor_case_mgmt_tools.tool()
async def save_case_detail(
    case_id: str,
    present_illness_history: Optional[str] = None,
    past_medical_history: Optional[str] = None,
    family_history: Optional[str] = None,
    physical_examination: Optional[Dict[str, Any]] = None,
    imaging_results: Optional[Dict[str, Any]] = None,
    diagnosis_basis: Optional[str] = None,
    treatment_plan: Optional[str] = None,
    medications: Optional[List[str]] = None,
    prognosis: Optional[str] = None,
    clinical_notes: Optional[str] = None,
    tenant_id: Optional[str] = None,
    user_id: Optional[str] = None
) -> Dict[str, Any]:
    """Save or update detailed information for a medical case."""
    try:
        tenant = tenant_id or DEFAULT_TENANT_ID
        saver = user_id or "system"

        detail_data = {"case_id": int(case_id)}

        if present_illness_history is not None:
            detail_data["present_illness_history"] = present_illness_history
        if past_medical_history is not None:
            detail_data["past_medical_history"] = past_medical_history
        if family_history is not None:
            detail_data["family_history"] = family_history
        if physical_examination is not None:
            detail_data["physical_examination"] = physical_examination
        if imaging_results is not None:
            detail_data["imaging_results"] = imaging_results
        if diagnosis_basis is not None:
            detail_data["diagnosis_basis"] = diagnosis_basis
        if treatment_plan is not None:
            detail_data["treatment_plan"] = treatment_plan
        if medications is not None:
            detail_data["medications"] = medications
        if prognosis is not None:
            detail_data["prognosis"] = prognosis
        if clinical_notes is not None:
            detail_data["clinical_notes"] = clinical_notes

        result = create_case_detail(detail_data, tenant, saver)

        logger.info(f"Saved detail {result['detail_id']} for case {case_id}")

        return {
            "success": True,
            "detail_id": result["detail_id"],
            "case_id": case_id,
            "message": "Case details saved successfully"
        }

    except Exception as e:
        logger.error(f"Error saving case detail: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }


@doctor_case_mgmt_tools.tool()
async def save_case_symptoms(
    case_id: str,
    symptoms: List[Dict[str, Any]],
    tenant_id: Optional[str] = None,
    user_id: Optional[str] = None
) -> Dict[str, Any]:
    """Batch save symptoms for a case. Each symptom: {symptom_name, symptom_description?, is_key_symptom?}"""
    try:
        tenant = tenant_id or DEFAULT_TENANT_ID
        saver = user_id or "system"

        symptoms_data = [
            {
                "case_id": int(case_id),
                **symptom
            }
            for symptom in symptoms
        ]

        result = batch_create_symptoms(symptoms_data, tenant, saver)

        logger.info(f"Saved {result['created_count']} symptoms for case {case_id}")

        return {
            "success": True,
            "created_count": result["created_count"],
            "case_id": case_id,
            "message": f"Successfully saved {result['created_count']} symptoms"
        }

    except Exception as e:
        logger.error(f"Error saving case symptoms: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }


@doctor_case_mgmt_tools.tool()
async def save_case_lab_results(
    case_id: str,
    lab_results: List[Dict[str, Any]],
    tenant_id: Optional[str] = None,
    user_id: Optional[str] = None
) -> Dict[str, Any]:
    """Batch save lab results. Each: {test_name, test_value, test_unit?, normal_range?, is_abnormal?}"""
    try:
        tenant = tenant_id or DEFAULT_TENANT_ID
        saver = user_id or "system"

        lab_results_data = [
            {
                "case_id": int(case_id),
                **lab_result
            }
            for lab_result in lab_results
        ]

        result = batch_create_lab_results(lab_results_data, tenant, saver)

        logger.info(f"Saved {result['created_count']} lab results for case {case_id}")

        return {
            "success": True,
            "created_count": result["created_count"],
            "case_id": case_id,
            "message": f"Successfully saved {result['created_count']} lab results"
        }

    except Exception as e:
        logger.error(f"Error saving case lab results: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }


@doctor_case_mgmt_tools.tool()
async def upload_case_images(
    case_id: str,
    images: List[Dict[str, Any]],
    tenant_id: Optional[str] = None,
    user_id: Optional[str] = None
) -> Dict[str, Any]:
    """Batch upload images. Each: {image_url, image_type, image_description?, display_order?}"""
    try:
        tenant = tenant_id or DEFAULT_TENANT_ID
        uploader = user_id or "system"

        images_data = [
            {
                "case_id": int(case_id),
                **image
            }
            for image in images
        ]

        result = batch_create_case_images(images_data, tenant, uploader)

        logger.info(f"Uploaded {result['created_count']} images for case {case_id}")

        return {
            "success": True,
            "created_count": result["created_count"],
            "case_id": case_id,
            "message": f"Successfully uploaded {result['created_count']} images"
        }

    except Exception as e:
        logger.error(f"Error uploading case images: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }


@doctor_case_mgmt_tools.tool()
async def add_case_to_favorites(
    case_id: str,
    user_id: str,
    tenant_id: Optional[str] = None
) -> Dict[str, Any]:
    """Add a case to doctor's favorites/bookmarks."""
    try:
        tenant = tenant_id or DEFAULT_TENANT_ID

        result = add_favorite(int(case_id), user_id, tenant)

        logger.info(f"Added case {case_id} to favorites for user {user_id}")

        return {
            "success": True,
            "favorite_id": result["favorite_id"],
            "already_favorited": result.get("already_favorited", False),
            "case_id": case_id,
            "message": "Case added to favorites" if not result.get("already_favorited") else "Case already in favorites"
        }

    except Exception as e:
        logger.error(f"Error adding case to favorites: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }


@doctor_case_mgmt_tools.tool()
async def remove_case_from_favorites(
    case_id: str,
    user_id: str,
    tenant_id: Optional[str] = None
) -> Dict[str, Any]:
    """Remove a case from doctor's favorites."""
    try:
        tenant = tenant_id or DEFAULT_TENANT_ID

        success = remove_favorite(int(case_id), user_id, tenant)

        if success:
            logger.info(f"Removed case {case_id} from favorites for user {user_id}")
            return {
                "success": True,
                "case_id": case_id,
                "message": "Case removed from favorites"
            }
        else:
            return {
                "success": False,
                "error": "Favorite not found or removal failed"
            }

    except Exception as e:
        logger.error(f"Error removing case from favorites: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }


@doctor_case_mgmt_tools.tool()
async def record_case_view(
    case_id: str,
    user_id: str,
    tenant_id: Optional[str] = None
) -> Dict[str, Any]:
    """Record that a doctor viewed a case (for history tracking)."""
    try:
        tenant = tenant_id or DEFAULT_TENANT_ID

        result = add_view_history(int(case_id), user_id, tenant)

        logger.info(f"Recorded view of case {case_id} by user {user_id}")

        return {
            "success": True,
            "history_id": result["history_id"],
            "case_id": case_id,
            "message": "Case view recorded successfully"
        }

    except Exception as e:
        logger.error(f"Error recording case view: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }
