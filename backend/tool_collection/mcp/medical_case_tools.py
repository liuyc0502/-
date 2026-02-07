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
    """Search medical case library. Returns case_id for getting details."""
    try:
        tenant = tenant_id or DEFAULT_TENANT_ID

        cases = list_medical_cases(
            tenant_id=tenant,
            search_query=search_query,
            disease_type=disease_type,
            limit=limit
        )

        filtered_cases = []
        for case in cases:
            if age_range:
                case_age = case.get("age", 0)
                if case_age < age_range[0] or case_age > age_range[1]:
                    continue

            if gender and case.get("gender") != gender:
                continue

            if is_classic is not None and case.get("is_classic") != is_classic:
                continue

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
    """Get basic information for a medical case."""
    try:
        tenant = tenant_id or DEFAULT_TENANT_ID
        case = get_case_detail(case_id, tenant)

        if not case:
            return {"error": "Case not found", "case_id": case_id}

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
    """Get symptom list for a medical case."""
    try:
        tenant = tenant_id or DEFAULT_TENANT_ID
        case = get_case_detail(case_id, tenant)

        if not case:
            return {"error": "Case not found", "case_id": case_id}

        symptoms_data = case.get("symptoms", [])

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
    """Get complete detailed information for a medical case including treatment."""
    try:
        tenant = tenant_id or DEFAULT_TENANT_ID
        case = get_case_detail(case_id, tenant)

        if not case:
            return {"error": "Case not found", "case_id": case_id}

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
    """Search cases by matching symptoms."""
    try:
        tenant = tenant_id or DEFAULT_TENANT_ID

        all_cases = []
        seen_case_ids = set()

        for symptom in symptoms:
            cases = search_cases_with_symptoms(tenant, symptom, limit=limit)

            for case in cases:
                case_id = case.get("case_id")

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
