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
    """
    Create a new medical case in the case library.

    Use this tool when:
    - Adding a new case to the teaching library
    - Documenting an interesting case
    - Creating a case for reference

    Args:
        case_title: Case title (required)
        diagnosis: Primary diagnosis (required)
        disease_type: Disease category (required) - e.g., "肿瘤", "感染", "代谢性疾病"
        chief_complaint: Main presenting complaint (required)
        age: Patient age (required, anonymized)
        gender: Patient gender (required) - "male" or "female"
        case_no: Case number/ID, optional
        category: Case category, optional
        tags: List of tags for categorization, optional
        is_classic: Whether this is a classic teaching case (default False)
        tenant_id: Tenant identifier (optional)
        user_id: Doctor creating the case (optional)

    Returns:
        - success: Whether creation was successful
        - case_id: New case identifier (use for adding details)
        - case_title: Case title

    Next steps:
    - Call save_case_detail() to add detailed information
    - Call save_case_symptoms() to add symptoms
    - Call save_case_lab_results() to add lab results
    - Call upload_case_images() to add images

    Example:
        result = create_medical_case(
            case_title="45岁男性肺腺癌典型病例",
            diagnosis="肺腺癌",
            disease_type="肿瘤",
            chief_complaint="咳嗽2月,痰中带血1周",
            age=45,
            gender="male",
            is_classic=True,
            tags=["肺癌", "早期", "手术"]
        )
        case_id = result['case_id']
    """
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
    """
    Update medical case basic information.

    Use this tool when:
    - Correcting case information
    - Updating diagnosis
    - Modifying tags or classification

    Args:
        case_id: Case identifier (required)
        case_title: Updated title, optional
        diagnosis: Updated diagnosis, optional
        disease_type: Updated disease type, optional
        chief_complaint: Updated chief complaint, optional
        tags: Updated tags list, optional
        is_classic: Updated classic status, optional
        tenant_id: Tenant identifier (optional)
        user_id: Doctor making the update (optional)

    Returns:
        - success: Whether update was successful
        - case_id: Case identifier

    Example:
        result = update_medical_case_info(
            case_id="789",
            is_classic=True,
            tags=["肺癌", "早期", "手术", "典型病例"]
        )
    """
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
    """
    Delete a medical case (hard delete).

    Use this tool when:
    - Removing incorrect or duplicate cases
    - Deleting test data

    WARNING: This is a hard delete operation. Use with caution.

    Args:
        case_id: Case identifier (required)
        tenant_id: Tenant identifier (optional)
        user_id: Doctor performing deletion (optional)

    Returns:
        - success: Whether deletion was successful
        - case_id: Deleted case identifier

    Example:
        result = delete_medical_case_record(case_id="789")
    """
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
    """
    Save or update detailed information for a medical case.

    Use this tool when:
    - Adding comprehensive case details
    - Recording treatment plans
    - Documenting clinical findings

    Args:
        case_id: Case identifier (required)
        present_illness_history: Current illness history, optional
        past_medical_history: Past medical history, optional
        family_history: Family medical history, optional
        physical_examination: Physical exam findings (dict), optional
        imaging_results: Imaging results (dict), optional
        diagnosis_basis: Basis for diagnosis, optional
        treatment_plan: Treatment plan description, optional
        medications: List of medications, optional
        prognosis: Prognosis description, optional
        clinical_notes: Additional clinical notes, optional
        tenant_id: Tenant identifier (optional)
        user_id: Doctor saving the detail (optional)

    Returns:
        - success: Whether save was successful
        - detail_id: Detail record identifier
        - case_id: Case identifier

    Example:
        result = save_case_detail(
            case_id="789",
            treatment_plan="手术切除+辅助化疗",
            prognosis="预后良好,5年生存率约70%",
            medications=["顺铂", "培美曲塞"]
        )
    """
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
    """
    Batch save symptoms for a medical case.

    Use this tool when:
    - Recording all case symptoms at once
    - Documenting symptom profile

    Args:
        case_id: Case identifier (required)
        symptoms: List of symptom dictionaries (required), each containing:
          - symptom_name: Symptom name (required)
          - symptom_description: Detailed description, optional
          - is_key_symptom: Whether this is a key symptom (default False)
        tenant_id: Tenant identifier (optional)
        user_id: Doctor saving the symptoms (optional)

    Returns:
        - success: Whether save was successful
        - created_count: Number of symptoms saved
        - case_id: Case identifier

    Example:
        result = save_case_symptoms(
            case_id="789",
            symptoms=[
                {"symptom_name": "咳嗽", "is_key_symptom": True},
                {"symptom_name": "痰中带血", "is_key_symptom": True},
                {"symptom_name": "胸痛", "is_key_symptom": False}
            ]
        )
    """
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
    """
    Batch save lab test results for a medical case.

    Use this tool when:
    - Recording all lab results for a case
    - Documenting diagnostic test values

    Args:
        case_id: Case identifier (required)
        lab_results: List of lab result dictionaries (required), each containing:
          - test_name: Test name (required)
          - test_full_name: Full test name, optional
          - test_value: Test value (required)
          - test_unit: Unit of measurement, optional
          - normal_range: Normal range description, optional
          - is_abnormal: Whether value is abnormal (default False)
          - abnormal_indicator: "high" or "low", optional
        tenant_id: Tenant identifier (optional)
        user_id: Doctor saving the results (optional)

    Returns:
        - success: Whether save was successful
        - created_count: Number of lab results saved
        - case_id: Case identifier

    Example:
        result = save_case_lab_results(
            case_id="789",
            lab_results=[
                {
                    "test_name": "WBC",
                    "test_full_name": "白细胞计数",
                    "test_value": "6.2",
                    "test_unit": "×10⁹/L",
                    "normal_range": "4.0-10.0",
                    "is_abnormal": False
                },
                {
                    "test_name": "CEA",
                    "test_full_name": "癌胚抗原",
                    "test_value": "12.5",
                    "test_unit": "ng/mL",
                    "normal_range": "<5.0",
                    "is_abnormal": True,
                    "abnormal_indicator": "high"
                }
            ]
        )
    """
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
    """
    Batch upload images for a medical case.

    Use this tool when:
    - Adding medical images to a case
    - Uploading multiple case images at once

    Args:
        case_id: Case identifier (required)
        images: List of image dictionaries (required), each containing:
          - image_url: URL of the image (required)
          - image_type: Type of image (required) - e.g., "CT", "病理切片", "X-ray"
          - image_description: Description, optional
          - thumbnail_url: Thumbnail URL, optional
          - display_order: Display order (default 0)
        tenant_id: Tenant identifier (optional)
        user_id: Doctor uploading the images (optional)

    Returns:
        - success: Whether upload was successful
        - created_count: Number of images uploaded
        - case_id: Case identifier

    Example:
        result = upload_case_images(
            case_id="789",
            images=[
                {
                    "image_url": "https://storage.example.com/images/ct_001.jpg",
                    "image_type": "CT",
                    "image_description": "胸部CT显示左肺上叶肿块"
                },
                {
                    "image_url": "https://storage.example.com/images/path_001.jpg",
                    "image_type": "病理切片",
                    "image_description": "腺癌病理表现"
                }
            ]
        )
    """
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
    """
    Add a case to doctor's favorites.

    Use this tool when:
    - Doctor wants to bookmark interesting cases
    - Saving cases for teaching purposes

    Args:
        case_id: Case identifier (required)
        user_id: Doctor's user identifier (required)
        tenant_id: Tenant identifier (optional)

    Returns:
        - success: Whether operation was successful
        - favorite_id: Favorite record identifier
        - already_favorited: Whether case was already in favorites

    Example:
        result = add_case_to_favorites(case_id="789", user_id="doctor123")
    """
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
    """
    Remove a case from doctor's favorites.

    Use this tool when:
    - Doctor wants to un-bookmark a case

    Args:
        case_id: Case identifier (required)
        user_id: Doctor's user identifier (required)
        tenant_id: Tenant identifier (optional)

    Returns:
        - success: Whether operation was successful
        - case_id: Case identifier

    Example:
        result = remove_case_from_favorites(case_id="789", user_id="doctor123")
    """
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
    """
    Record that a doctor viewed a case (for history tracking).

    Use this tool when:
    - Doctor opens/views a case
    - Tracking case view analytics

    Args:
        case_id: Case identifier (required)
        user_id: Doctor's user identifier (required)
        tenant_id: Tenant identifier (optional)

    Returns:
        - success: Whether recording was successful
        - history_id: View history record identifier
        - case_id: Case identifier

    Example:
        result = record_case_view(case_id="789", user_id="doctor123")
    """
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
