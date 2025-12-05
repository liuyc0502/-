"""
Patient Info Tools - Atomic MCP Tools
Basic patient information retrieval tools.
"""
import logging
from typing import Optional, Dict, Any
from fastmcp import FastMCP
from consts.const import DEFAULT_TENANT_ID
from database.patient_db import get_patient_by_id

logger = logging.getLogger(__name__)
patient_info_tools = FastMCP("patient_info")


@patient_info_tools.tool()
async def get_patient_basic_info(
    patient_id: str,
    tenant_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Get patient's basic demographic information.

    Use this tool when:
    - You need patient's name, age, gender, blood type
    - Starting a conversation and need basic context
    - Patient asks "What's in my profile?"

    Args:
        patient_id: Patient identifier (from find_patient_by_* tools)
        tenant_id: Tenant identifier (optional)

    Returns:
        - patient_id: Patient identifier
        - name: Full name
        - gender: Gender (male/female/other)
        - birth_date: Date of birth
        - age: Age in years
        - blood_type: Blood type (A/B/AB/O with +/-)
        - medical_record_no: Medical record number
        - email: Email address
        - phone: Phone number

    Example:
        info = get_patient_basic_info(patient_id)
        print(f"Patient {info['name']}, age {info['age']}")
    """
    try:
        tenant = tenant_id or DEFAULT_TENANT_ID
        patient = get_patient_by_id(patient_id, tenant)

        if not patient:
            return {"error": "Patient not found", "patient_id": patient_id}

        # Return only basic demographic info
        basic_info = {
            "patient_id": patient.get("patient_id"),
            "name": patient.get("name"),
            "gender": patient.get("gender"),
            "birth_date": patient.get("birth_date"),
            "age": patient.get("age"),
            "blood_type": patient.get("blood_type"),
            "medical_record_no": patient.get("medical_record_no"),
            "email": patient.get("email"),
            "phone": patient.get("phone")
        }

        logger.info(f"Retrieved basic info for patient {patient_id}")
        return basic_info

    except Exception as e:
        logger.error(f"Error getting patient basic info: {str(e)}")
        return {"error": str(e)}


@patient_info_tools.tool()
async def get_patient_diagnosis(
    patient_id: str,
    tenant_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Get patient's current primary diagnosis.

    Use this tool when:
    - Patient asks "What is my diagnosis?"
    - You need diagnosis context for symptom analysis
    - Checking if symptoms relate to current condition

    Args:
        patient_id: Patient identifier
        tenant_id: Tenant identifier (optional)

    Returns:
        - patient_id: Patient identifier
        - diagnosis: Current primary diagnosis
        - diagnosis_date: When diagnosis was made (if available)

    Example:
        dx = get_patient_diagnosis(patient_id)
        print(f"Current diagnosis: {dx['diagnosis']}")
    """
    try:
        tenant = tenant_id or DEFAULT_TENANT_ID
        patient = get_patient_by_id(patient_id, tenant)

        if not patient:
            return {"error": "Patient not found", "patient_id": patient_id}

        diagnosis_info = {
            "patient_id": patient.get("patient_id"),
            "diagnosis": patient.get("diagnosis"),
            "diagnosis_date": patient.get("diagnosis_date")
        }

        logger.info(f"Retrieved diagnosis for patient {patient_id}")
        return diagnosis_info

    except Exception as e:
        logger.error(f"Error getting patient diagnosis: {str(e)}")
        return {"error": str(e)}


@patient_info_tools.tool()
async def get_patient_allergies(
    patient_id: str,
    tenant_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Get patient's allergy information.

    Use this tool when:
    - Discussing medications (check drug allergies)
    - Patient asks "What are my allergies?"
    - Assessing emergency symptoms (allergic reactions)

    Args:
        patient_id: Patient identifier
        tenant_id: Tenant identifier (optional)

    Returns:
        - patient_id: Patient identifier
        - allergies: List of known allergies
        - has_allergies: Boolean flag

    Example:
        allergies = get_patient_allergies(patient_id)
        if allergies['has_allergies']:
            print(f"Allergies: {allergies['allergies']}")
    """
    try:
        tenant = tenant_id or DEFAULT_TENANT_ID
        patient = get_patient_by_id(patient_id, tenant)

        if not patient:
            return {"error": "Patient not found", "patient_id": patient_id}

        allergies_list = patient.get("allergies", [])

        allergy_info = {
            "patient_id": patient.get("patient_id"),
            "allergies": allergies_list,
            "has_allergies": len(allergies_list) > 0
        }

        logger.info(f"Retrieved allergies for patient {patient_id}")
        return allergy_info

    except Exception as e:
        logger.error(f"Error getting patient allergies: {str(e)}")
        return {"error": str(e)}


@patient_info_tools.tool()
async def get_patient_medical_history(
    patient_id: str,
    tenant_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Get patient's past medical history (previous conditions).

    Use this tool when:
    - Need context for current symptoms
    - Patient asks "What's in my medical history?"
    - Assessing risk factors for new conditions

    Args:
        patient_id: Patient identifier
        tenant_id: Tenant identifier (optional)

    Returns:
        - patient_id: Patient identifier
        - past_medical_history: List of past conditions/diagnoses
        - has_past_conditions: Boolean flag

    Example:
        history = get_patient_medical_history(patient_id)
        print(f"Past conditions: {history['past_medical_history']}")
    """
    try:
        tenant = tenant_id or DEFAULT_TENANT_ID
        patient = get_patient_by_id(patient_id, tenant)

        if not patient:
            return {"error": "Patient not found", "patient_id": patient_id}

        past_history = patient.get("past_medical_history", [])

        history_info = {
            "patient_id": patient.get("patient_id"),
            "past_medical_history": past_history,
            "has_past_conditions": len(past_history) > 0
        }

        logger.info(f"Retrieved medical history for patient {patient_id}")
        return history_info

    except Exception as e:
        logger.error(f"Error getting patient medical history: {str(e)}")
        return {"error": str(e)}


@patient_info_tools.tool()
async def get_patient_family_history(
    patient_id: str,
    tenant_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Get patient's family medical history.

    Use this tool when:
    - Assessing hereditary disease risk
    - Patient asks "What's my family history?"
    - Discussing genetic factors

    Args:
        patient_id: Patient identifier
        tenant_id: Tenant identifier (optional)

    Returns:
        - patient_id: Patient identifier
        - family_history: Family medical history information
        - has_family_history: Boolean flag

    Example:
        family = get_patient_family_history(patient_id)
        if family['has_family_history']:
            print(f"Family history: {family['family_history']}")
    """
    try:
        tenant = tenant_id or DEFAULT_TENANT_ID
        patient = get_patient_by_id(patient_id, tenant)

        if not patient:
            return {"error": "Patient not found", "patient_id": patient_id}

        family_history = patient.get("family_history")

        family_info = {
            "patient_id": patient.get("patient_id"),
            "family_history": family_history,
            "has_family_history": family_history is not None and family_history != ""
        }

        logger.info(f"Retrieved family history for patient {patient_id}")
        return family_info

    except Exception as e:
        logger.error(f"Error getting patient family history: {str(e)}")
        return {"error": str(e)}
