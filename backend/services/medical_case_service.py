import logging
from typing import List, Dict, Optional
from consts.exceptions import AgentRunException
from database import medical_case_db
logger = logging.getLogger(__name__)


# ============================================================================
# Medical Case Basic Services
# ============================================================================

async def create_case(case_data: dict, tenant_id: str, user_id: str) -> dict:
    """
    Create a new medical case
    """
    try:
        # Validate required fields
        required_fields = ['case_no', 'diagnosis', 'disease_type', 'age', 'gender']
        for field in required_fields:
            if not case_data.get(field):
                raise ValueError(f"Missing required field: {field}")

        result = medical_case_db.create_medical_case(case_data, tenant_id, user_id)
        return {
            "success": True,
            "case_id": result['case_id'],
            "message": "Medical case created successfully"
        }
    except Exception as e:
        logger.error(f"Failed to create medical case: {str(e)}")
        raise AgentRunException(f"Failed to create medical case: {str(e)}")


async def get_case_info(case_id: int, tenant_id: str, user_id: Optional[str] = None) -> Optional[dict]:
    """
    Get medical case information by ID
    Also records view history if user_id is provided
    """
    try:
        case = medical_case_db.get_case_detail(case_id, tenant_id)
        if not case:
            return None

        # Record view history
        if user_id:
            medical_case_db.add_view_history(case_id, user_id, tenant_id)

        return case
    except Exception as e:
        logger.error(f"Failed to get case info: {str(e)}")
        raise AgentRunException(f"Failed to get case info: {str(e)}")


async def get_case_by_case_no(case_no: str, tenant_id: str, user_id: Optional[str] = None) -> Optional[dict]:
    """
    Get medical case by case number
    """
    try:
        case = medical_case_db.get_case_by_case_no(case_no, tenant_id)
        if not case:
            return None

        # Get full details
        case_detail = medical_case_db.get_case_detail(case['case_id'], tenant_id)

        # Record view history
        if user_id:
            medical_case_db.add_view_history(case['case_id'], user_id, tenant_id)

        return case_detail
    except Exception as e:
        logger.error(f"Failed to get case by case_no: {str(e)}")
        raise AgentRunException(f"Failed to get case by case_no: {str(e)}")


async def list_cases(
    tenant_id: str,
    search_query: Optional[str] = None,
    disease_types: Optional[List[str]] = None,
    age_range: Optional[str] = None,
    gender: Optional[str] = None,
    is_classic: Optional[bool] = None,
    limit: int = 100,
    offset: int = 0
) -> List[dict]:
    """
    List medical cases with filters
    """
    try:
        # Parse age range
        age_range_tuple = None
        if age_range:
            if age_range == "<30":
                age_range_tuple = (0, 29)
            elif age_range == "30-50":
                age_range_tuple = (30, 50)
            elif age_range == "50-70":
                age_range_tuple = (50, 70)
            elif age_range == ">70":
                age_range_tuple = (70, 150)

        cases = medical_case_db.list_medical_cases(
            tenant_id=tenant_id,
            search_query=search_query,
            disease_types=disease_types,
            age_range=age_range_tuple,
            gender=gender,
            is_classic=is_classic,
            limit=limit,
            offset=offset
        )

        # Get symptoms for each case
        result = []
        for case in cases:
            case_with_symptoms = medical_case_db.get_case_by_id(case['case_id'], tenant_id)
            if case_with_symptoms:
                # Get symptoms
                symptoms = medical_case_db.get_case_detail(case['case_id'], tenant_id)
                if symptoms and 'symptoms' in symptoms:
                    case['symptoms'] = [s['symptom_name'] for s in symptoms['symptoms']]
                else:
                    case['symptoms'] = []
                result.append(case)

        return result
    except Exception as e:
        logger.error(f"Failed to list cases: {str(e)}")
        raise AgentRunException(f"Failed to list cases: {str(e)}")


async def search_cases(
    tenant_id: str,
    search_query: str,
    limit: int = 10
) -> List[dict]:
    """
    Search cases by natural language query (symptoms, diagnosis, etc.)
    """
    try:
        cases = medical_case_db.search_cases_with_symptoms(
            tenant_id=tenant_id,
            search_query=search_query,
            limit=limit
        )
        return cases
    except Exception as e:
        logger.error(f"Failed to search cases: {str(e)}")
        raise AgentRunException(f"Failed to search cases: {str(e)}")


async def update_case(case_id: int, case_data: dict, tenant_id: str, user_id: str) -> dict:
    """
    Update medical case information
    """
    try:
        success = medical_case_db.update_medical_case(case_id, case_data, tenant_id, user_id)
        if not success:
            raise ValueError("Medical case not found")

        return {
            "success": True,
            "message": "Medical case updated successfully"
        }
    except Exception as e:
        logger.error(f"Failed to update medical case: {str(e)}")
        raise AgentRunException(f"Failed to update medical case: {str(e)}")


async def delete_case(case_id: int, tenant_id: str, user_id: str) -> dict:
    """
    Delete medical case (soft delete)
    """
    try:
        success = medical_case_db.delete_medical_case(case_id, tenant_id, user_id)
        if not success:
            raise ValueError("Medical case not found")

        return {
            "success": True,
            "message": "Medical case deleted successfully"
        }
    except Exception as e:
        logger.error(f"Failed to delete medical case: {str(e)}")
        raise AgentRunException(f"Failed to delete medical case: {str(e)}")


# ============================================================================
# Favorite Services
# ============================================================================

async def toggle_favorite(case_id: int, user_id: str, tenant_id: str, action: str) -> dict:
    """
    Toggle case favorite (add or remove)
    action: 'add' or 'remove'
    """
    try:
        if action == 'add':
            result = medical_case_db.add_favorite(case_id, user_id, tenant_id)
            return {
                "success": True,
                "favorited": True,
                "message": "Added to favorites" if not result.get('already_favorited') else "Already in favorites"
            }
        elif action == 'remove':
            success = medical_case_db.remove_favorite(case_id, user_id, tenant_id)
            return {
                "success": success,
                "favorited": False,
                "message": "Removed from favorites" if success else "Favorite not found"
            }
        else:
            raise ValueError(f"Invalid action: {action}. Use 'add' or 'remove'")
    except Exception as e:
        logger.error(f"Failed to toggle favorite: {str(e)}")
        raise AgentRunException(f"Failed to toggle favorite: {str(e)}")


async def get_user_favorites(user_id: str, tenant_id: str, limit: int = 100, offset: int = 0) -> List[dict]:
    """
    Get user's favorite cases
    """
    try:
        favorites = medical_case_db.get_user_favorites(user_id, tenant_id, limit, offset)
        return favorites
    except Exception as e:
        logger.error(f"Failed to get user favorites: {str(e)}")
        raise AgentRunException(f"Failed to get user favorites: {str(e)}")


# ============================================================================
# View History Services
# ============================================================================

async def get_recent_cases(user_id: str, tenant_id: str, limit: int = 50) -> List[dict]:
    """
    Get user's recently viewed cases
    """
    try:
        recent_cases = medical_case_db.get_user_view_history(user_id, tenant_id, limit)
        return recent_cases
    except Exception as e:
        logger.error(f"Failed to get recent cases: {str(e)}")
        raise AgentRunException(f"Failed to get recent cases: {str(e)}")


# ============================================================================
# Case Detail Services
# ============================================================================

async def create_or_update_case_detail(detail_data: dict, tenant_id: str, user_id: str) -> dict:
    """
    Create or update case detail information
    """
    try:
        result = medical_case_db.create_case_detail(detail_data, tenant_id, user_id)
        return {
            "success": True,
            "detail_id": result['detail_id'],
            "message": "Case detail saved successfully"
        }
    except Exception as e:
        logger.error(f"Failed to save case detail: {str(e)}")
        raise AgentRunException(f"Failed to save case detail: {str(e)}")


async def batch_add_symptoms(case_id: int, symptoms: List[str], tenant_id: str, user_id: str) -> dict:
    """
    Batch add symptoms to a case
    """
    try:
        symptoms_data = [
            {
                "case_id": case_id,
                "symptom_name": symptom,
                "is_key_symptom": True
            }
            for symptom in symptoms
        ]
        result = medical_case_db.batch_create_symptoms(symptoms_data, tenant_id, user_id)
        return {
            "success": True,
            "created_count": result['created_count'],
            "message": f"Added {result['created_count']} symptoms"
        }
    except Exception as e:
        logger.error(f"Failed to batch add symptoms: {str(e)}")
        raise AgentRunException(f"Failed to batch add symptoms: {str(e)}")


async def batch_add_lab_results(case_id: int, lab_results: List[dict], tenant_id: str, user_id: str) -> dict:
    """
    Batch add lab results to a case
    """
    try:
        # Add case_id to each lab result
        for lab_result in lab_results:
            lab_result['case_id'] = case_id

        result = medical_case_db.batch_create_lab_results(lab_results, tenant_id, user_id)
        return {
            "success": True,
            "created_count": result['created_count'],
            "message": f"Added {result['created_count']} lab results"
        }
    except Exception as e:
        logger.error(f"Failed to batch add lab results: {str(e)}")
        raise AgentRunException(f"Failed to batch add lab results: {str(e)}")


async def delete_lab_results(case_id: int, tenant_id: str, user_id: str) -> dict:
    """
    Delete all lab results for a case
    """
    try:
        success = medical_case_db.delete_case_lab_results(case_id, tenant_id, user_id)
        return {
            "success": success,
            "message": "Lab results deleted successfully"
        }
    except Exception as e:
        logger.error(f"Failed to delete lab results: {str(e)}")
        raise AgentRunException(f"Failed to delete lab results: {str(e)}")


async def delete_symptoms(case_id: int, tenant_id: str, user_id: str) -> dict:
    """
    Delete all symptoms for a case
    """
    try:
        success = medical_case_db.delete_case_symptoms(case_id, tenant_id, user_id)
        return {
            "success": success,
            "message": "Symptoms deleted successfully"
        }
    except Exception as e:
        logger.error(f"Failed to delete symptoms: {str(e)}")
        raise AgentRunException(f"Failed to delete symptoms: {str(e)}")


# ============================================================================
# Image Services
# ============================================================================

async def batch_add_images(case_id: int, images: List[dict], tenant_id: str, user_id: str) -> dict:
    """
    Batch add images to a case
    """
    try:
        # Add case_id to each image
        for image in images:
            image['case_id'] = case_id

        result = medical_case_db.batch_create_case_images(images, tenant_id, user_id)
        return {
            "success": True,
            "created_count": result['created_count'],
            "message": f"Added {result['created_count']} images"
        }
    except Exception as e:
        logger.error(f"Failed to batch add images: {str(e)}")
        raise AgentRunException(f"Failed to batch add images: {str(e)}")


async def delete_images(case_id: int, tenant_id: str, user_id: str) -> dict:
    """
    Delete all images for a case
    """
    try:
        success = medical_case_db.delete_case_images(case_id, tenant_id, user_id)
        return {
            "success": success,
            "message": "Images deleted successfully"
        }
    except Exception as e:
        logger.error(f"Failed to delete images: {str(e)}")
        raise AgentRunException(f"Failed to delete images: {str(e)}")
