"""
Case Library Tools - MCP Format
6 tools for searching and analyzing medical cases
"""
import logging
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta

from fastmcp import FastMCP

from database.medical_case_db import (
    list_medical_cases,
    get_case_detail,
    search_cases_with_symptoms,
    get_user_view_history,
    get_user_favorites,
    add_view_history
)

logger = logging.getLogger(__name__)

case_tools = FastMCP("case_library")


@case_tools.tool(
    name="search_medical_cases",
    description="Intelligent case search with NLP. Use when doctor wants to find cases by diagnosis, symptoms, or any medical condition description."
)
async def search_medical_cases(
    tenant_id: str,
    query: str,
    disease_types: Optional[List[str]] = None,
    age_range: Optional[tuple] = None,
    gender: Optional[str] = None,
    limit: int = 10
) -> Dict[str, Any]:
    """
    Search medical cases using natural language query.

    Args:
        tenant_id: Tenant ID for data isolation
        query: Natural language search query (e.g., "ºzL4ËôÓlû")
        disease_types: Filter by disease types
        age_range: Filter by patient age range (min_age, max_age)
        gender: Filter by gender (7/s)
        limit: Maximum number of results

    Returns:
        List of matching cases with relevance
    """
    try:
        cases = list_medical_cases(
            tenant_id=tenant_id,
            search_query=query,
            disease_types=disease_types,
            age_range=age_range,
            gender=gender,
            limit=limit
        )

        result = {
            "query": query,
            "total_results": len(cases),
            "cases": [
                {
                    "case_id": c.get("case_id"),
                    "case_no": c.get("case_no"),
                    "case_title": c.get("case_title"),
                    "diagnosis": c.get("diagnosis"),
                    "disease_type": c.get("disease_type"),
                    "age": c.get("age"),
                    "gender": c.get("gender"),
                    "chief_complaint": c.get("chief_complaint"),
                    "is_classic": c.get("is_classic"),
                    "tags": c.get("tags", []),
                    "view_count": c.get("view_count", 0)
                }
                for c in cases
            ]
        }

        logger.info(f"Searched cases with query: {query}, found {len(cases)} results")
        return result

    except Exception as e:
        logger.error(f"Error searching medical cases: {str(e)}")
        return {"error": str(e)}


@case_tools.tool(
    name="get_case_detail",
    description="Get complete case information including symptoms, lab results, images and treatment plan. Use when doctor needs detailed information about a specific case."
)
async def get_case_detail_tool(
    case_id: int,
    tenant_id: str,
    user_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Get complete case information.

    Args:
        case_id: The unique case identifier
        tenant_id: Tenant ID for data isolation
        user_id: User ID for recording view history

    Returns:
        Complete case information
    """
    try:
        case = get_case_detail(case_id, tenant_id)

        if not case:
            return {"error": "Case not found", "case_id": case_id}

        # Record view history if user_id provided
        if user_id:
            add_view_history(case_id, user_id, tenant_id)

        result = {
            "case_id": case.get("case_id"),
            "case_no": case.get("case_no"),
            "case_title": case.get("case_title"),
            "diagnosis": case.get("diagnosis"),
            "disease_type": case.get("disease_type"),
            "patient_info": {
                "age": case.get("age"),
                "gender": case.get("gender")
            },
            "chief_complaint": case.get("chief_complaint"),
            "is_classic": case.get("is_classic"),
            "tags": case.get("tags", []),
            "symptoms": case.get("symptoms", []),
            "lab_results": case.get("lab_results", []),
            "images": case.get("images", []),
            "detail": case.get("detail", {}),
            "view_count": case.get("view_count", 0)
        }

        logger.info(f"Retrieved case detail: {case_id}")
        return result

    except Exception as e:
        logger.error(f"Error getting case detail: {str(e)}")
        return {"error": str(e)}


@case_tools.tool(
    name="search_cases_by_symptoms",
    description="Search cases by symptom combinations. Use when doctor provides a list of symptoms and wants to find matching cases."
)
async def search_cases_by_symptoms_tool(
    tenant_id: str,
    symptoms: List[str],
    match_all: bool = False,
    limit: int = 10
) -> Dict[str, Any]:
    """
    Search cases by symptom combinations.

    Args:
        tenant_id: Tenant ID for data isolation
        symptoms: List of symptoms to search for (e.g., ["³ý", "øÛ", "¯@"])
        match_all: If True, require all symptoms to match; if False, match any
        limit: Maximum number of results

    Returns:
        List of cases matching the symptoms
    """
    try:
        # Search for each symptom and combine results
        all_results = {}

        for symptom in symptoms:
            cases = search_cases_with_symptoms(tenant_id, symptom, limit=50)
            for case in cases:
                case_id = case.get("case_id")
                if case_id not in all_results:
                    all_results[case_id] = {
                        "case": case,
                        "matched_symptoms": [],
                        "match_count": 0
                    }
                all_results[case_id]["matched_symptoms"].append(symptom)
                all_results[case_id]["match_count"] += 1

        # Filter based on match_all
        if match_all:
            results = [
                r for r in all_results.values()
                if r["match_count"] >= len(symptoms)
            ]
        else:
            results = list(all_results.values())

        # Sort by match count
        results = sorted(results, key=lambda x: x["match_count"], reverse=True)[:limit]

        return {
            "search_symptoms": symptoms,
            "match_mode": "all" if match_all else "any",
            "total_results": len(results),
            "cases": [
                {
                    "case_id": r["case"].get("case_id"),
                    "case_no": r["case"].get("case_no"),
                    "diagnosis": r["case"].get("diagnosis"),
                    "matched_symptoms": r["matched_symptoms"],
                    "match_count": r["match_count"],
                    "all_symptoms": r["case"].get("symptoms", [])
                }
                for r in results
            ]
        }

    except Exception as e:
        logger.error(f"Error searching cases by symptoms: {str(e)}")
        return {"error": str(e)}


@case_tools.tool(
    name="get_similar_cases",
    description="Get similar case recommendations based on a patient or case. Use when doctor wants to find comparable cases for reference."
)
async def get_similar_cases_tool(
    tenant_id: str,
    reference_case_id: Optional[int] = None,
    patient_id: Optional[int] = None,
    diagnosis: Optional[str] = None,
    symptoms: Optional[List[str]] = None,
    limit: int = 5
) -> Dict[str, Any]:
    """
    Get similar case recommendations.

    Args:
        tenant_id: Tenant ID for data isolation
        reference_case_id: Reference case ID to find similar cases
        patient_id: Patient ID to find cases similar to patient's condition
        diagnosis: Diagnosis to match
        symptoms: Symptoms to match
        limit: Maximum number of similar cases

    Returns:
        List of similar cases with similarity scores
    """
    try:
        # If reference_case_id provided, get its details first
        if reference_case_id:
            ref_case = get_case_detail(reference_case_id, tenant_id)
            if ref_case:
                diagnosis = diagnosis or ref_case.get("diagnosis")
                symptoms = symptoms or [s.get("symptom_name") for s in ref_case.get("symptoms", [])]

        if not diagnosis and not symptoms:
            return {"error": "Please provide reference_case_id, diagnosis, or symptoms"}

        # Search for similar cases
        similar_cases = []

        if diagnosis:
            cases = list_medical_cases(tenant_id, search_query=diagnosis, limit=limit * 2)
            for case in cases:
                if reference_case_id and case.get("case_id") == reference_case_id:
                    continue
                similar_cases.append({
                    "case": case,
                    "similarity_reason": f"Similar diagnosis: {diagnosis}",
                    "similarity_score": 0.8
                })

        if symptoms:
            for symptom in symptoms[:3]:  # Limit symptom search
                cases = search_cases_with_symptoms(tenant_id, symptom, limit=10)
                for case in cases:
                    if reference_case_id and case.get("case_id") == reference_case_id:
                        continue
                    # Check if already in results
                    existing = next((s for s in similar_cases if s["case"].get("case_id") == case.get("case_id")), None)
                    if not existing:
                        similar_cases.append({
                            "case": case,
                            "similarity_reason": f"Matching symptom: {symptom}",
                            "similarity_score": 0.6
                        })

        # Sort by similarity and limit
        similar_cases = sorted(similar_cases, key=lambda x: x["similarity_score"], reverse=True)[:limit]

        return {
            "reference_case_id": reference_case_id,
            "search_criteria": {
                "diagnosis": diagnosis,
                "symptoms": symptoms
            },
            "total_similar": len(similar_cases),
            "similar_cases": [
                {
                    "case_id": s["case"].get("case_id"),
                    "case_no": s["case"].get("case_no"),
                    "diagnosis": s["case"].get("diagnosis"),
                    "similarity_reason": s["similarity_reason"],
                    "similarity_score": s["similarity_score"]
                }
                for s in similar_cases
            ]
        }

    except Exception as e:
        logger.error(f"Error getting similar cases: {str(e)}")
        return {"error": str(e)}


@case_tools.tool(
    name="get_classic_cases_by_disease",
    description="Get classic teaching cases for a specific disease. Use when doctor wants to review representative or educational cases for a condition."
)
async def get_classic_cases_by_disease(
    tenant_id: str,
    disease_type: str,
    limit: int = 10
) -> Dict[str, Any]:
    """
    Get classic teaching cases for a specific disease.

    Args:
        tenant_id: Tenant ID for data isolation
        disease_type: Disease type/category (e.g., "ºzL", "{Î")
        limit: Maximum number of cases

    Returns:
        List of classic cases
    """
    try:
        cases = list_medical_cases(
            tenant_id=tenant_id,
            search_query=disease_type,
            is_classic=True,
            limit=limit
        )

        # If not enough classic cases, include popular non-classic cases
        if len(cases) < limit:
            more_cases = list_medical_cases(
                tenant_id=tenant_id,
                search_query=disease_type,
                is_classic=False,
                limit=limit - len(cases)
            )
            cases.extend(more_cases)

        return {
            "disease_type": disease_type,
            "total_cases": len(cases),
            "classic_cases": [
                {
                    "case_id": c.get("case_id"),
                    "case_no": c.get("case_no"),
                    "case_title": c.get("case_title"),
                    "diagnosis": c.get("diagnosis"),
                    "chief_complaint": c.get("chief_complaint"),
                    "is_classic": c.get("is_classic"),
                    "view_count": c.get("view_count", 0),
                    "tags": c.get("tags", [])
                }
                for c in cases
            ]
        }

    except Exception as e:
        logger.error(f"Error getting classic cases: {str(e)}")
        return {"error": str(e)}


@case_tools.tool(
    name="analyze_case_trends",
    description="Analyze epidemiological trends for cases. Use when doctor asks about disease incidence patterns, age distribution, or temporal trends."
)
async def analyze_case_trends(
    tenant_id: str,
    disease_type: Optional[str] = None,
    time_range_days: int = 365
) -> Dict[str, Any]:
    """
    Analyze epidemiological trends for medical cases.

    Args:
        tenant_id: Tenant ID for data isolation
        disease_type: Filter by disease type
        time_range_days: Time range for analysis in days

    Returns:
        Trend analysis with statistics
    """
    try:
        # Get all cases for analysis
        cases = list_medical_cases(
            tenant_id=tenant_id,
            search_query=disease_type if disease_type else None,
            limit=1000
        )

        if not cases:
            return {
                "disease_type": disease_type,
                "message": "No cases found for analysis"
            }

        # Calculate statistics
        total_cases = len(cases)

        # Age distribution
        age_groups = {"0-20": 0, "21-40": 0, "41-60": 0, "61-80": 0, "80+": 0}
        for case in cases:
            age = case.get("age", 0)
            if age <= 20:
                age_groups["0-20"] += 1
            elif age <= 40:
                age_groups["21-40"] += 1
            elif age <= 60:
                age_groups["41-60"] += 1
            elif age <= 80:
                age_groups["61-80"] += 1
            else:
                age_groups["80+"] += 1

        # Gender distribution
        gender_dist = {"7": 0, "s": 0, "unknown": 0}
        for case in cases:
            gender = case.get("gender", "unknown")
            if gender in gender_dist:
                gender_dist[gender] += 1
            else:
                gender_dist["unknown"] += 1

        # Disease type distribution
        disease_dist = {}
        for case in cases:
            dtype = case.get("disease_type", "unknown")
            disease_dist[dtype] = disease_dist.get(dtype, 0) + 1

        # Sort disease distribution by count
        disease_dist = dict(sorted(disease_dist.items(), key=lambda x: x[1], reverse=True)[:10])

        return {
            "disease_type": disease_type,
            "time_range_days": time_range_days,
            "total_cases": total_cases,
            "statistics": {
                "age_distribution": age_groups,
                "gender_distribution": gender_dist,
                "disease_type_distribution": disease_dist
            },
            "insights": {
                "most_common_age_group": max(age_groups, key=age_groups.get),
                "gender_ratio": f"7:s = {gender_dist['7']}:{gender_dist['s']}",
                "top_disease_type": max(disease_dist, key=disease_dist.get) if disease_dist else None
            }
        }

    except Exception as e:
        logger.error(f"Error analyzing case trends: {str(e)}")
        return {"error": str(e)}
