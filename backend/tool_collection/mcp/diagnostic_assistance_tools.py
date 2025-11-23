"""
Diagnostic Assistance Tools - MCP Format
3 tools for diagnostic support
"""
import logging
from typing import Optional, List, Dict, Any

from fastmcp import FastMCP

from database.patient_db import get_patient_by_id, get_patient_timeline
from database.medical_case_db import search_cases_with_symptoms, list_medical_cases

logger = logging.getLogger(__name__)

diagnostic_tools = FastMCP("diagnostic_assistance")


@diagnostic_tools.tool(
    name="differential_diagnosis",
    description="Generate differential diagnosis list based on symptoms, age, and gender. Use when doctor provides symptoms and wants to know possible diagnoses."
)
async def differential_diagnosis(
    tenant_id: str,
    symptoms: List[str],
    patient_demographics: Optional[Dict] = None,
    patient_id: Optional[int] = None,
    include_rare: bool = False,
    limit: int = 5
) -> Dict[str, Any]:
    """
    Generate differential diagnosis based on symptoms.

    Args:
        tenant_id: Tenant ID for data isolation
        symptoms: List of symptoms (e.g., ["³ı", "øÛ", "¯@"])
        patient_demographics: Patient info dict with age, gender
        patient_id: Optional patient ID to get demographics
        include_rare: Whether to include rare diagnoses
        limit: Maximum number of diagnoses to suggest

    Returns:
        List of differential diagnoses with probabilities
    """
    try:
        # Get patient demographics if patient_id provided
        if patient_id and not patient_demographics:
            patient = get_patient_by_id(patient_id, tenant_id)
            if patient:
                patient_demographics = {
                    "age": patient.get("age"),
                    "gender": patient.get("gender")
                }

        age = patient_demographics.get("age") if patient_demographics else None
        gender = patient_demographics.get("gender") if patient_demographics else None

        # Search for cases with matching symptoms
        diagnosis_scores = {}

        for symptom in symptoms:
            cases = search_cases_with_symptoms(tenant_id, symptom, limit=30)
            for case in cases:
                diagnosis = case.get("diagnosis")
                if diagnosis:
                    if diagnosis not in diagnosis_scores:
                        diagnosis_scores[diagnosis] = {
                            "diagnosis": diagnosis,
                            "matched_symptoms": [],
                            "case_count": 0,
                            "age_match": False,
                            "gender_match": False
                        }
                    diagnosis_scores[diagnosis]["matched_symptoms"].append(symptom)
                    diagnosis_scores[diagnosis]["case_count"] += 1

                    # Check age and gender match
                    if age and case.get("age"):
                        age_diff = abs(age - case.get("age"))
                        if age_diff <= 10:
                            diagnosis_scores[diagnosis]["age_match"] = True

                    if gender and case.get("gender") == gender:
                        diagnosis_scores[diagnosis]["gender_match"] = True

        # Calculate probability scores
        for diagnosis, data in diagnosis_scores.items():
            base_score = len(set(data["matched_symptoms"])) / len(symptoms) * 100
            if data["age_match"]:
                base_score += 10
            if data["gender_match"]:
                base_score += 5

            # Cap at 95%
            data["probability_score"] = min(round(base_score, 1), 95.0)

        # Sort by probability and limit
        sorted_diagnoses = sorted(
            diagnosis_scores.values(),
            key=lambda x: x["probability_score"],
            reverse=True
        )[:limit]

        # Add recommended tests for each diagnosis
        for diag in sorted_diagnoses:
            diag["recommended_tests"] = _get_recommended_tests(diag["diagnosis"])
            diag["key_features"] = _get_key_features(diag["diagnosis"])

        return {
            "input_symptoms": symptoms,
            "patient_demographics": patient_demographics,
            "differential_diagnoses": [
                {
                    "rank": idx + 1,
                    "diagnosis": d["diagnosis"],
                    "probability_score": d["probability_score"],
                    "matched_symptoms": list(set(d["matched_symptoms"])),
                    "recommended_tests": d["recommended_tests"],
                    "key_features": d["key_features"]
                }
                for idx, d in enumerate(sorted_diagnoses)
            ],
            "note": "This is an AI-assisted suggestion. Clinical judgment should guide final diagnosis."
        }

    except Exception as e:
        logger.error(f"Error generating differential diagnosis: {str(e)}")
        return {"error": str(e)}


@diagnostic_tools.tool(
    name="suggest_next_tests",
    description="Recommend next diagnostic tests based on current findings. Use when doctor asks what tests should be done next to confirm or rule out diagnoses."
)
async def suggest_next_tests(
    tenant_id: str,
    current_symptoms: List[str],
    suspected_diagnosis: Optional[str] = None,
    completed_tests: Optional[List[str]] = None,
    patient_id: Optional[int] = None
) -> Dict[str, Any]:
    """
    Suggest next diagnostic tests.

    Args:
        tenant_id: Tenant ID for data isolation
        current_symptoms: Current symptoms observed
        suspected_diagnosis: Suspected diagnosis if any
        completed_tests: Tests already completed
        patient_id: Patient ID for context

    Returns:
        Recommended tests with priorities
    """
    try:
        completed = set(completed_tests) if completed_tests else set()

        # Get patient context if available
        patient_context = None
        if patient_id:
            patient = get_patient_by_id(patient_id, tenant_id)
            if patient:
                patient_context = {
                    "age": patient.get("age"),
                    "gender": patient.get("gender"),
                    "diagnosis": patient.get("diagnosis"),
                    "allergies": patient.get("allergies", [])
                }

        # Define test recommendations based on symptoms/diagnosis
        test_recommendations = []

        # Symptom-based recommendations
        symptom_tests = {
            "³ı": ["øèXI", "@8Ä", "ğù{", "ºŸıÀå"],
            "øÛ": ["Ã5ş", "ÃŒv1", "øèCT", "D-ŒZS"],
            "¯@": ["øèCT", "/¡\", "İ@Ÿı", "ğÆŞf"],
            "Ñí": ["@8Ä", "CÍ”Ë}", "@ù{", "M™ Ÿ"],
            "|8ğ¾": ["@", "øèCT", "Ã…ğ", "BNP"],
            "s‚¼Û": ["{ÎàP", "—CCP—S", "@‰", "XI"],
            "®¹": ["®¤;À", "—8—S", "eSC3/C4", "ÇOŸÀK"]
        }

        for symptom in current_symptoms:
            if symptom in symptom_tests:
                for test in symptom_tests[symptom]:
                    if test not in completed:
                        test_recommendations.append({
                            "test_name": test,
                            "reason": f"Based on symptom: {symptom}",
                            "priority": "high" if len([s for s in current_symptoms if s in symptom_tests and test in symptom_tests[s]]) > 1 else "medium"
                        })

        # Diagnosis-based recommendations
        if suspected_diagnosis:
            diagnosis_tests = _get_recommended_tests(suspected_diagnosis)
            for test in diagnosis_tests:
                if test not in completed:
                    # Check if already recommended
                    existing = next((t for t in test_recommendations if t["test_name"] == test), None)
                    if existing:
                        existing["priority"] = "high"
                        existing["reason"] += f"; Confirms {suspected_diagnosis}"
                    else:
                        test_recommendations.append({
                            "test_name": test,
                            "reason": f"To confirm/rule out: {suspected_diagnosis}",
                            "priority": "high"
                        })

        # Deduplicate and sort
        seen = set()
        unique_recommendations = []
        for rec in test_recommendations:
            if rec["test_name"] not in seen:
                seen.add(rec["test_name"])
                unique_recommendations.append(rec)

        # Sort by priority
        priority_order = {"high": 0, "medium": 1, "low": 2}
        unique_recommendations.sort(key=lambda x: priority_order.get(x["priority"], 2))

        return {
            "current_symptoms": current_symptoms,
            "suspected_diagnosis": suspected_diagnosis,
            "completed_tests": list(completed),
            "recommended_tests": unique_recommendations[:10],
            "urgent_tests": [t for t in unique_recommendations if t["priority"] == "high"][:3],
            "patient_context": patient_context,
            "note": "Test recommendations should be reviewed by the treating physician."
        }

    except Exception as e:
        logger.error(f"Error suggesting next tests: {str(e)}")
        return {"error": str(e)}


@diagnostic_tools.tool(
    name="risk_assessment",
    description="Assess patient risk and prognosis based on current condition. Use when doctor needs to evaluate risk factors, severity, or prognosis for a patient."
)
async def risk_assessment(
    patient_id: int,
    tenant_id: str,
    assessment_type: str = "general"
) -> Dict[str, Any]:
    """
    Assess patient risk and prognosis.

    Args:
        patient_id: The unique patient identifier
        tenant_id: Tenant ID for data isolation
        assessment_type: Type of assessment (general/surgical/treatment/prognosis)

    Returns:
        Risk assessment with scores and recommendations
    """
    try:
        # Get patient information
        patient = get_patient_by_id(patient_id, tenant_id)
        if not patient:
            return {"error": "Patient not found", "patient_id": patient_id}

        # Get timeline for medical history
        timeline = get_patient_timeline(patient_id, tenant_id)

        # Calculate risk factors
        risk_factors = []
        risk_score = 0

        # Age-based risk
        age = patient.get("age", 0)
        if age >= 65:
            risk_factors.append({"factor": "Ø„ (e65)", "impact": "high", "score": 2})
            risk_score += 2
        elif age >= 50:
            risk_factors.append({"factor": "-t (50-64)", "impact": "medium", "score": 1})
            risk_score += 1

        # Diagnosis-based risk
        diagnosis = patient.get("diagnosis", "")
        if diagnosis:
            if any(term in diagnosis for term in ["L", "v'", "Z"]):
                risk_factors.append({"factor": f"Ê­: {diagnosis}", "impact": "high", "score": 3})
                risk_score += 3
            elif any(term in diagnosis for term in ["Ç", "Ó"]):
                risk_factors.append({"factor": f"Ê­: {diagnosis}", "impact": "medium", "score": 1})
                risk_score += 1

        # Allergies
        allergies = patient.get("allergies", [])
        if allergies and len(allergies) > 0:
            risk_factors.append({"factor": f"ÇOò: {len(allergies)}y", "impact": "medium", "score": 1})
            risk_score += 1

        # Past medical history
        past_history = patient.get("past_medical_history", [])
        if past_history and len(past_history) > 2:
            risk_factors.append({"factor": f"â€Åò: {len(past_history)}y", "impact": "medium", "score": 1})
            risk_score += 1

        # Treatment history from timeline
        treatment_stages = [t for t in timeline if t.get("stage_type") == "»—"]
        if len(treatment_stages) > 2:
            risk_factors.append({"factor": "!»—ò", "impact": "medium", "score": 1})
            risk_score += 1

        # Determine risk level
        if risk_score >= 5:
            risk_level = "high"
            risk_description = "ØÎi£ ÆÑ¤Œïr„"
        elif risk_score >= 3:
            risk_level = "medium"
            risk_description = "-IÎi šÑKŒ„2ª½"
        else:
            risk_level = "low"
            risk_description = "NÎi8Ä¿sï"

        # Generate recommendations based on risk level
        recommendations = []
        if risk_level == "high":
            recommendations = [
                "ú® :Ñ¤‘‡",
                "QfÑÊ",
                "6šæÆ„”%„H",
                " :£¶^„Ÿ"
            ]
        elif risk_level == "medium":
            recommendations = [
                "šås.",
                "èÅÅØ„éF",
                "İ»—¹H„Şí'"
            ]
        else:
            recommendations = [
                "	¡¿",
                "±e·;¹",
                "še·Y²"
            ]

        return {
            "patient_id": patient_id,
            "patient_name": patient.get("name"),
            "assessment_type": assessment_type,
            "risk_assessment": {
                "risk_level": risk_level,
                "risk_score": risk_score,
                "max_score": 10,
                "description": risk_description
            },
            "risk_factors": risk_factors,
            "recommendations": recommendations,
            "monitoring_suggestions": [
                "šÀå}S",
                "ÑKs.Œ¤",
                "Ä0Ÿı¶Ø"
            ],
            "note": "ÎiÄ0Å›Â÷Ó4ŠEÅµü$­"
        }

    except Exception as e:
        logger.error(f"Error performing risk assessment: {str(e)}")
        return {"error": str(e)}


def _get_recommended_tests(diagnosis: str) -> List[str]:
    """Get recommended tests for a diagnosis."""
    test_map = {
        "ºL": ["øèCT", "PET-CT", "¿$×i", "/¡\", "Å;À"],
        "ºzL": ["øèCT", "úàÀK", "PET-CT", "MRI"],
        "{Î": ["{ÎàP", "—CCP—S", "@‰", "CÍ”Ë}", "s‚XI"],
        "Ö?Å": ["zy@Ö", "Ö@¢Ë}", "?8Ä", "<•Àå"],
        "Ø@‹": ["@‹ÑK", "Ã5ş", "¾Ÿı", "<•Àå"],
        " ÃÅ": ["Ã5ş", "Ã…ğ", " 	CT", "ÃŒv1"]
    }

    for key, tests in test_map.items():
        if key in diagnosis:
            return tests

    return ["@8Ä", "hW", "qÏfÀå"]


def _get_key_features(diagnosis: str) -> List[str]:
    """Get key diagnostic features for a diagnosis."""
    feature_map = {
        "ºL": ["í'³ı", "¯@", "SÍM", "øÛ"],
        "ºzL": ["³ı", "ø÷", "|8ğ¾", "ğ-&@"],
        "{Î": ["hõ", "ùğ's‚¿Û", "s‚xb"],
        "Ö?Å": ["n", "?", "ß", "SÍM"],
        "Ø@‹": ["4Û", "4U", "Ã¸"],
        " ÃÅ": ["ø÷", "ÃŞÛ", ";¨Ã"]
    }

    for key, features in feature_map.items():
        if key in diagnosis:
            return features

    return [" Û e4ŠÄ0"]
