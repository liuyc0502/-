"""
Medical Case Tools - Atomic MCP Tools
Case library search and retrieval tools.
"""
import logging
from typing import Optional, Dict, Any, List
from fastmcp import FastMCP
from consts.const import DEFAULT_TENANT_ID
from database.medical_case_db import (
    list_medical_cases,
    get_case_detail,
    search_cases_with_symptoms
)

logger = logging.getLogger(__name__)
medical_case_tools = FastMCP("medical_cases")


@medical_case_tools.tool()
async def search_medical_cases(
    search_query: Optional[str] = None,
    disease_type: Optional[str] = None,
    age_range: Optional[tuple] = None,
    gender: Optional[str] = None,
    is_classic: Optional[bool] = None,
    limit: int = 10,
    tenant_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Search medical case library with various filters.

    Use this tool when:
    - Patient asks "Are there similar cases to mine?"
    - Need reference cases for a diagnosis
    - Looking for treatment approaches used in similar cases
    - Patient wants to learn from others' experiences

    Args:
        search_query: Free text search (diagnosis, symptoms, etc), optional
        disease_type: Filter by disease type (e.g., "肺癌", "乳腺癌"), optional
        age_range: Filter by age range as tuple (min, max), optional
        gender: Filter by gender (male/female), optional
        is_classic: Filter classic teaching cases only, optional
        limit: Maximum cases to return (default 10)
        tenant_id: Tenant identifier (optional)

    Returns:
        - total_cases: Number of cases found
        - cases: List of case summaries, each containing:
          - case_id: Use this to get full case details
          - case_title: Case title
          - diagnosis: Primary diagnosis
          - disease_type: Disease category
          - age: Patient age (anonymized to decade)
          - gender: Patient gender
          - chief_complaint: Main complaint
          - is_classic: Whether it's a classic teaching case
          - tags: Case tags for categorization

    Next steps:
    - Call get_case_basic_info(case_id) for basic details
    - Call get_case_symptoms(case_id) for symptom list
    - Call get_case_detail(case_id) for full case information

    Example:
        # Search for lung cancer cases
        cases = search_medical_cases(
            search_query="肺癌",
            is_classic=True,
            limit=5
        )

        # Get details of first case
        if cases['cases']:
            detail = get_case_detail(cases['cases'][0]['case_id'])
    """
    try:
        tenant = tenant_id or DEFAULT_TENANT_ID

        # Call database function
        cases = list_medical_cases(
            tenant_id=tenant,
            search_query=search_query,
            disease_type=disease_type,
            limit=limit
        )

        # Apply additional filters (age, gender, is_classic)
        filtered_cases = []
        for case in cases:
            # Age filter
            if age_range:
                case_age = case.get("age", 0)
                if case_age < age_range[0] or case_age > age_range[1]:
                    continue

            # Gender filter
            if gender and case.get("gender") != gender:
                continue

            # Classic case filter
            if is_classic is not None and case.get("is_classic") != is_classic:
                continue

            # Anonymize age to decade
            case_age = case.get("age", 0)
            age_group = f"{(case_age // 10) * 10}-{(case_age // 10) * 10 + 9} years"

            filtered_cases.append({
                "case_id": case.get("case_id"),
                "case_title": case.get("case_title"),
                "diagnosis": case.get("diagnosis"),
                "disease_type": case.get("disease_type"),
                "age_group": age_group,
                "gender": case.get("gender"),
                "chief_complaint": case.get("chief_complaint"),
                "is_classic": case.get("is_classic", False),
                "tags": case.get("tags", [])
            })

        logger.info(f"Found {len(filtered_cases)} medical cases matching filters")

        return {
            "total_cases": len(filtered_cases),
            "cases": filtered_cases,
            "filters_applied": {
                "search_query": search_query,
                "disease_type": disease_type,
                "age_range": age_range,
                "gender": gender,
                "is_classic": is_classic
            }
        }

    except Exception as e:
        logger.error(f"Error searching medical cases: {str(e)}")
        return {"error": str(e)}


@medical_case_tools.tool()
async def get_case_basic_info(
    case_id: str,
    tenant_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Get basic information for a medical case.

    Use this tool when:
    - Need quick overview of a case
    - Already have case_id from search results
    - Want to verify case details before getting full information

    Args:
        case_id: Case identifier (from search_medical_cases)
        tenant_id: Tenant identifier (optional)

    Returns:
        - case_id: Case identifier
        - case_title: Case title
        - diagnosis: Primary diagnosis
        - disease_type: Disease category
        - chief_complaint: Main presenting complaint
        - age_group: Age range (anonymized)
        - gender: Patient gender
        - is_classic: Whether it's a teaching case

    Example:
        info = get_case_basic_info(case_id)
        print(f"Case: {info['diagnosis']} in {info['age_group']} {info['gender']}")
    """
    try:
        tenant = tenant_id or DEFAULT_TENANT_ID
        case = get_case_detail(case_id, tenant)

        if not case:
            return {"error": "Case not found", "case_id": case_id}

        # Anonymize age
        age = case.get("age", 0)
        age_group = f"{(age // 10) * 10}-{(age // 10) * 10 + 9} years"

        basic_info = {
            "case_id": case.get("case_id"),
            "case_title": case.get("case_title"),
            "diagnosis": case.get("diagnosis"),
            "disease_type": case.get("disease_type"),
            "chief_complaint": case.get("chief_complaint"),
            "age_group": age_group,
            "gender": case.get("gender"),
            "is_classic": case.get("is_classic", False)
        }

        logger.info(f"Retrieved basic info for case {case_id}")
        return basic_info

    except Exception as e:
        logger.error(f"Error getting case basic info: {str(e)}")
        return {"error": str(e)}


@medical_case_tools.tool()
async def get_case_symptoms(
    case_id: str,
    tenant_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Get symptom list for a medical case.

    Use this tool when:
    - Comparing symptoms with patient's symptoms
    - Patient asks "What symptoms did similar cases have?"
    - Building symptom profile for a diagnosis

    Args:
        case_id: Case identifier
        tenant_id: Tenant identifier (optional)

    Returns:
        - case_id: Case identifier
        - total_symptoms: Number of symptoms
        - symptoms: List of symptom names

    Example:
        symptoms = get_case_symptoms(case_id)
        print(f"Case had {symptoms['total_symptoms']} symptoms:")
        print(symptoms['symptoms'])
    """
    try:
        tenant = tenant_id or DEFAULT_TENANT_ID
        case = get_case_detail(case_id, tenant)

        if not case:
            return {"error": "Case not found", "case_id": case_id}

        symptoms_data = case.get("symptoms", [])

        # Extract symptom names
        symptoms = []
        for s in symptoms_data:
            if isinstance(s, dict):
                symptom_name = s.get("symptom_name")
            else:
                symptom_name = s

            if symptom_name and symptom_name not in symptoms:
                symptoms.append(symptom_name)

        result = {
            "case_id": case.get("case_id"),
            "total_symptoms": len(symptoms),
            "symptoms": symptoms
        }

        logger.info(f"Retrieved {len(symptoms)} symptoms for case {case_id}")
        return result

    except Exception as e:
        logger.error(f"Error getting case symptoms: {str(e)}")
        return {"error": str(e)}


@medical_case_tools.tool()
async def get_case_full_detail(
    case_id: str,
    tenant_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Get complete detailed information for a medical case.

    Use this tool when:
    - Need full case information including treatment
    - Patient asks "What happened in this case?"
    - Want treatment approach details
    - Need comprehensive case study

    Args:
        case_id: Case identifier
        tenant_id: Tenant identifier (optional)

    Returns:
        - case_id: Case identifier
        - case_title: Case title
        - diagnosis: Primary diagnosis
        - chief_complaint: Main complaint
        - symptoms: List of symptoms
        - detail: Detailed case information containing:
          - pathology_findings: Pathology results
          - treatment_plan: Treatment approach used
          - treatment_summary: Summary of treatment
          - patient_summary: Summary for patients
          - lifestyle_recommendations: Lifestyle advice
          - (structure varies by case)

    Example:
        case = get_case_full_detail(case_id)
        print(f"Treatment: {case['detail']['treatment_plan']}")
    """
    try:
        tenant = tenant_id or DEFAULT_TENANT_ID
        case = get_case_detail(case_id, tenant)

        if not case:
            return {"error": "Case not found", "case_id": case_id}

        # Extract symptoms
        symptoms_data = case.get("symptoms", [])
        symptoms = []
        for s in symptoms_data:
            if isinstance(s, dict):
                symptoms.append(s.get("symptom_name"))
            else:
                symptoms.append(s)

        result = {
            "case_id": case.get("case_id"),
            "case_title": case.get("case_title"),
            "diagnosis": case.get("diagnosis"),
            "disease_type": case.get("disease_type"),
            "chief_complaint": case.get("chief_complaint"),
            "symptoms": symptoms,
            "detail": case.get("detail", {}),
            "is_classic": case.get("is_classic", False),
            "tags": case.get("tags", [])
        }

        logger.info(f"Retrieved full detail for case {case_id}")
        return result

    except Exception as e:
        logger.error(f"Error getting case full detail: {str(e)}")
        return {"error": str(e)}


@medical_case_tools.tool()
async def search_cases_by_symptoms(
    symptoms: List[str],
    limit: int = 10,
    tenant_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Search cases by matching symptoms.

    Use this tool when:
    - Patient describes symptoms and wants similar cases
    - Need cases with specific symptom combinations
    - Patient asks "What conditions cause these symptoms?"

    Args:
        symptoms: List of symptom names to search for
        limit: Maximum cases to return (default 10)
        tenant_id: Tenant identifier (optional)

    Returns:
        - total_cases: Number of matching cases
        - search_symptoms: Symptoms searched for
        - cases: List of cases, each containing:
          - case_id: Case identifier
          - case_title: Case title
          - diagnosis: Primary diagnosis
          - disease_type: Disease category
          - matched_symptom: Which symptom matched
          - chief_complaint: Main complaint

    Next steps:
    - Call get_case_full_detail(case_id) for complete information

    Example:
        # Search cases with chest pain and cough
        cases = search_cases_by_symptoms(
            symptoms=["胸痛", "咳嗽"],
            limit=5
        )
    """
    try:
        tenant = tenant_id or DEFAULT_TENANT_ID

        all_cases = []
        seen_case_ids = set()

        # Search for each symptom
        for symptom in symptoms:
            cases = search_cases_with_symptoms(tenant, symptom, limit=limit)

            for case in cases:
                case_id = case.get("case_id")

                # Avoid duplicates
                if case_id not in seen_case_ids:
                    seen_case_ids.add(case_id)

                    all_cases.append({
                        "case_id": case_id,
                        "case_title": case.get("case_title"),
                        "diagnosis": case.get("diagnosis"),
                        "disease_type": case.get("disease_type"),
                        "matched_symptom": symptom,
                        "chief_complaint": case.get("chief_complaint")
                    })

        # Limit total results
        all_cases = all_cases[:limit]

        logger.info(f"Found {len(all_cases)} cases matching symptoms: {symptoms}")

        return {
            "total_cases": len(all_cases),
            "search_symptoms": symptoms,
            "cases": all_cases
        }

    except Exception as e:
        logger.error(f"Error searching cases by symptoms: {str(e)}")
        return {"error": str(e)}
