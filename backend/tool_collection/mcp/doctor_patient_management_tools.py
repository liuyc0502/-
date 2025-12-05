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
    """
    Create a new patient record.

    Use this tool when:
    - Doctor wants to create a new patient file
    - Registering a new patient in the system

    Args:
        name: Patient full name (required)
        gender: Patient gender - "male" or "female" (required)
        age: Patient age in years (required)
        medical_record_no: Medical record number/ID (required, must be unique)
        diagnosis: Current primary diagnosis, optional
        email: Email address, optional
        phone: Phone number, optional
        address: Home address, optional
        date_of_birth: Date of birth (YYYY-MM-DD), optional
        allergies: List of known allergies, optional
        past_medical_history: List of past medical conditions, optional
        family_history: Family medical history description, optional
        tenant_id: Tenant identifier (optional, uses default if not provided)
        user_id: Doctor/user creating the record (optional, uses default)

    Returns:
        - success: Whether creation was successful
        - patient_id: New patient identifier (use this for other operations)
        - medical_record_no: Medical record number

    Example:
        result = create_new_patient(
            name="Zhang San",
            gender="male",
            age=45,
            medical_record_no="MRN12345",
            diagnosis="Lung adenocarcinoma",
            allergies=["Penicillin"],
            past_medical_history=["Hypertension"]
        )
        patient_id = result['patient_id']
    """
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
    """
    Update patient information.

    Use this tool when:
    - Need to update patient demographic info
    - Add/update diagnosis
    - Update contact information
    - Update medical history

    Args:
        patient_id: Patient identifier (required)
        name: Updated full name, optional
        gender: Updated gender, optional
        age: Updated age, optional
        diagnosis: Updated diagnosis, optional
        email: Updated email, optional
        phone: Updated phone, optional
        address: Updated address, optional
        allergies: Updated allergy list, optional
        past_medical_history: Updated medical history, optional
        family_history: Updated family history, optional
        tenant_id: Tenant identifier (optional)
        user_id: Doctor/user making the update (optional)

    Returns:
        - success: Whether update was successful
        - patient_id: Patient identifier

    Example:
        result = update_patient_info(
            patient_id="123",
            diagnosis="Lung adenocarcinoma Stage IIB",
            allergies=["Penicillin", "Sulfa drugs"]
        )
    """
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
    """
    Delete a patient record (hard delete).

    Use this tool when:
    - Need to remove a patient record permanently
    - Deleting duplicate or test records

    WARNING: This is a hard delete operation. Use with caution.

    Args:
        patient_id: Patient identifier (required)
        tenant_id: Tenant identifier (optional)
        user_id: Doctor/user performing deletion (optional)

    Returns:
        - success: Whether deletion was successful
        - patient_id: Deleted patient identifier

    Example:
        result = delete_patient_record(patient_id="123")
    """
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
    """
    Search patients by name or medical record number.

    Use this tool when:
    - Doctor wants to find patients by name
    - Looking up patient by medical record number
    - Getting patient list for review

    Args:
        search_query: Search text (matches name or medical_record_no), optional
        limit: Maximum number of results (default 100)
        offset: Number of results to skip for pagination (default 0)
        tenant_id: Tenant identifier (optional)

    Returns:
        - total_patients: Number of patients found
        - patients: List of patient records

    Example:
        # Search by name
        result = search_patients(search_query="Zhang")

        # Get all patients (no filter)
        result = search_patients(limit=50)
    """
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
    """
    Find patients with similar names to check for duplicates.

    Use this tool when:
    - Before creating a new patient (duplicate detection)
    - Doctor suspects there might be duplicate records
    - Checking if patient already exists

    Args:
        name: Patient name to search for (required)
        exact_match: If True, only exact matches; if False, fuzzy match (default False)
        tenant_id: Tenant identifier (optional)

    Returns:
        - total_matches: Number of matching patients found
        - patients: List of matching patient records
        - has_duplicates: Boolean flag

    Example:
        # Fuzzy search
        result = check_duplicate_patients(name="Zhang San")

        # Exact match only
        result = check_duplicate_patients(name="Zhang San", exact_match=True)

        if result['has_duplicates']:
            print(f"Found {result['total_matches']} potential duplicates")
    """
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
