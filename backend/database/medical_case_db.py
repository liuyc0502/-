"""
Medical case library database operations
"""
import logging
from typing import List, Dict, Optional
from sqlalchemy import and_, or_, desc, func
from database.client import get_db_session, as_dict
from database.db_models import (
    MedicalCase, MedicalCaseDetail, MedicalCaseSymptom,
    MedicalCaseLabResult, MedicalCaseImage, MedicalCaseFavorite,
    MedicalCaseViewHistory
)

logger = logging.getLogger(__name__)


# ============================================================================
# Medical Case Basic Operations
# ============================================================================

def create_medical_case(case_data: dict, tenant_id: str, user_id: str) -> dict:
    """
    Create a new medical case
    """
    with get_db_session() as session:
        new_case = MedicalCase(
            case_no=case_data.get('case_no'),
            case_title=case_data.get('case_title'),
            diagnosis=case_data.get('diagnosis'),
            disease_type=case_data.get('disease_type'),
            age=case_data.get('age'),
            gender=case_data.get('gender'),
            chief_complaint=case_data.get('chief_complaint'),
            category=case_data.get('category'),
            tags=case_data.get('tags', []),
            is_classic=case_data.get('is_classic', False),
            tenant_id=tenant_id,
            created_by=user_id,
            updated_by=user_id,
            delete_flag='N'
        )
        session.add(new_case)
        session.flush()

        case_id = new_case.case_id
        session.commit()

        logger.info(f"Created medical case: {case_id}")
        return {"case_id": case_id}


def get_case_by_id(case_id: int, tenant_id: str) -> Optional[dict]:
    """
    Get medical case by ID
    """
    with get_db_session() as session:
        case = session.query(MedicalCase).filter(
            MedicalCase.case_id == case_id,
            MedicalCase.tenant_id == tenant_id,
            MedicalCase.delete_flag != 'Y'
        ).first()
        if case:
            return as_dict(case)
        return None


def get_case_by_case_no(case_no: str, tenant_id: str) -> Optional[dict]:
    """
    Get medical case by case number
    """
    with get_db_session() as session:
        case = session.query(MedicalCase).filter(
            MedicalCase.case_no == case_no,
            MedicalCase.tenant_id == tenant_id,
            MedicalCase.delete_flag != 'Y'
        ).first()
        if case:
            return as_dict(case)
        return None


def list_medical_cases(
    tenant_id: str,
    search_query: Optional[str] = None,
    disease_types: Optional[List[str]] = None,
    age_range: Optional[tuple] = None,
    gender: Optional[str] = None,
    is_classic: Optional[bool] = None,
    limit: int = 100,
    offset: int = 0
) -> List[dict]:
    """
    List medical cases with optional filters
    """
    with get_db_session() as session:
        query = session.query(MedicalCase).filter(
            MedicalCase.tenant_id == tenant_id,
            MedicalCase.delete_flag != 'Y'
        )

        # Apply search query (search in diagnosis, symptoms, case_no)
        if search_query:
            search_pattern = f"%{search_query}%"
            query = query.filter(
                or_(
                    MedicalCase.diagnosis.ilike(search_pattern),
                    MedicalCase.case_no.ilike(search_pattern),
                    MedicalCase.chief_complaint.ilike(search_pattern)
                )
            )

        # Filter by disease types
        if disease_types and len(disease_types) > 0:
            query = query.filter(MedicalCase.disease_type.in_(disease_types))

        # Filter by age range
        if age_range:
            min_age, max_age = age_range
            query = query.filter(
                and_(
                    MedicalCase.age >= min_age,
                    MedicalCase.age <= max_age
                )
            )

        # Filter by gender
        if gender:
            query = query.filter(MedicalCase.gender == gender)

        # Filter by is_classic
        if is_classic is not None:
            query = query.filter(MedicalCase.is_classic == is_classic)

        cases = query.order_by(
            MedicalCase.is_classic.desc(),
            MedicalCase.view_count.desc(),
            MedicalCase.create_time.desc()
        ).limit(limit).offset(offset).all()

        return [as_dict(c) for c in cases]


def search_cases_with_symptoms(
    tenant_id: str,
    search_query: str,
    limit: int = 10
) -> List[dict]:
    """
    Search cases by symptoms (natural language query)
    Returns cases with their symptoms
    """
    with get_db_session() as session:
        # Search in case details and symptoms
        search_pattern = f"%{search_query}%"

        cases = session.query(MedicalCase).filter(
            MedicalCase.tenant_id == tenant_id,
            MedicalCase.delete_flag != 'Y',
            or_(
                MedicalCase.diagnosis.ilike(search_pattern),
                MedicalCase.chief_complaint.ilike(search_pattern)
            )
        ).order_by(
            MedicalCase.view_count.desc()
        ).limit(limit).all()

        result = []
        for case in cases:
            case_dict = as_dict(case)

            # Get symptoms for this case
            symptoms = session.query(MedicalCaseSymptom).filter(
                MedicalCaseSymptom.case_id == case.case_id,
                MedicalCaseSymptom.tenant_id == tenant_id,
                MedicalCaseSymptom.delete_flag != 'Y'
            ).all()
            case_dict['symptoms'] = [s.symptom_name for s in symptoms]

            result.append(case_dict)

        return result


def update_medical_case(case_id: int, case_data: dict, tenant_id: str, user_id: str) -> bool:
    """
    Update medical case information
    """
    with get_db_session() as session:
        case = session.query(MedicalCase).filter(
            MedicalCase.case_id == case_id,
            MedicalCase.tenant_id == tenant_id,
            MedicalCase.delete_flag != 'Y'
        ).first()
        if not case:
            return False

        # Update fields
        for key, value in case_data.items():
            if hasattr(case, key) and value is not None:
                setattr(case, key, value)

        case.updated_by = user_id
        session.commit()

        logger.info(f"Updated medical case: {case_id}")
        return True


def delete_medical_case(case_id: int, tenant_id: str, user_id: str) -> bool:
    """
    Soft delete medical case (set delete_flag='Y')
    """
    with get_db_session() as session:
        case = session.query(MedicalCase).filter(
            MedicalCase.case_id == case_id,
            MedicalCase.tenant_id == tenant_id,
            MedicalCase.delete_flag != 'Y'
        ).first()

        if not case:
            return False

        case.delete_flag = 'Y'
        case.updated_by = user_id
        session.commit()

        logger.info(f"Deleted medical case: {case_id}")
        return True


def increment_view_count(case_id: int, tenant_id: str) -> bool:
    """
    Increment case view count
    """
    with get_db_session() as session:
        case = session.query(MedicalCase).filter(
            MedicalCase.case_id == case_id,
            MedicalCase.tenant_id == tenant_id,
            MedicalCase.delete_flag != 'Y'
        ).first()

        if not case:
            return False

        case.view_count = (case.view_count or 0) + 1
        session.commit()

        return True


# ============================================================================
# Medical Case Detail Operations
# ============================================================================

def create_case_detail(detail_data: dict, tenant_id: str, user_id: str) -> dict:
    """
    Create or update case detail information
    """
    with get_db_session() as session:
        case_id = detail_data.get('case_id')

        # Check if detail already exists
        existing_detail = session.query(MedicalCaseDetail).filter(
            MedicalCaseDetail.case_id == case_id,
            MedicalCaseDetail.tenant_id == tenant_id,
            MedicalCaseDetail.delete_flag != 'Y'
        ).first()

        if existing_detail:
            # Update existing detail
            for key, value in detail_data.items():
                if hasattr(existing_detail, key) and key != 'case_id':
                    setattr(existing_detail, key, value)
            existing_detail.updated_by = user_id
            detail_id = existing_detail.detail_id
        else:
            # Create new detail
            new_detail = MedicalCaseDetail(
                case_id=case_id,
                present_illness_history=detail_data.get('present_illness_history'),
                past_medical_history=detail_data.get('past_medical_history'),
                family_history=detail_data.get('family_history'),
                physical_examination=detail_data.get('physical_examination', {}),
                imaging_results=detail_data.get('imaging_results', {}),
                diagnosis_basis=detail_data.get('diagnosis_basis'),
                treatment_plan=detail_data.get('treatment_plan'),
                medications=detail_data.get('medications', []),
                prognosis=detail_data.get('prognosis'),
                clinical_notes=detail_data.get('clinical_notes'),
                tenant_id=tenant_id,
                created_by=user_id,
                updated_by=user_id,
                delete_flag='N'
            )
            session.add(new_detail)
            session.flush()
            detail_id = new_detail.detail_id

        session.commit()
        logger.info(f"Created/Updated case detail: {detail_id} for case: {case_id}")
        return {"detail_id": detail_id}


def get_case_detail(case_id: int, tenant_id: str) -> Optional[dict]:
    """
    Get complete case information including detail, symptoms, lab results
    """
    with get_db_session() as session:
        # Get case basic info
        case = session.query(MedicalCase).filter(
            MedicalCase.case_id == case_id,
            MedicalCase.tenant_id == tenant_id,
            MedicalCase.delete_flag != 'Y'
        ).first()

        if not case:
            return None

        case_dict = as_dict(case)

        # Get detail info
        detail = session.query(MedicalCaseDetail).filter(
            MedicalCaseDetail.case_id == case_id,
            MedicalCaseDetail.tenant_id == tenant_id,
            MedicalCaseDetail.delete_flag != 'Y'
        ).first()

        if detail:
            case_dict['detail'] = as_dict(detail)

        # Get symptoms
        symptoms = session.query(MedicalCaseSymptom).filter(
            MedicalCaseSymptom.case_id == case_id,
            MedicalCaseSymptom.tenant_id == tenant_id,
            MedicalCaseSymptom.delete_flag != 'Y'
        ).all()
        case_dict['symptoms'] = [as_dict(s) for s in symptoms]

        # Get lab results
        lab_results = session.query(MedicalCaseLabResult).filter(
            MedicalCaseLabResult.case_id == case_id,
            MedicalCaseLabResult.tenant_id == tenant_id,
            MedicalCaseLabResult.delete_flag != 'Y'
        ).all()
        case_dict['lab_results'] = [as_dict(lr) for lr in lab_results]

        # Get images
        images = session.query(MedicalCaseImage).filter(
            MedicalCaseImage.case_id == case_id,
            MedicalCaseImage.tenant_id == tenant_id,
            MedicalCaseImage.delete_flag != 'Y'
        ).order_by(MedicalCaseImage.display_order.asc()).all()
        case_dict['images'] = [as_dict(img) for img in images]

        return case_dict


# ============================================================================
# Symptom Operations
# ============================================================================

def create_case_symptom(symptom_data: dict, tenant_id: str, user_id: str) -> dict:
    """
    Create a case symptom
    """
    with get_db_session() as session:
        new_symptom = MedicalCaseSymptom(
            case_id=symptom_data.get('case_id'),
            symptom_name=symptom_data.get('symptom_name'),
            symptom_description=symptom_data.get('symptom_description'),
            is_key_symptom=symptom_data.get('is_key_symptom', False),
            tenant_id=tenant_id,
            created_by=user_id,
            updated_by=user_id,
            delete_flag='N'
        )
        session.add(new_symptom)
        session.flush()

        symptom_id = new_symptom.symptom_id
        session.commit()

        logger.info(f"Created case symptom: {symptom_id}")
        return {"symptom_id": symptom_id}


def batch_create_symptoms(symptoms_data: List[dict], tenant_id: str, user_id: str) -> dict:
    """
    Batch create case symptoms
    """
    with get_db_session() as session:
        created_count = 0
        for symptom_data in symptoms_data:
            new_symptom = MedicalCaseSymptom(
                case_id=symptom_data.get('case_id'),
                symptom_name=symptom_data.get('symptom_name'),
                symptom_description=symptom_data.get('symptom_description'),
                is_key_symptom=symptom_data.get('is_key_symptom', False),
                tenant_id=tenant_id,
                created_by=user_id,
                updated_by=user_id,
                delete_flag='N'
            )
            session.add(new_symptom)
            created_count += 1

        session.commit()
        logger.info(f"Created {created_count} symptoms")
        return {"created_count": created_count}


# ============================================================================
# Lab Result Operations
# ============================================================================

def batch_create_lab_results(lab_results_data: List[dict], tenant_id: str, user_id: str) -> dict:
    """
    Batch create lab results
    """
    with get_db_session() as session:
        created_count = 0
        for lab_data in lab_results_data:
            new_lab = MedicalCaseLabResult(
                case_id=lab_data.get('case_id'),
                test_name=lab_data.get('test_name'),
                test_full_name=lab_data.get('test_full_name'),
                test_value=lab_data.get('test_value'),
                test_unit=lab_data.get('test_unit'),
                normal_range=lab_data.get('normal_range'),
                is_abnormal=lab_data.get('is_abnormal', False),
                abnormal_indicator=lab_data.get('abnormal_indicator'),
                tenant_id=tenant_id,
                created_by=user_id,
                updated_by=user_id,
                delete_flag='N'
            )
            session.add(new_lab)
            created_count += 1

        session.commit()
        logger.info(f"Created {created_count} lab results")
        return {"created_count": created_count}


# ============================================================================
# Favorite Operations
# ============================================================================

def add_favorite(case_id: int, user_id: str, tenant_id: str) -> dict:
    """
    Add case to user favorites
    """
    with get_db_session() as session:
        # Check if already favorited
        existing = session.query(MedicalCaseFavorite).filter(
            MedicalCaseFavorite.case_id == case_id,
            MedicalCaseFavorite.user_id == user_id,
            MedicalCaseFavorite.tenant_id == tenant_id,
            MedicalCaseFavorite.delete_flag != 'Y'
        ).first()

        if existing:
            return {"favorite_id": existing.favorite_id, "already_favorited": True}

        new_favorite = MedicalCaseFavorite(
            case_id=case_id,
            user_id=user_id,
            tenant_id=tenant_id,
            created_by=user_id,
            updated_by=user_id,
            delete_flag='N'
        )
        session.add(new_favorite)
        session.flush()

        favorite_id = new_favorite.favorite_id
        session.commit()

        logger.info(f"Added favorite: {favorite_id}")
        return {"favorite_id": favorite_id, "already_favorited": False}


def remove_favorite(case_id: int, user_id: str, tenant_id: str) -> bool:
    """
    Remove case from user favorites
    """
    with get_db_session() as session:
        favorite = session.query(MedicalCaseFavorite).filter(
            MedicalCaseFavorite.case_id == case_id,
            MedicalCaseFavorite.user_id == user_id,
            MedicalCaseFavorite.tenant_id == tenant_id,
            MedicalCaseFavorite.delete_flag != 'Y'
        ).first()

        if not favorite:
            return False

        favorite.delete_flag = 'Y'
        favorite.updated_by = user_id
        session.commit()

        logger.info(f"Removed favorite for case: {case_id}, user: {user_id}")
        return True


def get_user_favorites(user_id: str, tenant_id: str, limit: int = 100, offset: int = 0) -> List[dict]:
    """
    Get user's favorite cases
    """
    with get_db_session() as session:
        favorites = session.query(MedicalCase).join(
            MedicalCaseFavorite,
            and_(
                MedicalCase.case_id == MedicalCaseFavorite.case_id,
                MedicalCaseFavorite.user_id == user_id,
                MedicalCaseFavorite.tenant_id == tenant_id,
                MedicalCaseFavorite.delete_flag != 'Y'
            )
        ).filter(
            MedicalCase.tenant_id == tenant_id,
            MedicalCase.delete_flag != 'Y'
        ).order_by(MedicalCaseFavorite.create_time.desc()).limit(limit).offset(offset).all()

        result = []
        for case in favorites:
            case_dict = as_dict(case)
            # Get symptoms
            symptoms = session.query(MedicalCaseSymptom).filter(
                MedicalCaseSymptom.case_id == case.case_id,
                MedicalCaseSymptom.tenant_id == tenant_id,
                MedicalCaseSymptom.delete_flag != 'Y'
            ).all()
            case_dict['symptoms'] = [s.symptom_name for s in symptoms]
            result.append(case_dict)

        return result


# ============================================================================
# View History Operations
# ============================================================================

def add_view_history(case_id: int, user_id: str, tenant_id: str) -> dict:
    """
    Add case view history record
    """
    with get_db_session() as session:
        new_history = MedicalCaseViewHistory(
            case_id=case_id,
            user_id=user_id,
            tenant_id=tenant_id,
            created_by=user_id,
            updated_by=user_id,
            delete_flag='N'
        )
        session.add(new_history)
        session.flush()

        history_id = new_history.history_id
        session.commit()

        # Also increment view count
        increment_view_count(case_id, tenant_id)

        logger.info(f"Added view history: {history_id}")
        return {"history_id": history_id}


def get_user_view_history(user_id: str, tenant_id: str, limit: int = 50) -> List[dict]:
    """
    Get user's view history (recent cases)
    """
    with get_db_session() as session:
        # Get distinct case IDs from view history, ordered by most recent view
        subquery = session.query(
            MedicalCaseViewHistory.case_id,
            func.max(MedicalCaseViewHistory.view_time).label('latest_view')
        ).filter(
            MedicalCaseViewHistory.user_id == user_id,
            MedicalCaseViewHistory.tenant_id == tenant_id,
            MedicalCaseViewHistory.delete_flag != 'Y'
        ).group_by(MedicalCaseViewHistory.case_id).subquery()

        cases = session.query(MedicalCase, subquery.c.latest_view).join(
            subquery,
            MedicalCase.case_id == subquery.c.case_id
        ).filter(
            MedicalCase.tenant_id == tenant_id,
            MedicalCase.delete_flag != 'Y'
        ).order_by(desc(subquery.c.latest_view)).limit(limit).all()

        result = []
        for case, latest_view in cases:
            case_dict = as_dict(case)
            case_dict['latest_view_time'] = latest_view.isoformat() if latest_view else None

            # Get symptoms
            symptoms = session.query(MedicalCaseSymptom).filter(
                MedicalCaseSymptom.case_id == case.case_id,
                MedicalCaseSymptom.tenant_id == tenant_id,
                MedicalCaseSymptom.delete_flag != 'Y'
            ).all()
            case_dict['symptoms'] = [s.symptom_name for s in symptoms]

            result.append(case_dict)

        return result
