"""
Case library service layer
Business logic for case management
"""
import logging
from typing import List, Dict, Optional
from consts.exceptions import AgentRunException
from database import case_db

logger = logging.getLogger(__name__)


# ============================================================================
# Case Basic Info Services
# ============================================================================

async def create_case_record(case_data: dict, tenant_id: str, user_id: str) -> dict:
    """
    Create a new case record
    """
    try:
        # Validate required fields
        required_fields = ['case_no', 'diagnosis', 'patient_age', 'patient_gender']
        for field in required_fields:
            if not case_data.get(field):
                raise ValueError(f"Missing required field: {field}")

        # Create case
        result = case_db.create_case(case_data, tenant_id, user_id)
        case_id = result['case_id']

        # Create laboratory tests if provided
        lab_tests = case_data.get('laboratory_tests', [])
        if lab_tests and isinstance(lab_tests, list):
            case_db.batch_create_lab_tests(lab_tests, case_id, tenant_id, user_id)

        return {
            "success": True,
            "case_id": case_id,
            "message": "Case created successfully"
        }
    except Exception as e:
        logger.error(f"Failed to create case: {str(e)}")
        raise AgentRunException(f"Failed to create case: {str(e)}")


async def get_case_info(case_id: int, tenant_id: str) -> Optional[dict]:
    """
    Get case information by ID
    """
    try:
        case = case_db.get_case_by_id(case_id, tenant_id)
        if not case:
            return None

        return case
    except Exception as e:
        logger.error(f"Failed to get case info: {str(e)}")
        raise AgentRunException(f"Failed to get case info: {str(e)}")


async def get_case_detail_service(case_id: int, tenant_id: str) -> Optional[dict]:
    """
    Get detailed case information including laboratory tests
    """
    try:
        case_detail = case_db.get_case_detail(case_id, tenant_id)
        if not case_detail:
            return None

        # Get similar cases (for recommendation)
        if case_detail.get('symptoms'):
            similar_cases = case_db.search_similar_cases(
                symptoms=case_detail['symptoms'],
                tenant_id=tenant_id,
                diagnosis=case_detail.get('diagnosis'),
                limit=5
            )
            # Filter out the current case from similar cases
            case_detail['similar_cases'] = [
                c for c in similar_cases if c['case_id'] != case_id
            ]

        return case_detail
    except Exception as e:
        logger.error(f"Failed to get case detail: {str(e)}")
        raise AgentRunException(f"Failed to get case detail: {str(e)}")


async def list_cases_service(tenant_id: str,
                             search_query: Optional[str] = None,
                             disease_types: Optional[List[str]] = None,
                             age_ranges: Optional[List[str]] = None,
                             gender: Optional[str] = None,
                             limit: int = 100,
                             offset: int = 0) -> List[dict]:
    """
    List cases with search and filters
    """
    try:
        cases = case_db.list_cases(
            tenant_id=tenant_id,
            search_query=search_query,
            disease_types=disease_types,
            age_ranges=age_ranges,
            gender=gender,
            limit=limit,
            offset=offset
        )
        return cases
    except Exception as e:
        logger.error(f"Failed to list cases: {str(e)}")
        raise AgentRunException(f"Failed to list cases: {str(e)}")


async def search_similar_cases_service(symptoms: List[str],
                                       tenant_id: str,
                                       diagnosis: Optional[str] = None,
                                       age: Optional[int] = None,
                                       gender: Optional[str] = None,
                                       limit: int = 10) -> List[dict]:
    """
    Search for similar cases based on symptoms and patient info
    """
    try:
        if not symptoms or not isinstance(symptoms, list):
            raise ValueError("symptoms must be a non-empty list")

        similar_cases = case_db.search_similar_cases(
            symptoms=symptoms,
            tenant_id=tenant_id,
            diagnosis=diagnosis,
            limit=limit
        )

        # For each case, calculate a basic similarity score based on matching symptoms
        # In production, this should use vector similarity search
        for case in similar_cases:
            case_symptoms = case.get('symptoms', [])
            if case_symptoms:
                matching_symptoms = set(symptoms) & set(case_symptoms)
                similarity = (len(matching_symptoms) / max(len(symptoms), len(case_symptoms))) * 100
                case['similarity_score'] = round(similarity, 2)

        # Sort by similarity score
        similar_cases.sort(key=lambda x: x.get('similarity_score', 0), reverse=True)

        return similar_cases
    except Exception as e:
        logger.error(f"Failed to search similar cases: {str(e)}")
        raise AgentRunException(f"Failed to search similar cases: {str(e)}")


async def update_case_info(case_id: int, case_data: dict, tenant_id: str, user_id: str) -> dict:
    """
    Update case information
    """
    try:
        success = case_db.update_case(case_id, case_data, tenant_id, user_id)
        if not success:
            raise ValueError("Case not found")

        return {
            "success": True,
            "message": "Case updated successfully"
        }
    except Exception as e:
        logger.error(f"Failed to update case: {str(e)}")
        raise AgentRunException(f"Failed to update case: {str(e)}")


async def delete_case_record(case_id: int, tenant_id: str, user_id: str) -> dict:
    """
    Delete case record (soft delete)
    """
    try:
        success = case_db.delete_case(case_id, tenant_id, user_id)
        if not success:
            raise ValueError("Case not found")

        return {
            "success": True,
            "message": "Case deleted successfully"
        }
    except Exception as e:
        logger.error(f"Failed to delete case: {str(e)}")
        raise AgentRunException(f"Failed to delete case: {str(e)}")


# ============================================================================
# Laboratory Test Services
# ============================================================================

async def batch_create_lab_tests_service(case_id: int, lab_tests: List[dict],
                                         tenant_id: str, user_id: str) -> dict:
    """
    Batch create laboratory tests for a case
    """
    try:
        if not lab_tests or not isinstance(lab_tests, list):
            raise ValueError("lab_tests must be a non-empty list")

        result = case_db.batch_create_lab_tests(lab_tests, case_id, tenant_id, user_id)
        return {
            "success": True,
            "created_count": result['created_count'],
            "message": f"Created {result['created_count']} laboratory tests successfully"
        }
    except Exception as e:
        logger.error(f"Failed to batch create lab tests: {str(e)}")
        raise AgentRunException(f"Failed to batch create lab tests: {str(e)}")


async def get_case_lab_tests_service(case_id: int, tenant_id: str) -> List[dict]:
    """
    Get all laboratory tests for a case
    """
    try:
        tests = case_db.get_case_lab_tests(case_id, tenant_id)
        return tests
    except Exception as e:
        logger.error(f"Failed to get case lab tests: {str(e)}")
        raise AgentRunException(f"Failed to get case lab tests: {str(e)}")
