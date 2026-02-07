"""
Doctor Patient Management Tools - Atomic MCP Tools
Patient creation, update, deletion, and search operations for doctors.
"""
import logging
from typing import Optional, Dict, Any, List
from fastmcp import FastMCP
from consts.const import DEFAULT_TENANT_ID
from database.patient_db import (
    create_patient,
    update_patient,
    delete_patient,
    list_patients,
    find_patients_by_name
)

logger = logging.getLogger(__name__)
doctor_patient_mgmt_tools = FastMCP("doctor_patient_management")


@doctor_patient_mgmt_tools.tool()
async def create_new_patient(
    name: str,
    gender: str,
    age: int,
    medical_record_no: str,
    diagnosis: Optional[str] = None,
    email: Optional[str] = None,
    phone: Optional[str] = None,
    address: Optional[str] = None,
    date_of_birth: Optional[str] = None,
    allergies: Optional[List[str]] = None,
    past_medical_history: Optional[List[str]] = None,
    family_history: Optional[str] = None,
    tenant_id: Optional[str] = None,
    user_id: Optional[str] = None
) -> Dict[str, Any]:
    """Create a new patient record. Returns patient_id for other operations."""
    try:
        tenant = tenant_id or DEFAULT_TENANT_ID
        creator = user_id or "system"

        patient_data = {
            "name": name,
            "gender": gender,
            "age": age,
            "medical_record_no": medical_record_no,
            "diagnosis": diagnosis,
            "email": email,
            "phone": phone,
            "address": address,
            "date_of_birth": date_of_birth,
            "allergies": allergies or [],
            "past_medical_history": past_medical_history or [],
            "family_history": family_history
        }

        result = create_patient(patient_data, tenant, creator)

        logger.info(f"Created patient {result['patient_id']} with MRN {medical_record_no}")

        return {
            "success": True,
            "patient_id": result["patient_id"],
            "medical_record_no": medical_record_no,
            "message": f"Successfully created patient record for {name}"
        }

    except Exception as e:
        logger.error(f"Error creating patient: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }


@doctor_patient_mgmt_tools.tool()
async def update_patient_info(
    patient_id: str,
    name: Optional[str] = None,
    gender: Optional[str] = None,
    age: Optional[int] = None,
    diagnosis: Optional[str] = None,
    email: Optional[str] = None,
    phone: Optional[str] = None,
    address: Optional[str] = None,
    allergies: Optional[List[str]] = None,
    past_medical_history: Optional[List[str]] = None,
    family_history: Optional[str] = None,
    tenant_id: Optional[str] = None,
    user_id: Optional[str] = None
) -> Dict[str, Any]:
    """Update patient information. Only provided fields are updated."""
    try:
        tenant = tenant_id or DEFAULT_TENANT_ID
        updater = user_id or "system"

        # Build update data (only include provided fields)
        update_data = {}
        if name is not None:
            update_data["name"] = name
        if gender is not None:
            update_data["gender"] = gender
        if age is not None:
            update_data["age"] = age
        if diagnosis is not None:
            update_data["diagnosis"] = diagnosis
        if email is not None:
            update_data["email"] = email
        if phone is not None:
            update_data["phone"] = phone
        if address is not None:
            update_data["address"] = address
        if allergies is not None:
            update_data["allergies"] = allergies
        if past_medical_history is not None:
            update_data["past_medical_history"] = past_medical_history
        if family_history is not None:
            update_data["family_history"] = family_history

        success = update_patient(int(patient_id), update_data, tenant, updater)

        if success:
            logger.info(f"Updated patient {patient_id}")
            return {
                "success": True,
                "patient_id": patient_id,
                "message": "Patient information updated successfully"
            }
        else:
            return {
                "success": False,
                "error": "Patient not found or update failed"
            }

    except Exception as e:
        logger.error(f"Error updating patient: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }


@doctor_patient_mgmt_tools.tool()
async def delete_patient_record(
    patient_id: str,
    tenant_id: Optional[str] = None,
    user_id: Optional[str] = None
) -> Dict[str, Any]:
    """Delete a patient record (hard delete). Use with caution."""
    try:
        tenant = tenant_id or DEFAULT_TENANT_ID
        deleter = user_id or "system"

        success = delete_patient(int(patient_id), tenant, deleter)

        if success:
            logger.info(f"Deleted patient {patient_id}")
            return {
                "success": True,
                "patient_id": patient_id,
                "message": "Patient record deleted successfully"
            }
        else:
            return {
                "success": False,
                "error": "Patient not found or deletion failed"
            }

    except Exception as e:
        logger.error(f"Error deleting patient: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }


@doctor_patient_mgmt_tools.tool()
async def search_patients(
    search_query: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
    tenant_id: Optional[str] = None
) -> Dict[str, Any]:
    """Search patients by name or medical record number."""
    try:
        tenant = tenant_id or DEFAULT_TENANT_ID

        patients = list_patients(
            tenant_id=tenant,
            search_query=search_query,
            limit=limit,
            offset=offset
        )

        logger.info(f"Found {len(patients)} patients matching '{search_query}'")

        return {
            "total_patients": len(patients),
            "patients": patients,
            "search_query": search_query,
            "limit": limit,
            "offset": offset
        }

    except Exception as e:
        logger.error(f"Error searching patients: {str(e)}")
        return {
            "total_patients": 0,
            "patients": [],
            "error": str(e)
        }


@doctor_patient_mgmt_tools.tool()
async def check_duplicate_patients(
    name: str,
    exact_match: bool = False,
    tenant_id: Optional[str] = None
) -> Dict[str, Any]:
    """Find patients with similar names to check for duplicates before creating new patient."""
    try:
        tenant = tenant_id or DEFAULT_TENANT_ID

        patients = find_patients_by_name(
            name=name,
            tenant_id=tenant,
            exact_match=exact_match
        )

        logger.info(f"Found {len(patients)} patients with name '{name}'")

        return {
            "total_matches": len(patients),
            "patients": patients,
            "has_duplicates": len(patients) > 0,
            "search_name": name,
            "exact_match": exact_match
        }

    except Exception as e:
        logger.error(f"Error checking duplicate patients: {str(e)}")
        return {
            "total_matches": 0,
            "patients": [],
            "has_duplicates": False,
            "error": str(e)
        }
