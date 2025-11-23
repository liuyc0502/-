"""
Medical Case MCP Tools

Tools for searching, viewing, and analyzing medical cases.
"""

import json
import logging
from typing import Optional, List
from fastmcp import FastMCP

logger = logging.getLogger(__name__)


def register_case_tools(mcp: FastMCP):
    """Register all medical case tools to the MCP service."""

    @mcp.tool(
        name="case_search",
        description="Search medical cases by symptoms, diagnosis, disease type, or natural language query."
    )
    async def case_search(
        search_query: str,
        disease_types: Optional[List[str]] = None,
        age_range: Optional[str] = None,
        gender: Optional[str] = None,
        limit: int = 10
    ) -> str:
        """Search medical cases with filters."""
        try:
            from services.medical_case_service import list_cases, search_cases
            from utils.auth_utils import get_default_tenant_id

            tenant_id = get_default_tenant_id()

            if not disease_types and not age_range and not gender:
                cases = await search_cases(tenant_id, search_query, limit)
            else:
                cases = await list_cases(
                    tenant_id=tenant_id,
                    search_query=search_query,
                    disease_types=disease_types,
                    age_range=age_range,
                    gender=gender,
                    limit=limit
                )

            result = [{
                "case_id": c.get("case_id"),
                "case_no": c.get("case_no"),
                "diagnosis": c.get("diagnosis"),
                "disease_type": c.get("disease_type"),
                "age": c.get("age"),
                "gender": c.get("gender"),
                "chief_complaint": c.get("chief_complaint"),
                "symptoms": c.get("symptoms", [])
            } for c in cases]

            return json.dumps({"success": True, "count": len(result), "cases": result}, ensure_ascii=False, default=str)
        except Exception as e:
            logger.error(f"case_search failed: {str(e)}")
            return json.dumps({"success": False, "error": str(e)}, ensure_ascii=False)

    @mcp.tool(
        name="case_detail_query",
        description="Get detailed information of a specific medical case."
    )
    async def case_detail_query(case_id: int) -> str:
        """Get complete case details."""
        try:
            from services.medical_case_service import get_case_info
            from utils.auth_utils import get_default_tenant_id, get_default_user_id

            tenant_id = get_default_tenant_id()
            user_id = get_default_user_id()

            case = await get_case_info(case_id, tenant_id, user_id)
            if not case:
                return json.dumps({"success": False, "error": "Case not found"})

            detail = case.get("detail", {})
            result = {
                "basic_info": {
                    "case_no": case.get("case_no"),
                    "diagnosis": case.get("diagnosis"),
                    "disease_type": case.get("disease_type"),
                    "age": case.get("age"),
                    "gender": case.get("gender"),
                    "chief_complaint": case.get("chief_complaint")
                },
                "symptoms": [s.get("symptom_name") for s in case.get("symptoms", [])],
                "clinical_details": {
                    "present_illness_history": detail.get("present_illness_history"),
                    "physical_examination": detail.get("physical_examination"),
                    "diagnosis_basis": detail.get("diagnosis_basis"),
                    "treatment_plan": detail.get("treatment_plan"),
                    "prognosis": detail.get("prognosis")
                },
                "lab_results": [{
                    "name": lr.get("result_name"),
                    "value": lr.get("result_value"),
                    "unit": lr.get("result_unit")
                } for lr in case.get("lab_results", [])]
            }

            return json.dumps({"success": True, "case": result}, ensure_ascii=False, default=str)
        except Exception as e:
            logger.error(f"case_detail_query failed: {str(e)}")
            return json.dumps({"success": False, "error": str(e)}, ensure_ascii=False)

    @mcp.tool(
        name="case_differential_diagnosis",
        description="Generate differential diagnosis suggestions based on symptoms."
    )
    async def case_differential_diagnosis(
        symptoms: List[str],
        chief_complaint: Optional[str] = None,
        age: Optional[int] = None,
        gender: Optional[str] = None
    ) -> str:
        """Generate differential diagnosis from symptoms."""
        try:
            from services.medical_case_service import search_cases
            from utils.auth_utils import get_default_tenant_id

            tenant_id = get_default_tenant_id()
            search_query = " ".join(symptoms)
            if chief_complaint:
                search_query = f"{chief_complaint} {search_query}"

            similar_cases = await search_cases(tenant_id, search_query, limit=20)

            # Aggregate diagnoses
            diagnosis_count = {}
            for case in similar_cases:
                diagnosis = case.get("diagnosis")
                if diagnosis:
                    diagnosis_count[diagnosis] = diagnosis_count.get(diagnosis, 0) + 1

            sorted_diagnoses = sorted(diagnosis_count.items(), key=lambda x: x[1], reverse=True)

            differential_list = [{
                "diagnosis": diagnosis,
                "frequency": count,
                "confidence": round(count / len(similar_cases) * 100, 1) if similar_cases else 0
            } for diagnosis, count in sorted_diagnoses[:10]]

            return json.dumps({
                "success": True,
                "input_symptoms": symptoms,
                "cases_analyzed": len(similar_cases),
                "differential_diagnoses": differential_list
            }, ensure_ascii=False, default=str)
        except Exception as e:
            logger.error(f"case_differential_diagnosis failed: {str(e)}")
            return json.dumps({"success": False, "error": str(e)}, ensure_ascii=False)

    @mcp.tool(
        name="case_recommendation",
        description="Recommend similar medical cases based on diagnosis or reference case."
    )
    async def case_recommendation(
        reference_case_id: Optional[int] = None,
        diagnosis: Optional[str] = None,
        disease_type: Optional[str] = None,
        limit: int = 5
    ) -> str:
        """Recommend similar cases."""
        try:
            from services.medical_case_service import get_case_info, search_cases, list_cases
            from utils.auth_utils import get_default_tenant_id, get_default_user_id

            tenant_id = get_default_tenant_id()
            user_id = get_default_user_id()
            search_query = ""

            if reference_case_id:
                ref_case = await get_case_info(reference_case_id, tenant_id, user_id)
                if ref_case:
                    search_query = f"{ref_case.get('diagnosis', '')} {ref_case.get('chief_complaint', '')}"
            elif diagnosis:
                search_query = diagnosis

            if search_query:
                cases = await search_cases(tenant_id, search_query, limit + 1)
                cases = [c for c in cases if c.get("case_id") != reference_case_id][:limit]
            elif disease_type:
                cases = await list_cases(tenant_id=tenant_id, disease_types=[disease_type], limit=limit)
            else:
                return json.dumps({"success": False, "error": "Provide reference_case_id, diagnosis, or disease_type"})

            recommendations = [{
                "case_id": c.get("case_id"),
                "case_no": c.get("case_no"),
                "diagnosis": c.get("diagnosis"),
                "chief_complaint": c.get("chief_complaint")
            } for c in cases]

            return json.dumps({"success": True, "recommendations": recommendations}, ensure_ascii=False, default=str)
        except Exception as e:
            logger.error(f"case_recommendation failed: {str(e)}")
            return json.dumps({"success": False, "error": str(e)}, ensure_ascii=False)
