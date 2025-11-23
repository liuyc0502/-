"""
Diagnostic Assistance MCP Tools

Tools for symptom analysis, lab interpretation, and clinical calculations.
"""

import json
import logging
import math
from typing import Optional, List
from fastmcp import FastMCP

logger = logging.getLogger(__name__)


def register_diagnostic_tools(mcp: FastMCP):
    """Register all diagnostic assistance tools to the MCP service."""

    @mcp.tool(
        name="symptom_analyzer",
        description="Analyze patient symptoms and suggest possible conditions."
    )
    async def symptom_analyzer(
        symptoms: List[str],
        duration: Optional[str] = None,
        severity: Optional[str] = None,
        patient_age: Optional[int] = None,
        patient_gender: Optional[str] = None
    ) -> str:
        """Analyze symptoms and provide diagnostic suggestions."""
        try:
            from services.medical_case_service import search_cases
            from utils.auth_utils import get_default_tenant_id

            tenant_id = get_default_tenant_id()
            search_query = " ".join(symptoms)
            similar_cases = await search_cases(tenant_id, search_query, limit=15)

            diagnosis_count = {}
            for case in similar_cases:
                diagnosis = case.get("diagnosis")
                if diagnosis:
                    diagnosis_count[diagnosis] = diagnosis_count.get(diagnosis, 0) + 1

            possible_conditions = sorted(diagnosis_count.items(), key=lambda x: x[1], reverse=True)[:5]

            analysis = {
                "input": {
                    "symptoms": symptoms,
                    "duration": duration,
                    "severity": severity,
                    "age": patient_age,
                    "gender": patient_gender
                },
                "possible_conditions": [
                    {"condition": cond, "match_count": count}
                    for cond, count in possible_conditions
                ],
                "urgency_indicators": [],
                "recommended_actions": [
                    "完整体格检查",
                    "复习病史",
                    "考虑相关实验室检查",
                    "与数据库中类似病例对比"
                ]
            }

            if severity == "severe":
                analysis["urgency_indicators"].append("症状严重 - 建议紧急评估")

            return json.dumps({
                "success": True,
                "analysis": analysis,
                "cases_analyzed": len(similar_cases),
                "note": "此分析仅供参考，临床诊断需专业医学评估。"
            }, ensure_ascii=False, default=str)
        except Exception as e:
            logger.error(f"symptom_analyzer failed: {str(e)}")
            return json.dumps({"success": False, "error": str(e)}, ensure_ascii=False)

    @mcp.tool(
        name="lab_result_interpreter",
        description="Interpret laboratory test results and explain clinical significance."
    )
    async def lab_result_interpreter(lab_results: List[dict]) -> str:
        """Interpret lab test results."""
        try:
            interpretations = []
            abnormal_count = 0

            for result in lab_results:
                name = result.get("name", "")
                value = result.get("value")
                unit = result.get("unit", "")
                ref_min = result.get("reference_min")
                ref_max = result.get("reference_max")

                status = "normal"
                try:
                    val = float(value) if value else None
                    if val is not None:
                        if ref_min is not None and val < float(ref_min):
                            status = "low"
                            abnormal_count += 1
                        elif ref_max is not None and val > float(ref_max):
                            status = "high"
                            abnormal_count += 1
                except (ValueError, TypeError):
                    pass

                interpretations.append({
                    "name": name,
                    "value": value,
                    "unit": unit,
                    "reference_range": f"{ref_min}-{ref_max}" if ref_min and ref_max else "",
                    "status": status
                })

            return json.dumps({
                "success": True,
                "total_tests": len(lab_results),
                "abnormal_count": abnormal_count,
                "interpretations": interpretations,
                "note": "检验结果解读需结合临床情况由专业医生评估。"
            }, ensure_ascii=False, default=str)
        except Exception as e:
            logger.error(f"lab_result_interpreter failed: {str(e)}")
            return json.dumps({"success": False, "error": str(e)}, ensure_ascii=False)

    @mcp.tool(
        name="clinical_calculator",
        description="Perform clinical calculations like BMI, eGFR, BSA."
    )
    async def clinical_calculator(
        calculation_type: str,
        parameters: dict
    ) -> str:
        """Perform clinical calculations."""
        try:
            result = None
            formula_used = ""
            interpretation = ""

            if calculation_type == "bmi":
                weight = parameters.get("weight_kg")
                height = parameters.get("height_cm")
                if weight and height:
                    height_m = float(height) / 100
                    bmi = float(weight) / (height_m ** 2)
                    result = round(bmi, 1)
                    formula_used = "BMI = weight(kg) / height(m)²"
                    if result < 18.5:
                        interpretation = "体重过轻"
                    elif result < 25:
                        interpretation = "正常体重"
                    elif result < 30:
                        interpretation = "超重"
                    else:
                        interpretation = "肥胖"

            elif calculation_type == "bsa":
                weight = parameters.get("weight_kg")
                height = parameters.get("height_cm")
                if weight and height:
                    bsa = math.sqrt((float(height) * float(weight)) / 3600)
                    result = round(bsa, 2)
                    formula_used = "BSA = √((height_cm × weight_kg) / 3600) [Mosteller]"
                    interpretation = f"体表面积: {result} m²"

            elif calculation_type == "egfr":
                creatinine = parameters.get("creatinine")
                age = parameters.get("age")
                gender = parameters.get("gender")
                if creatinine and age:
                    cr = float(creatinine)
                    a = float(age)
                    if gender and gender.lower() == "female":
                        k, alpha, base = 0.7, -0.329, 144
                    else:
                        k, alpha, base = 0.9, -0.411, 141

                    egfr = base * min(cr/k, 1)**alpha * max(cr/k, 1)**(-1.209) * (0.993**a)
                    if gender and gender.lower() == "female":
                        egfr *= 1.018

                    result = round(egfr, 1)
                    formula_used = "CKD-EPI公式"
                    if result >= 90:
                        interpretation = "肾功能正常 (G1)"
                    elif result >= 60:
                        interpretation = "轻度下降 (G2)"
                    elif result >= 45:
                        interpretation = "轻中度下降 (G3a)"
                    elif result >= 30:
                        interpretation = "中重度下降 (G3b)"
                    elif result >= 15:
                        interpretation = "重度下降 (G4)"
                    else:
                        interpretation = "肾衰竭 (G5)"
            else:
                return json.dumps({
                    "success": False,
                    "error": f"未知计算类型: {calculation_type}",
                    "supported_types": ["bmi", "bsa", "egfr"]
                })

            return json.dumps({
                "success": True,
                "calculation_type": calculation_type,
                "input_parameters": parameters,
                "result": result,
                "formula": formula_used,
                "interpretation": interpretation
            }, ensure_ascii=False, default=str)
        except Exception as e:
            logger.error(f"clinical_calculator failed: {str(e)}")
            return json.dumps({"success": False, "error": str(e)}, ensure_ascii=False)

    @mcp.tool(
        name="knowledge_qa",
        description="Query medical knowledge base for information about diseases and treatments."
    )
    async def knowledge_qa(
        query: str,
        search_mode: str = "hybrid",
        index_names: Optional[List[str]] = None,
        top_k: int = 5
    ) -> str:
        """Query medical knowledge base."""
        try:
            from services.elasticsearch_service import get_es_core, get_embedding_model
            from utils.auth_utils import get_default_tenant_id
            from database.knowledge_db import get_knowledge_info_by_tenant_id

            tenant_id = get_default_tenant_id()
            es_core = get_es_core()
            embedding_model = get_embedding_model(tenant_id)

            if not index_names:
                knowledge_bases = get_knowledge_info_by_tenant_id(tenant_id)
                index_names = [kb.get("index_name") for kb in knowledge_bases if kb.get("index_name")]

            if not index_names:
                return json.dumps({
                    "success": False,
                    "error": "没有可用的知识库，请先创建知识库。"
                })

            if search_mode == "hybrid":
                results = es_core.hybrid_search(
                    index_names=index_names, query_text=query,
                    embedding_model=embedding_model, top_k=top_k
                )
            elif search_mode == "accurate":
                results = es_core.accurate_search(index_names=index_names, query_text=query, top_k=top_k)
            elif search_mode == "semantic":
                results = es_core.semantic_search(
                    index_names=index_names, query_text=query,
                    embedding_model=embedding_model, top_k=top_k
                )
            else:
                return json.dumps({"success": False, "error": f"无效搜索模式: {search_mode}"})

            formatted_results = [{
                "title": r.get("document", {}).get("title") or r.get("document", {}).get("filename", ""),
                "content": r.get("document", {}).get("content", ""),
                "source": r.get("document", {}).get("path_or_url", ""),
                "score": r.get("score", 0)
            } for r in results]

            return json.dumps({
                "success": True,
                "query": query,
                "count": len(formatted_results),
                "results": formatted_results
            }, ensure_ascii=False, default=str)
        except Exception as e:
            logger.error(f"knowledge_qa failed: {str(e)}")
            return json.dumps({"success": False, "error": str(e)}, ensure_ascii=False)
