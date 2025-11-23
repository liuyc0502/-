"""
Case Library Tools - MCP Format
6 tools for searching and analyzing medical cases
"""
import logging
from typing import Optional, List, Dict, Any, Tuple
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


def calculate_diagnosis_similarity(ref_diagnosis: str, case_diagnosis: str) -> float:
    """
    Calculate similarity score between two diagnoses.
    
    Args:
        ref_diagnosis: Reference diagnosis text
        case_diagnosis: Case diagnosis text
        
    Returns:
        Similarity score between 0.0 and 1.0
    """
    if not ref_diagnosis or not case_diagnosis:
        return 0.0
    
    ref_diag = ref_diagnosis.lower().strip()
    case_diag = case_diagnosis.lower().strip()
    
    # Exact match
    if ref_diag == case_diag:
        return 1.0
    
    # Check if one contains the other (partial match)
    if ref_diag in case_diag or case_diag in ref_diag:
        # Calculate overlap ratio
        shorter = min(len(ref_diag), len(case_diag))
        longer = max(len(ref_diag), len(case_diag))
        return shorter / longer if longer > 0 else 0.0
    
    # Word-level similarity (simple Jaccard similarity)
    ref_words = set(ref_diag.split())
    case_words = set(case_diag.split())
    
    if not ref_words or not case_words:
        return 0.0
    
    intersection = len(ref_words & case_words)
    union = len(ref_words | case_words)
    
    return intersection / union if union > 0 else 0.0


def calculate_symptom_similarity(ref_symptoms: List[str], case_symptoms: List[str]) -> float:
    """
    Calculate similarity score based on symptom overlap.
    
    Args:
        ref_symptoms: List of reference symptom names
        case_symptoms: List of case symptom names (can be dicts with 'symptom_name' key)
        
    Returns:
        Similarity score between 0.0 and 1.0
    """
    if not ref_symptoms or not case_symptoms:
        return 0.0
    
    # Extract symptom names if they are dicts
    case_symptom_names = []
    for s in case_symptoms:
        if isinstance(s, dict):
            case_symptom_names.append(s.get("symptom_name", "").lower().strip())
        else:
            case_symptom_names.append(str(s).lower().strip())
    
    ref_symptom_names = [s.lower().strip() for s in ref_symptoms if s]
    case_symptom_names = [s for s in case_symptom_names if s]
    
    if not ref_symptom_names or not case_symptom_names:
        return 0.0
    
    # Calculate Jaccard similarity
    ref_set = set(ref_symptom_names)
    case_set = set(case_symptom_names)
    
    intersection = len(ref_set & case_set)
    union = len(ref_set | case_set)
    
    if union == 0:
        return 0.0
    
    # Also consider match ratio (how many reference symptoms are matched)
    match_ratio = intersection / len(ref_set) if ref_set else 0.0
    
    # Combine Jaccard and match ratio (weighted average)
    jaccard_score = intersection / union
    return (jaccard_score * 0.6 + match_ratio * 0.4)


def calculate_case_similarity(
    ref_case: Optional[Dict[str, Any]],
    case: Dict[str, Any],
    ref_diagnosis: Optional[str] = None,
    ref_symptoms: Optional[List[str]] = None
) -> Tuple[float, str]:
    """
    Calculate overall similarity score between reference and target case.
    
    Args:
        ref_case: Reference case dict (optional, for additional matching)
        case: Target case dict
        ref_diagnosis: Reference diagnosis (optional)
        ref_symptoms: Reference symptoms list (optional)
        
    Returns:
        Tuple of (similarity_score, similarity_reason)
    """
    scores = []
    reasons = []
    
    # Diagnosis similarity
    case_diagnosis = case.get("diagnosis", "")
    if ref_diagnosis and case_diagnosis:
        diag_score = calculate_diagnosis_similarity(ref_diagnosis, case_diagnosis)
        if diag_score > 0:
            scores.append(("diagnosis", diag_score, 0.5))  # Weight: 0.5
            if diag_score >= 0.8:
                reasons.append(f"Highly similar diagnosis: {case_diagnosis}")
            elif diag_score >= 0.5:
                reasons.append(f"Partially similar diagnosis: {case_diagnosis}")
            else:
                reasons.append(f"Somewhat similar diagnosis: {case_diagnosis}")
    
    # Symptom similarity
    case_symptoms = case.get("symptoms", [])
    if ref_symptoms and case_symptoms:
        symptom_score = calculate_symptom_similarity(ref_symptoms, case_symptoms)
        if symptom_score > 0:
            scores.append(("symptom", symptom_score, 0.4))  # Weight: 0.4
            matched_count = len(set(s.lower().strip() if isinstance(s, str) else s.get("symptom_name", "").lower().strip() 
                                   for s in case_symptoms) & 
                               set(s.lower().strip() for s in ref_symptoms))
            reasons.append(f"Matching {matched_count} symptom(s)")
    
    # Disease type match (bonus)
    if ref_case:
        ref_disease_type = ref_case.get("disease_type")
        case_disease_type = case.get("disease_type")
        if ref_disease_type and case_disease_type and ref_disease_type == case_disease_type:
            scores.append(("disease_type", 0.2, 0.1))  # Small bonus: 0.1 weight, 0.2 score
            reasons.append("Same disease type")
    
    # Calculate weighted average
    if not scores:
        return (0.0, "No matching criteria")
    
    total_weighted_score = sum(score * weight for _, score, weight in scores)
    total_weight = sum(weight for _, _, weight in scores)
    
    final_score = total_weighted_score / total_weight if total_weight > 0 else 0.0
    final_score = min(1.0, max(0.0, final_score))  # Clamp between 0 and 1
    
    reason = "; ".join(reasons) if reasons else "Similar case"
    
    return (final_score, reason)

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
        query: Natural language search query (e.g., "肺腺癌伴淋巴结转移")
        disease_types: Filter by disease types
        age_range: Filter by patient age range (min_age, max_age)
        gender: Filter by gender (男/女)
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
    case_no: str,
    tenant_id: str,
    user_id: Optional[str] = None
) -> Dict[str, Any]:

    """
    Get complete case information.
 
    Args:
        case_no: The case number
        tenant_id: Tenant ID for data isolation
        user_id: User ID for recording view history
 
    Returns:
        Complete case information
    """
    try:
        case = get_case_detail(case_no, tenant_id)
 
        if not case:
            return {"error": "Case not found", "case_no": case_no}
 
        # Record view history if user_id provided
        if user_id:
            add_view_history(case_no, user_id, tenant_id)
 
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
 
        logger.info(f"Retrieved case detail: {case_no}")
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
        symptoms: List of symptoms to search for (e.g., ["咳嗽", "胸痛", "咯血"])
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
    reference_case_no: Optional[str] = None,
    diagnosis: Optional[str] = None,
    symptoms: Optional[List[str]] = None,
    limit: int = 5

) -> Dict[str, Any]:

    """
    Get similar case recommendations.
 
    Args:
        tenant_id: Tenant ID for data isolation
        reference_case_no: Reference case number to find similar cases
        diagnosis: Diagnosis to match
        symptoms: Symptoms to match
        limit: Maximum number of similar cases
 
    Returns:
        List of similar cases with similarity scores
    """

    try:
        # If reference_case_id provided, get its details first
        ref_case = None
        if reference_case_no:
            ref_case = get_case_detail(reference_case_no, tenant_id)
            if ref_case:
                diagnosis = diagnosis or ref_case.get("diagnosis")
                symptoms = symptoms or [s.get("symptom_name") for s in ref_case.get("symptoms", [])]

        if not diagnosis and not symptoms:
            return {"error": "Please provide reference_case_no, diagnosis, or symptoms"}
 
        # Search for similar cases
        similar_cases = []
        seen_case_nos = set()

        # Search by diagnosis
        if diagnosis:
            cases = list_medical_cases(tenant_id, search_query=diagnosis, limit=limit * 2)
            for case in cases:
                case_no = case.get("case_no")
                if reference_case_no and case_no == reference_case_no:
                    continue
                if case_no in seen_case_nos:
                    continue
                
                # Get full case details for accurate similarity calculation
                case_detail = get_case_detail(case_no, tenant_id) if case_no else case
                if case_detail:
                    score, reason = calculate_case_similarity(
                        ref_case=ref_case,
                        case=case_detail,
                        ref_diagnosis=diagnosis,
                        ref_symptoms=symptoms
                    )
                    if score > 0:  # Only include cases with some similarity
                        similar_cases.append({
                            "case": case_detail,
                            "similarity_reason": reason,
                            "similarity_score": round(score, 3)
                        })
                        seen_case_nos.add(case_no)

        # Search by symptoms
        if symptoms:
            for symptom in symptoms[:3]:  # Limit symptom search
                cases = search_cases_with_symptoms(tenant_id, symptom, limit=10)
                for case in cases:
                    case_no = case.get("case_no")
                    if reference_case_no and case_no == reference_case_no:
                        continue
                    if case_no in seen_case_nos:
                        continue

                    # Get full case details for accurate similarity calculation
                    case_detail = get_case_detail(case_no, tenant_id) if case_no else case
                    if case_detail:
                        score, reason = calculate_case_similarity(
                            ref_case=ref_case,
                            case=case_detail,
                            ref_diagnosis=diagnosis,
                            ref_symptoms=symptoms
                        )
                        if score > 0:  # Only include cases with some similarity
                            similar_cases.append({
                                "case": case_detail,
                                "similarity_reason": reason,
                                "similarity_score": round(score, 3)
                            })
                            seen_case_nos.add(case_no)

        # Sort by similarity and limit
        similar_cases = sorted(similar_cases, key=lambda x: x["similarity_score"], reverse=True)[:limit]


        return {
            "reference_case_no": reference_case_no,
            "search_criteria": {
                "diagnosis": diagnosis,
                "symptoms": symptoms
            },
            "total_similar": len(similar_cases),
            "similar_cases": [
                {
                    "case_no": s["case"].get("case_no"),
                    "case_title": s["case"].get("case_title"),
                    "diagnosis": s["case"].get("diagnosis"),
                    "disease_type": s["case"].get("disease_type"),
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
        disease_type: Disease type/category (e.g., "肺腺癌", "类风湿")
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
 
 
