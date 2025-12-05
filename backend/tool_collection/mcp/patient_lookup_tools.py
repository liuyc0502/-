"""
Patient Lookup Tools - Atomic MCP Tools
Helper tools to find patient IDs from various identifiers.
"""
import logging
from typing import Optional, Dict, Any
from fastmcp import FastMCP
from consts.const import DEFAULT_TENANT_ID
from database.patient_db import (
    get_patient_by_medical_record_no,
    get_patient_by_email
)

logger = logging.getLogger(__name__)
patient_lookup_tools = FastMCP("patient_lookup")


@patient_lookup_tools.tool()
async def find_patient_by_medical_record_no(
    medical_record_no: str,
    tenant_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Find patient by their medical record number.

    Use this tool when:
    - Patient provides their medical record number
    - You need to get patient_id for other tool calls

    Args:
        medical_record_no: Patient's medical record number (e.g., "MRN001")
        tenant_id: Tenant identifier (optional, uses default if not provided)

    Returns:
        Patient information including:
        - patient_id: Use this ID for other patient-related tool calls
        - name: Patient name
        - medical_record_no: Medical record number
        - email: Patient email
        - gender: Patient gender
        - age: Patient age

        Returns {"error": "..."} if patient not found.

    Example:
        patient = find_patient_by_medical_record_no("MRN001")
        patient_id = patient["patient_id"]
        # Now use patient_id for other tools
    """
    try:
        tenant = tenant_id or DEFAULT_TENANT_ID
        patient = get_patient_by_medical_record_no(medical_record_no, tenant)

        if not patient:
            logger.warning(f"Patient not found: {medical_record_no}")
            return {
                "error": "Patient not found",
                "medical_record_no": medical_record_no
            }

        logger.info(f"Found patient {medical_record_no}: {patient.get('patient_id')}")
        return patient

    except Exception as e:
        logger.error(f"Error finding patient by medical record: {str(e)}")
        return {"error": str(e)}


@patient_lookup_tools.tool()
async def find_patient_by_email(
    email: str,
    tenant_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Find patient by their email address.

    Use this tool when:
    - Patient provides their email address
    - You need to get patient_id for other tool calls

    Args:
        email: Patient's email address
        tenant_id: Tenant identifier (optional, uses default if not provided)

    Returns:
        Patient information including:
        - patient_id: Use this ID for other patient-related tool calls
        - name: Patient name
        - medical_record_no: Medical record number
        - email: Patient email
        - gender: Patient gender
        - age: Patient age

        Returns {"error": "..."} if patient not found.

    Example:
        patient = find_patient_by_email("patient@example.com")
        patient_id = patient["patient_id"]
        # Now use patient_id for other tools
    """
    try:
        tenant = tenant_id or DEFAULT_TENANT_ID
        patient = get_patient_by_email(email, tenant)

        if not patient:
            logger.warning(f"Patient not found: {email}")
            return {
                "error": "Patient not found",
                "email": email
            }

        logger.info(f"Found patient {email}: {patient.get('patient_id')}")
        return patient

    except Exception as e:
        logger.error(f"Error finding patient by email: {str(e)}")
        return {"error": str(e)}
