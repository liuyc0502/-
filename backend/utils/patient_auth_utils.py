"""
Patient Authentication Utilities

Helper functions to map authenticated users to patient records.
For patient portal, we need to identify which patient record corresponds to the logged-in user.
"""
import logging
import jwt
from typing import Optional, Tuple
from .auth_utils import get_supabase_client, get_current_user_id
from database.patient_db import get_patient_by_email
from consts.const import IS_SPEED_MODE, DEFAULT_USER_ID

logger = logging.getLogger(__name__)


def get_email_from_jwt(authorization: str) -> Optional[str]:
    """
    Extract email directly from JWT token without Supabase API call.
    
    Args:
        authorization: Authorization header value (Bearer token)
    
    Returns:
        Optional[str]: Email address if found in token, None otherwise
    """
    try:
        token = authorization.replace("Bearer ", "") if authorization.startswith("Bearer ") else authorization
        decoded = jwt.decode(token, options={"verify_signature": False})
        email = decoded.get("email")
        return email
    except Exception as e:
        logger.debug(f"Failed to extract email from JWT: {e}")
        return None


def get_patient_id_from_user_id(user_id: str, tenant_id: str, authorization: str = None) -> Optional[str]:
    """
    Get patient_id from user authentication.

    Priority:
    1. Extract email from JWT token directly (fast, no API call)
    2. Fallback to Supabase admin API (if JWT doesn't have email)
    3. Speed mode fallback: use first patient for testing

    Args:
        user_id: User UUID (from JWT token)
        tenant_id: Tenant identifier
        authorization: Optional authorization header for JWT email extraction

    Returns:
        Optional[str]: patient_id if found, None otherwise
    """
    # Method 1: Try to get email directly from JWT token
    if authorization:
        email = get_email_from_jwt(authorization)
        if email:
            patient = get_patient_by_email(email, tenant_id)
            if patient:
                patient_id = patient.get("patient_id")
                logger.info(f"Found patient_id={patient_id} via JWT email {email}")
                return str(patient_id)
            else:
                logger.warning(f"No patient record found for JWT email: {email}")

    # Method 2: Speed mode fallback for development/testing
    if IS_SPEED_MODE and user_id == DEFAULT_USER_ID:
        # Check for test patient email in environment variable
        import os
        test_patient_email = os.getenv("TEST_PATIENT_EMAIL")
        if test_patient_email:
            patient = get_patient_by_email(test_patient_email, tenant_id)
            if patient:
                patient_id = patient.get("patient_id")
                logger.info(f"Speed mode: using patient_id={patient_id} via TEST_PATIENT_EMAIL={test_patient_email}")
                return str(patient_id)
            else:
                logger.warning(f"Speed mode: no patient found for TEST_PATIENT_EMAIL={test_patient_email}")
                return None

    # Method 3: Fallback to Supabase admin API
    try:
        supabase = get_supabase_client()
        if not supabase:
            logger.error("Failed to get Supabase client")
            return None

        user_response = supabase.auth.admin.get_user_by_id(user_id)
        if not user_response or not user_response.user:
            logger.warning(f"User not found in Supabase: {user_id}")
            return None

        user_email = user_response.user.email
        if not user_email:
            logger.warning(f"User {user_id} has no email address")
            return None

        patient = get_patient_by_email(user_email, tenant_id)
        if not patient:
            logger.warning(f"No patient record found for email: {user_email}")
            return None

        patient_id = patient.get("patient_id")
        logger.info(f"Mapped user {user_id} to patient {patient_id} via Supabase email {user_email}")
        return str(patient_id)

    except Exception as e:
        logger.error(f"Error getting patient_id from user_id: {str(e)}")
        return None


def get_current_patient_info(authorization: Optional[str] = None) -> Tuple[Optional[str], Optional[str], Optional[str]]:
    """
    Get current patient information from authorization token.

    This is a convenience function for patient portal endpoints.
    It combines user authentication with patient record lookup.

    Args:
        authorization: Authorization header value (JWT token)

    Returns:
        Tuple[Optional[str], Optional[str], Optional[str]]: (user_id, tenant_id, patient_id)
        Returns (None, None, None) if authentication fails or patient not found
    """
    try:
        user_id, tenant_id = get_current_user_id(authorization)
        if not user_id:
            return None, None, None

        patient_id = get_patient_id_from_user_id(user_id, tenant_id)
        return user_id, tenant_id, patient_id

    except Exception as e:
        logger.error(f"Error getting current patient info: {str(e)}")
        return None, None, None


def get_patient_medical_record_no_from_user_id(user_id: str, tenant_id: str) -> Optional[str]:
    """
    Get patient's medical record number from Supabase user_id.

    Args:
        user_id: Supabase user UUID
        tenant_id: Tenant identifier

    Returns:
        Optional[str]: medical_record_no if found, None otherwise
    """
    try:
        # Get Supabase client
        supabase = get_supabase_client()
        if not supabase:
            return None

        # Get user email
        user_response = supabase.auth.admin.get_user_by_id(user_id)
        if not user_response or not user_response.user:
            return None

        user_email = user_response.user.email
        if not user_email:
            return None

        # Find patient by email
        patient = get_patient_by_email(user_email, tenant_id)
        if not patient:
            return None

        return patient.get("medical_record_no")

    except Exception as e:
        logger.error(f"Error getting medical_record_no from user_id: {str(e)}")
        return None
