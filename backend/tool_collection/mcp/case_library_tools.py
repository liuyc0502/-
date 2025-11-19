"""
Case Library Tools for Medical AI Agent
MCP-based tools for searching and analyzing medical cases
"""

from fastmcp import FastMCP
from typing import Optional, List, Dict, Any
import logging

# Import services
from services.medical_case_service import (
    search_cases,
    get_case_info,
    list_cases,
    search_cases_by_symptoms
)
from database.medical_case_db import (
    search_cases_with_symptoms,
    get_case_detail
)

logger = logging.getLogger(__name__)

# Create MCP server for case library tools
case_tools = FastMCP("case_library")


@case_tools.tool(
    name="search_medical_cases",
    description="Search similar medical cases using natural language query. Supports searching by symptoms, diagnosis, pathological features. Use this when doctor asks to find similar cases or search case library."
)
async def search_medical_cases(
    query: str,
    tenant_id: str,
    limit: int = 10,
    disease_types: Optional[List[str]] = None,
    age_range: Optional[str] = None,
    gender: Optional[str] = None
) -> Dict[str, Any]:
    """
    Intelligent search for similar medical cases

    Args:
        query: Natural language search query (symptoms, diagnosis, pathological features)
        tenant_id: Tenant ID for data isolation
        limit: Maximum number of results to return
        disease_types: Filter by disease types (e.g., ["肺腺癌", "肺鳞癌"])
        age_range: Filter by age range (<30/30-50/50-70/>70)
        gender: Filter by gender (male/female)

    Returns:
        List of similar cases with case numbers, diagnoses, similarity scores, key symptoms, images
    """
    try:
        # Search cases
        cases = await search_cases(
            tenant_id=tenant_id,
            search_query=query,
            limit=limit
        )

        # Apply additional filters
        if disease_types:
            cases = [c for c in cases if c.get('disease_type') in disease_types]

        if gender:
            cases = [c for c in cases if c.get('gender') == gender]

        # Format results
        formatted_cases = []
        for case in cases:
            formatted_cases.append({
                "case_id": case.get('case_id'),
                "case_no": case.get('case_no'),
                "diagnosis": case.get('diagnosis'),
                "disease_type": case.get('disease_type'),
                "age": case.get('age'),
                "gender": case.get('gender'),
                "key_symptoms": case.get('symptoms', [])[:5],  # Top 5 symptoms
                "is_classic": case.get('is_classic', False),
                "similarity_score": case.get('similarity_score', 0.0),
                "preview_summary": case.get('case_summary', '')[:200],  # First 200 chars
            })

        logger.info(f"Found {len(formatted_cases)} cases matching query: {query}")
        return {
            "query": query,
            "total_results": len(formatted_cases),
            "cases": formatted_cases
        }

    except Exception as e:
        logger.error(f"Error searching medical cases: {str(e)}")
        return {"error": str(e)}


@case_tools.tool(
    name="get_case_detail",
    description="Get complete detailed information for a specific medical case including medical history, symptoms, lab results, diagnosis, treatment plan, and pathology images. Use this when doctor asks for case details or wants to review a specific case."
)
async def get_case_detail_tool(
    case_id: int,
    tenant_id: str,
    user_id: Optional[str] = None,
    include_images: bool = True,
    include_lab_results: bool = True
) -> Dict[str, Any]:
    """
    Retrieve complete case information

    Args:
        case_id: Case ID
        tenant_id: Tenant ID for data isolation
        user_id: User ID (for recording view history)
        include_images: Whether to include pathology images
        include_lab_results: Whether to include laboratory results

    Returns:
        Complete case information including history, symptoms, test results, diagnosis, treatment, prognosis, images
    """
    try:
        case = await get_case_info(case_id, tenant_id, user_id)

        if not case:
            return {"error": "Case not found", "case_id": case_id}

        result = {
            "case_id": case.get('case_id'),
            "case_no": case.get('case_no'),
            "diagnosis": case.get('diagnosis'),
            "disease_type": case.get('disease_type'),
            "age": case.get('age'),
            "gender": case.get('gender'),
            "chief_complaint": case.get('chief_complaint'),
            "medical_history": case.get('medical_history'),
            "is_classic": case.get('is_classic', False),
        }

        # Add symptoms
        if 'symptoms' in case:
            result['symptoms'] = case['symptoms']

        # Add lab results if requested
        if include_lab_results and 'lab_results' in case:
            result['lab_results'] = case['lab_results']

        # Add images if requested
        if include_images and 'images' in case:
            result['images'] = case['images']

        # Add case detail if available
        if 'detail' in case:
            detail = case['detail']
            result['pathology_findings'] = detail.get('pathology_findings')
            result['diagnosis_process'] = detail.get('diagnosis_process')
            result['treatment_plan'] = detail.get('treatment_plan')
            result['clinical_outcome'] = detail.get('clinical_outcome')
            result['learning_points'] = detail.get('learning_points')

        logger.info(f"Retrieved case detail for case_id={case_id}")
        return result

    except Exception as e:
        logger.error(f"Error getting case detail: {str(e)}")
        return {"error": str(e)}


@case_tools.tool(
    name="search_cases_by_symptoms",
    description="Search medical cases based on symptom combinations. Use this when doctor provides multiple symptoms and wants to find matching cases."
)
async def search_cases_by_symptoms_tool(
    symptoms: List[str],
    tenant_id: str,
    matching_mode: str = "any",
    limit: int = 10
) -> Dict[str, Any]:
    """
    Search cases by symptom combination

    Args:
        symptoms: List of symptoms
        tenant_id: Tenant ID for data isolation
        matching_mode: Matching mode (any/all/weighted)
        limit: Maximum number of results

    Returns:
        Matching cases with case numbers, diagnoses, symptom match scores, key findings
    """
    try:
        # Build search query from symptoms
        query = " ".join(symptoms)

        cases = await search_cases(
            tenant_id=tenant_id,
            search_query=query,
            limit=limit
        )

        # Calculate symptom match scores
        formatted_cases = []
        for case in cases:
            case_symptoms = case.get('symptoms', [])

            # Calculate match score
            if matching_mode == "all":
                # All symptoms must match
                matched = all(s in case_symptoms for s in symptoms)
                match_score = 1.0 if matched else 0.0
            elif matching_mode == "weighted":
                # Weighted by number of matching symptoms
                matched_count = sum(1 for s in symptoms if s in case_symptoms)
                match_score = matched_count / len(symptoms) if symptoms else 0
            else:  # "any"
                # Any symptom matches
                matched_count = sum(1 for s in symptoms if s in case_symptoms)
                match_score = matched_count / len(symptoms) if symptoms else 0

            if match_score > 0:
                formatted_cases.append({
                    "case_id": case.get('case_id'),
                    "case_no": case.get('case_no'),
                    "diagnosis": case.get('diagnosis'),
                    "disease_type": case.get('disease_type'),
                    "matched_symptoms": [s for s in symptoms if s in case_symptoms],
                    "all_symptoms": case_symptoms,
                    "symptom_match_score": round(match_score, 2),
                    "key_findings": case.get('pathology_findings', '')[:200],
                })

        # Sort by match score
        formatted_cases.sort(key=lambda x: x['symptom_match_score'], reverse=True)

        logger.info(f"Found {len(formatted_cases)} cases matching symptoms: {symptoms}")
        return {
            "search_symptoms": symptoms,
            "matching_mode": matching_mode,
            "total_results": len(formatted_cases),
            "cases": formatted_cases
        }

    except Exception as e:
        logger.error(f"Error searching cases by symptoms: {str(e)}")
        return {"error": str(e)}


@case_tools.tool(
    name="get_similar_cases",
    description="Get similar case recommendations based on a reference case or patient condition. Use this when doctor asks for similar cases or wants case recommendations for differential diagnosis."
)
async def get_similar_cases_tool(
    tenant_id: str,
    reference_case_id: Optional[int] = None,
    patient_id: Optional[int] = None,
    similarity_threshold: float = 0.7,
    limit: int = 5
) -> Dict[str, Any]:
    """
    Get similar case recommendations

    Args:
        tenant_id: Tenant ID for data isolation
        reference_case_id: Reference case ID
        patient_id: Reference patient ID (uses current patient condition as reference)
        similarity_threshold: Similarity threshold (0.0-1.0)
        limit: Maximum number of recommendations

    Returns:
        Similar cases with case numbers, similarity scores, similarity analysis, differential diagnosis suggestions
    """
    try:
        if not reference_case_id and not patient_id:
            return {"error": "Must provide either reference_case_id or patient_id"}

        # Get reference case/patient information
        if reference_case_id:
            from services.medical_case_service import get_case_info
            reference = await get_case_info(reference_case_id, tenant_id)
            reference_type = "case"
        else:
            from services.patient_service import get_patient_info
            reference = await get_patient_info(patient_id, tenant_id)
            reference_type = "patient"

        if not reference:
            return {"error": f"Reference {reference_type} not found"}

        # Extract key features for similarity search
        diagnosis = reference.get('diagnosis') or reference.get('primary_diagnosis', '')
        symptoms_query = " ".join(reference.get('symptoms', [])[:5])
        search_query = f"{diagnosis} {symptoms_query}"

        # Search similar cases
        similar_cases = await search_cases(
            tenant_id=tenant_id,
            search_query=search_query,
            limit=limit * 2  # Get more, then filter
        )

        # Filter by similarity threshold and format results
        formatted_cases = []
        for case in similar_cases:
            # Skip the reference case itself
            if reference_case_id and case.get('case_id') == reference_case_id:
                continue

            similarity_score = case.get('similarity_score', 0.0)
            if similarity_score >= similarity_threshold:
                formatted_cases.append({
                    "case_id": case.get('case_id'),
                    "case_no": case.get('case_no'),
                    "diagnosis": case.get('diagnosis'),
                    "disease_type": case.get('disease_type'),
                    "similarity_score": round(similarity_score, 2),
                    "similar_points": {
                        "age_group": case.get('age'),
                        "gender": case.get('gender'),
                        "common_symptoms": [s for s in case.get('symptoms', []) if s in reference.get('symptoms', [])],
                    },
                    "differential_diagnosis_note": f"Consider differential diagnosis between {diagnosis} and {case.get('diagnosis')}",
                })

        # Limit results
        formatted_cases = formatted_cases[:limit]

        logger.info(f"Found {len(formatted_cases)} similar cases for {reference_type}")
        return {
            "reference_type": reference_type,
            "reference_id": reference_case_id or patient_id,
            "reference_diagnosis": diagnosis,
            "similarity_threshold": similarity_threshold,
            "total_results": len(formatted_cases),
            "similar_cases": formatted_cases
        }

    except Exception as e:
        logger.error(f"Error getting similar cases: {str(e)}")
        return {"error": str(e)}


@case_tools.tool(
    name="get_classic_cases_by_disease",
    description="Get classic teaching cases for a specific disease type. These are high-quality cases marked for educational purposes. Use this when doctor asks for classic cases or teaching examples."
)
async def get_classic_cases_by_disease_tool(
    disease_type: str,
    tenant_id: str,
    limit: int = 5
) -> Dict[str, Any]:
    """
    Get classic cases for specific disease

    Args:
        disease_type: Disease type (e.g., 肺腺癌, 肺鳞癌, 胃癌)
        tenant_id: Tenant ID for data isolation
        limit: Maximum number of cases

    Returns:
        Classic case list (high-quality teaching cases)
    """
    try:
        cases = await list_cases(
            tenant_id=tenant_id,
            disease_types=[disease_type],
            is_classic=True,
            limit=limit
        )

        formatted_cases = []
        for case in cases:
            formatted_cases.append({
                "case_id": case.get('case_id'),
                "case_no": case.get('case_no'),
                "diagnosis": case.get('diagnosis'),
                "disease_type": case.get('disease_type'),
                "age": case.get('age'),
                "gender": case.get('gender'),
                "key_symptoms": case.get('symptoms', [])[:5],
                "why_classic": case.get('learning_points', 'Typical presentation and diagnostic features'),
                "case_summary": case.get('case_summary', '')[:300],
            })

        logger.info(f"Found {len(formatted_cases)} classic cases for disease: {disease_type}")
        return {
            "disease_type": disease_type,
            "total_classic_cases": len(formatted_cases),
            "classic_cases": formatted_cases
        }

    except Exception as e:
        logger.error(f"Error getting classic cases: {str(e)}")
        return {"error": str(e)}


@case_tools.tool(
    name="analyze_case_trends",
    description="Analyze trends in case library including disease distribution, age/gender demographics, and common symptom patterns. Use this for epidemiological analysis or when doctor asks about disease trends."
)
async def analyze_case_trends_tool(
    tenant_id: str,
    disease_types: Optional[List[str]] = None,
    time_period: str = "1year",
    group_by: str = "disease_type"
) -> Dict[str, Any]:
    """
    Analyze case library trends

    Args:
        tenant_id: Tenant ID for data isolation
        disease_types: Filter by disease types
        time_period: Analysis time period (1month/3months/6months/1year/all)
        group_by: Grouping dimension (disease_type/age_group/gender)

    Returns:
        Trend analysis report with case counts, age distribution, gender distribution, common symptoms
    """
    try:
        # Get all cases
        cases = await list_cases(
            tenant_id=tenant_id,
            disease_types=disease_types,
            limit=1000  # Large limit for analysis
        )

        # Initialize analysis results
        analysis = {
            "total_cases": len(cases),
            "time_period": time_period,
            "group_by": group_by,
        }

        # Group by specified dimension
        if group_by == "disease_type":
            grouped = {}
            for case in cases:
                disease = case.get('disease_type', 'Unknown')
                if disease not in grouped:
                    grouped[disease] = []
                grouped[disease].append(case)

            analysis["disease_distribution"] = {
                disease: {
                    "count": len(cases_list),
                    "percentage": round(len(cases_list) / len(cases) * 100, 1) if cases else 0
                }
                for disease, cases_list in grouped.items()
            }

        elif group_by == "age_group":
            age_groups = {"<30": 0, "30-50": 0, "50-70": 0, ">70": 0}
            for case in cases:
                age = case.get('age', 0)
                if age < 30:
                    age_groups["<30"] += 1
                elif age < 50:
                    age_groups["30-50"] += 1
                elif age < 70:
                    age_groups["50-70"] += 1
                else:
                    age_groups[">70"] += 1

            analysis["age_distribution"] = age_groups

        elif group_by == "gender":
            gender_dist = {"male": 0, "female": 0, "unknown": 0}
            for case in cases:
                gender = case.get('gender', 'unknown')
                if gender in gender_dist:
                    gender_dist[gender] += 1
                else:
                    gender_dist["unknown"] += 1

            analysis["gender_distribution"] = gender_dist

        # Analyze common symptoms
        symptom_counts = {}
        for case in cases:
            for symptom in case.get('symptoms', []):
                symptom_counts[symptom] = symptom_counts.get(symptom, 0) + 1

        # Top 10 symptoms
        top_symptoms = sorted(symptom_counts.items(), key=lambda x: x[1], reverse=True)[:10]
        analysis["top_symptoms"] = [
            {"symptom": s[0], "count": s[1], "percentage": round(s[1] / len(cases) * 100, 1) if cases else 0}
            for s in top_symptoms
        ]

        logger.info(f"Analyzed {len(cases)} cases for trends")
        return analysis

    except Exception as e:
        logger.error(f"Error analyzing case trends: {str(e)}")
        return {"error": str(e)}
