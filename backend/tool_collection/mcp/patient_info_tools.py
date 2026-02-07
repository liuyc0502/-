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
    """Get patient's basic info: name, age, gender, blood_type, medical_record_no, email, phone."""
    try:
        tenant = tenant_id or DEFAULT_TENANT_ID
        patient = get_patient_by_id(patient_id, tenant)

        if not patient:
            return {"error": "Patient not found", "patient_id": patient_id}

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
    """Get patient's current primary diagnosis."""
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
    """Get patient's allergy information."""
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
    """Get patient's past medical history (previous conditions)."""
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
    """Get patient's family medical history."""
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
