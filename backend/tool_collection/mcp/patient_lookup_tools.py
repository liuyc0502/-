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
    """Find patient by medical record number. Returns patient_id for other tools."""
    try:
        tenant = tenant_id or DEFAULT_TENANT_ID
        patient = get_patient_by_medical_record_no(medical_record_no, tenant)

        if not patient:
            logger.warning(f"Patient not found: {medical_record_no}")
            return {"error": "Patient not found", "medical_record_no": medical_record_no}

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
    """Find patient by email address. Returns patient_id for other tools."""
    try:
        tenant = tenant_id or DEFAULT_TENANT_ID
        patient = get_patient_by_email(email, tenant)

        if not patient:
            logger.warning(f"Patient not found: {email}")
            return {"error": "Patient not found", "email": email}

        logger.info(f"Found patient {email}: {patient.get('patient_id')}")
        return patient

    except Exception as e:
        logger.error(f"Error finding patient by email: {str(e)}")
        return {"error": str(e)}
