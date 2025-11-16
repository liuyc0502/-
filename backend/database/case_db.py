"""
Case library database operations
"""
import logging
from typing import List, Dict, Optional
from sqlalchemy import and_, or_
from database.client import get_db_session, as_dict
from database.db_models import CaseInfo, CaseLaboratoryTest

logger = logging.getLogger(__name__)


# ============================================================================
# Case Basic Info Operations
# ============================================================================

def create_case(case_data: dict, tenant_id: str, user_id: str) -> dict:
    """
    Create a new case record
    """
    with get_db_session() as session:
        new_case = CaseInfo(
            case_no=case_data.get('case_no'),
            diagnosis=case_data.get('diagnosis'),
            patient_age=case_data.get('patient_age'),
            patient_gender=case_data.get('patient_gender'),
            chief_complaint=case_data.get('chief_complaint'),
            present_illness=case_data.get('present_illness'),
            past_medical_history=case_data.get('past_medical_history'),
            physical_examination=case_data.get('physical_examination'),
            imaging_findings=case_data.get('imaging_findings'),
            treatment_plan=case_data.get('treatment_plan'),
            prognosis=case_data.get('prognosis'),
            symptoms=case_data.get('symptoms', []),
            similarity_score=case_data.get('similarity_score', 0.0),
            tenant_id=tenant_id,
            created_by=user_id,
            updated_by=user_id,
            delete_flag='N'
        )
        session.add(new_case)
        session.flush()

        case_id = new_case.case_id
        session.commit()

        logger.info(f"Created case: {case_id}")
        return {"case_id": case_id}


def get_case_by_id(case_id: int, tenant_id: str) -> Optional[dict]:
    """
    Get case by ID
    """
    with get_db_session() as session:
        case = session.query(CaseInfo).filter(
            CaseInfo.case_id == case_id,
            CaseInfo.tenant_id == tenant_id,
            CaseInfo.delete_flag != 'Y'
        ).first()

        if case:
            return as_dict(case)
        return None


def get_case_detail(case_id: int, tenant_id: str) -> Optional[dict]:
    """
    Get case detail with laboratory tests
    """
    with get_db_session() as session:
        # Get case basic info
        case = session.query(CaseInfo).filter(
            CaseInfo.case_id == case_id,
            CaseInfo.tenant_id == tenant_id,
            CaseInfo.delete_flag != 'Y'
        ).first()

        if not case:
            return None

        case_dict = as_dict(case)

        # Get laboratory tests
        lab_tests = session.query(CaseLaboratoryTest).filter(
            CaseLaboratoryTest.case_id == case_id,
            CaseLaboratoryTest.tenant_id == tenant_id,
            CaseLaboratoryTest.delete_flag != 'Y'
        ).all()
        case_dict['laboratory_tests'] = [as_dict(t) for t in lab_tests]

        return case_dict


def list_cases(tenant_id: str, search_query: Optional[str] = None,
               disease_types: Optional[List[str]] = None,
               age_ranges: Optional[List[str]] = None,
               gender: Optional[str] = None,
               limit: int = 100, offset: int = 0) -> List[dict]:
    """
    List cases with optional search and filters
    """
    with get_db_session() as session:
        query = session.query(CaseInfo).filter(
            CaseInfo.tenant_id == tenant_id,
            CaseInfo.delete_flag != 'Y'
        )

        # Apply search query - search in diagnosis and symptoms
        if search_query:
            search_pattern = f"%{search_query}%"
            query = query.filter(
                or_(
                    CaseInfo.diagnosis.ilike(search_pattern),
                    CaseInfo.case_no.ilike(search_pattern),
                    CaseInfo.chief_complaint.ilike(search_pattern)
                )
            )

        # Filter by disease types (diagnosis contains any of the types)
        if disease_types and len(disease_types) > 0:
            disease_filters = [CaseInfo.diagnosis.ilike(f"%{dt}%") for dt in disease_types]
            query = query.filter(or_(*disease_filters))

        # Filter by age ranges
        if age_ranges and len(age_ranges) > 0:
            age_filters = []
            for age_range in age_ranges:
                if age_range == "<30岁":
                    age_filters.append(CaseInfo.patient_age < 30)
                elif age_range == "30-50岁":
                    age_filters.append(and_(CaseInfo.patient_age >= 30, CaseInfo.patient_age <= 50))
                elif age_range == "50-70岁":
                    age_filters.append(and_(CaseInfo.patient_age >= 50, CaseInfo.patient_age <= 70))
                elif age_range == ">70岁":
                    age_filters.append(CaseInfo.patient_age > 70)
            if age_filters:
                query = query.filter(or_(*age_filters))

        # Filter by gender
        if gender:
            query = query.filter(CaseInfo.patient_gender == gender)

        cases = query.order_by(CaseInfo.create_time.desc()).limit(limit).offset(offset).all()
        return [as_dict(c) for c in cases]


def search_similar_cases(symptoms: List[str], tenant_id: str,
                        diagnosis: Optional[str] = None,
                        limit: int = 10) -> List[dict]:
    """
    Search for similar cases based on symptoms and diagnosis
    This is a simplified version - can be enhanced with vector similarity search
    """
    with get_db_session() as session:
        query = session.query(CaseInfo).filter(
            CaseInfo.tenant_id == tenant_id,
            CaseInfo.delete_flag != 'Y'
        )

        # Filter by diagnosis if provided
        if diagnosis:
            query = query.filter(CaseInfo.diagnosis.ilike(f"%{diagnosis}%"))

        # For now, just return cases ordered by similarity_score
        # In production, implement proper vector similarity search
        cases = query.order_by(CaseInfo.similarity_score.desc()).limit(limit).all()
        return [as_dict(c) for c in cases]


def update_case(case_id: int, case_data: dict, tenant_id: str, user_id: str) -> bool:
    """
    Update case information
    """
    with get_db_session() as session:
        case = session.query(CaseInfo).filter(
            CaseInfo.case_id == case_id,
            CaseInfo.tenant_id == tenant_id,
            CaseInfo.delete_flag != 'Y'
        ).first()

        if not case:
            return False

        # Update fields
        for key, value in case_data.items():
            if hasattr(case, key) and value is not None:
                setattr(case, key, value)

        case.updated_by = user_id
        session.commit()

        logger.info(f"Updated case: {case_id}")
        return True


def delete_case(case_id: int, tenant_id: str, user_id: str) -> bool:
    """
    Soft delete case (set delete_flag='Y')
    """
    with get_db_session() as session:
        case = session.query(CaseInfo).filter(
            CaseInfo.case_id == case_id,
            CaseInfo.tenant_id == tenant_id,
            CaseInfo.delete_flag != 'Y'
        ).first()

        if not case:
            return False

        case.delete_flag = 'Y'
        case.updated_by = user_id
        session.commit()

        logger.info(f"Deleted case: {case_id}")
        return True


# ============================================================================
# Laboratory Test Operations
# ============================================================================

def batch_create_lab_tests(lab_tests: List[dict], case_id: int, tenant_id: str, user_id: str) -> dict:
    """
    Batch create laboratory tests for a case
    """
    with get_db_session() as session:
        created_count = 0
        for test_data in lab_tests:
            new_test = CaseLaboratoryTest(
                case_id=case_id,
                test_name=test_data.get('test_name'),
                test_value=test_data.get('test_value'),
                test_unit=test_data.get('test_unit'),
                normal_range=test_data.get('normal_range'),
                is_abnormal=test_data.get('is_abnormal', False),
                tenant_id=tenant_id,
                created_by=user_id,
                updated_by=user_id,
                delete_flag='N'
            )
            session.add(new_test)
            created_count += 1

        session.commit()
        logger.info(f"Created {created_count} laboratory tests for case: {case_id}")
        return {"created_count": created_count}


def get_case_lab_tests(case_id: int, tenant_id: str) -> List[dict]:
    """
    Get all laboratory tests for a case
    """
    with get_db_session() as session:
        tests = session.query(CaseLaboratoryTest).filter(
            CaseLaboratoryTest.case_id == case_id,
            CaseLaboratoryTest.tenant_id == tenant_id,
            CaseLaboratoryTest.delete_flag != 'Y'
        ).all()

        return [as_dict(t) for t in tests]
