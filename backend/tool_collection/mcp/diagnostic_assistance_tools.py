"""
Diagnostic Assistance Tools for Medical AI Agent
MCP-based tools for differential diagnosis and test recommendations
"""

from fastmcp import FastMCP
from typing import Optional, List, Dict, Any
import logging

# Import services
from services.medical_case_service import search_cases
from services.patient_service import get_patient_info, get_patient_timeline_service

logger = logging.getLogger(__name__)

# Create MCP server for diagnostic assistance tools
diagnostic_tools = FastMCP("diagnostic_assistance")


@diagnostic_tools.tool(
    name="differential_diagnosis",
    description="Provide differential diagnosis suggestions based on symptoms, lab results, and imaging findings. Use this when doctor needs help with diagnosis or wants to rule out certain conditions."
)
async def differential_diagnosis_tool(
    symptoms: List[str],
    tenant_id: str,
    lab_results: Optional[Dict[str, Any]] = None,
    imaging_findings: Optional[List[str]] = None,
    patient_demographics: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Generate differential diagnosis suggestions

    Args:
        symptoms: List of symptoms
        tenant_id: Tenant ID for data isolation
        lab_results: Laboratory results (optional) {"white_blood_cell": 12000, "hemoglobin": 10, ...}
        imaging_findings: Imaging findings (optional) ["肺部阴影", "淋巴结肿大", ...]
        patient_demographics: Patient demographics (optional) {"age": 60, "gender": "male", ...}

    Returns:
        Differential diagnosis list with possible diagnoses, probability scores, supporting evidence, recommended tests
    """
    try:
        # Build comprehensive search query
        query_parts = symptoms.copy()

        if imaging_findings:
            query_parts.extend(imaging_findings)

        if patient_demographics:
            age = patient_demographics.get('age')
            gender = patient_demographics.get('gender')
            if age:
                query_parts.append(f"{age}岁")
            if gender:
                query_parts.append(gender)

        search_query = " ".join(query_parts)

        # Search for similar cases
        similar_cases = await search_cases(
            tenant_id=tenant_id,
            search_query=search_query,
            limit=20
        )

        # Analyze diagnoses from similar cases
        diagnosis_counts = {}
        diagnosis_details = {}

        for case in similar_cases:
            diagnosis = case.get('diagnosis', 'Unknown')
            disease_type = case.get('disease_type', 'Unknown')

            if diagnosis not in diagnosis_counts:
                diagnosis_counts[diagnosis] = 0
                diagnosis_details[diagnosis] = {
                    "disease_type": disease_type,
                    "supporting_cases": [],
                    "common_symptoms": [],
                }

            diagnosis_counts[diagnosis] += 1
            diagnosis_details[diagnosis]["supporting_cases"].append(case.get('case_no'))

            # Collect common symptoms
            case_symptoms = case.get('symptoms', [])
            for symptom in symptoms:
                if symptom in case_symptoms and symptom not in diagnosis_details[diagnosis]["common_symptoms"]:
                    diagnosis_details[diagnosis]["common_symptoms"].append(symptom)

        # Calculate probability scores
        total_cases = len(similar_cases)
        differential_diagnoses = []

        for diagnosis, count in diagnosis_counts.items():
            probability = (count / total_cases * 100) if total_cases > 0 else 0

            # Calculate symptom match score
            matched_symptoms = len(diagnosis_details[diagnosis]["common_symptoms"])
            total_symptoms = len(symptoms)
            symptom_match_score = (matched_symptoms / total_symptoms * 100) if total_symptoms > 0 else 0

            # Supporting evidence
            supporting_evidence = []
            supporting_evidence.append(f"Found {count} similar cases with this diagnosis")
            supporting_evidence.append(f"{matched_symptoms}/{total_symptoms} symptoms match")

            if lab_results:
                supporting_evidence.append("Lab results provided for analysis")

            if imaging_findings:
                supporting_evidence.append(f"Imaging findings: {', '.join(imaging_findings[:3])}")

            # Recommended tests
            recommended_tests = []
            if diagnosis_details[diagnosis]["disease_type"] in ["肺腺癌", "肺鳞癌", "肺癌"]:
                recommended_tests = [
                    {"test_name": "胸部CT增强扫描", "priority": "high", "reason": "明确肺部病变性质和范围"},
                    {"test_name": "肿瘤标志物检测", "priority": "high", "reason": "辅助诊断和监测"},
                    {"test_name": "病理活检", "priority": "high", "reason": "确诊金标准"},
                    {"test_name": "PET-CT", "priority": "medium", "reason": "评估全身转移情况"},
                ]
            elif diagnosis_details[diagnosis]["disease_type"] in ["胃癌"]:
                recommended_tests = [
                    {"test_name": "胃镜检查+活检", "priority": "high", "reason": "确诊金标准"},
                    {"test_name": "腹部CT", "priority": "high", "reason": "评估病变范围"},
                    {"test_name": "肿瘤标志物（CEA、CA19-9）", "priority": "medium", "reason": "辅助诊断"},
                ]
            else:
                recommended_tests = [
                    {"test_name": "相关影像学检查", "priority": "high", "reason": "明确病变部位和性质"},
                    {"test_name": "病理活检", "priority": "high", "reason": "确诊"},
                    {"test_name": "实验室检查", "priority": "medium", "reason": "评估全身状况"},
                ]

            differential_diagnoses.append({
                "diagnosis": diagnosis,
                "disease_type": diagnosis_details[diagnosis]["disease_type"],
                "probability_score": round(probability, 1),
                "symptom_match_score": round(symptom_match_score, 1),
                "supporting_evidence": supporting_evidence,
                "matched_symptoms": diagnosis_details[diagnosis]["common_symptoms"],
                "supporting_case_count": count,
                "recommended_tests": recommended_tests,
            })

        # Sort by probability score
        differential_diagnoses.sort(key=lambda x: x['probability_score'], reverse=True)

        # Take top 5 diagnoses
        differential_diagnoses = differential_diagnoses[:5]

        logger.info(f"Generated {len(differential_diagnoses)} differential diagnoses")
        return {
            "input_symptoms": symptoms,
            "lab_results": lab_results,
            "imaging_findings": imaging_findings,
            "patient_demographics": patient_demographics,
            "total_similar_cases": total_cases,
            "differential_diagnoses": differential_diagnoses,
            "recommendation": "请结合患者具体情况和进一步检查结果综合判断。建议优先考虑概率评分较高的诊断。"
        }

    except Exception as e:
        logger.error(f"Error generating differential diagnosis: {str(e)}")
        return {"error": str(e)}


@diagnostic_tools.tool(
    name="suggest_next_tests",
    description="Suggest next diagnostic tests based on patient's current diagnosis and completed tests. Use this when doctor needs guidance on what tests to order next."
)
async def suggest_next_tests_tool(
    patient_id: int,
    tenant_id: str,
    current_diagnosis: str,
    completed_tests: Optional[List[str]] = None
) -> Dict[str, Any]:
    """
    Suggest next diagnostic tests

    Args:
        patient_id: Patient ID
        tenant_id: Tenant ID for data isolation
        current_diagnosis: Current diagnosis or suspected diagnosis
        completed_tests: List of already completed tests

    Returns:
        Test recommendation list with test names, necessity ratings, expected information, priorities
    """
    try:
        # Get patient info
        patient = await get_patient_info(patient_id, tenant_id)

        if not patient:
            return {"error": "Patient not found"}

        # Get patient timeline to see what tests have been done
        timeline = await get_patient_timeline_service(patient_id, tenant_id)

        # Extract completed tests from timeline if not provided
        if not completed_tests:
            completed_tests = []
            for event in timeline:
                if event.get('stage_type') == 'examination':
                    completed_tests.append(event.get('stage_title'))

        # Define test recommendations based on diagnosis
        test_database = {
            "肺腺癌": [
                {
                    "test_name": "胸部CT增强扫描",
                    "necessity": "essential",
                    "expected_information": "明确肺部病变的位置、大小、形态、周围血管关系",
                    "priority": "high",
                    "optimal_timing": "确诊前",
                    "cost_level": "medium"
                },
                {
                    "test_name": "支气管镜检查+活检",
                    "necessity": "essential",
                    "expected_information": "获取病理组织，明确病理类型和分子分型",
                    "priority": "high",
                    "optimal_timing": "确诊前",
                    "cost_level": "high"
                },
                {
                    "test_name": "肿瘤标志物检测（CEA、NSE、CYFRA21-1）",
                    "necessity": "recommended",
                    "expected_information": "辅助诊断和疗效监测",
                    "priority": "medium",
                    "optimal_timing": "治疗前后",
                    "cost_level": "low"
                },
                {
                    "test_name": "PET-CT全身扫描",
                    "necessity": "recommended",
                    "expected_information": "评估全身转移情况，进行临床分期",
                    "priority": "medium",
                    "optimal_timing": "治疗方案制定前",
                    "cost_level": "high"
                },
                {
                    "test_name": "基因检测（EGFR、ALK等）",
                    "necessity": "essential",
                    "expected_information": "指导靶向治疗方案选择",
                    "priority": "high",
                    "optimal_timing": "病理确诊后",
                    "cost_level": "high"
                },
                {
                    "test_name": "肺功能检查",
                    "necessity": "recommended",
                    "expected_information": "评估手术耐受性",
                    "priority": "medium",
                    "optimal_timing": "术前",
                    "cost_level": "low"
                },
            ],
            "胃癌": [
                {
                    "test_name": "胃镜检查+病理活检",
                    "necessity": "essential",
                    "expected_information": "确诊胃癌，明确病理类型",
                    "priority": "high",
                    "optimal_timing": "确诊前",
                    "cost_level": "medium"
                },
                {
                    "test_name": "腹部CT增强扫描",
                    "necessity": "essential",
                    "expected_information": "评估病变范围、淋巴结转移、腹腔转移情况",
                    "priority": "high",
                    "optimal_timing": "确诊后",
                    "cost_level": "medium"
                },
                {
                    "test_name": "肿瘤标志物（CEA、CA19-9、CA72-4）",
                    "necessity": "recommended",
                    "expected_information": "辅助诊断和疗效监测",
                    "priority": "medium",
                    "optimal_timing": "治疗前后",
                    "cost_level": "low"
                },
                {
                    "test_name": "HER2检测",
                    "necessity": "recommended",
                    "expected_information": "指导靶向治疗（曲妥珠单抗）",
                    "priority": "medium",
                    "optimal_timing": "病理确诊后",
                    "cost_level": "medium"
                },
            ],
            "default": [
                {
                    "test_name": "相关部位影像学检查（CT/MRI）",
                    "necessity": "essential",
                    "expected_information": "明确病变部位、范围和性质",
                    "priority": "high",
                    "optimal_timing": "诊断阶段",
                    "cost_level": "medium"
                },
                {
                    "test_name": "病理活检",
                    "necessity": "essential",
                    "expected_information": "确诊疾病类型",
                    "priority": "high",
                    "optimal_timing": "确诊前",
                    "cost_level": "medium"
                },
                {
                    "test_name": "血常规、生化全套",
                    "necessity": "essential",
                    "expected_information": "评估全身状况",
                    "priority": "medium",
                    "optimal_timing": "治疗前",
                    "cost_level": "low"
                },
            ]
        }

        # Get test recommendations for current diagnosis
        test_recommendations = test_database.get(current_diagnosis, test_database["default"])

        # Filter out completed tests
        pending_tests = []
        for test in test_recommendations:
            # Check if test is already completed
            is_completed = any(completed in test['test_name'] or test['test_name'] in completed
                             for completed in completed_tests)

            if not is_completed:
                pending_tests.append({
                    **test,
                    "status": "recommended"
                })
            else:
                # Include completed tests but mark them
                pending_tests.append({
                    **test,
                    "status": "completed"
                })

        # Sort by priority
        priority_order = {"high": 0, "medium": 1, "low": 2}
        pending_tests.sort(key=lambda x: (
            0 if x['status'] == 'recommended' else 1,  # Recommended tests first
            priority_order.get(x['priority'], 3)
        ))

        logger.info(f"Generated {len(pending_tests)} test recommendations for patient: {patient_id}")
        return {
            "patient_id": patient_id,
            "current_diagnosis": current_diagnosis,
            "completed_tests_count": len([t for t in pending_tests if t['status'] == 'completed']),
            "recommended_tests_count": len([t for t in pending_tests if t['status'] == 'recommended']),
            "test_recommendations": pending_tests,
            "next_steps": "建议优先完成必需性为'essential'且优先级为'high'的检查项目。"
        }

    except Exception as e:
        logger.error(f"Error suggesting next tests: {str(e)}")
        return {"error": str(e)}


@diagnostic_tools.tool(
    name="risk_assessment",
    description="Assess patient risk factors and prognosis based on current condition and medical history. Use this for risk stratification and treatment planning."
)
async def risk_assessment_tool(
    patient_id: int,
    tenant_id: str,
    diagnosis: str,
    stage: Optional[str] = None
) -> Dict[str, Any]:
    """
    Assess patient risk and prognosis

    Args:
        patient_id: Patient ID
        tenant_id: Tenant ID for data isolation
        diagnosis: Diagnosis
        stage: Disease stage (optional, e.g., "I", "II", "III", "IV")

    Returns:
        Risk assessment with risk factors, prognosis, survival estimates, treatment recommendations
    """
    try:
        # Get patient info
        patient = await get_patient_info(patient_id, tenant_id)

        if not patient:
            return {"error": "Patient not found"}

        age = patient.get('age')
        gender = patient.get('gender')

        # Get patient timeline
        timeline = await get_patient_timeline_service(patient_id, tenant_id)

        # Analyze risk factors
        risk_factors = []

        # Age-related risk
        if age >= 70:
            risk_factors.append({
                "factor": "高龄（≥70岁）",
                "impact": "high",
                "description": "手术耐受性降低，并发症风险增加"
            })
        elif age >= 60:
            risk_factors.append({
                "factor": "年龄（60-70岁）",
                "impact": "medium",
                "description": "需要综合评估手术耐受性"
            })

        # Disease stage risk
        if stage:
            if stage in ["III", "IV"]:
                risk_factors.append({
                    "factor": f"晚期疾病（{stage}期）",
                    "impact": "high",
                    "description": "预后较差，需要综合治疗"
                })
            elif stage == "II":
                risk_factors.append({
                    "factor": f"中期疾病（{stage}期）",
                    "impact": "medium",
                    "description": "积极治疗预后良好"
                })

        # Check for comorbidities from timeline
        has_comorbidities = False
        for event in timeline:
            notes = event.get('doctor_notes', '')
            if any(keyword in notes for keyword in ['糖尿病', '高血压', '心脏病', '肾病']):
                has_comorbidities = True
                break

        if has_comorbidities:
            risk_factors.append({
                "factor": "基础疾病",
                "impact": "medium",
                "description": "需要控制基础疾病，优化治疗方案"
            })

        # Calculate overall risk score
        risk_score = 0
        for rf in risk_factors:
            if rf['impact'] == 'high':
                risk_score += 3
            elif rf['impact'] == 'medium':
                risk_score += 2
            else:
                risk_score += 1

        # Determine risk level
        if risk_score >= 6:
            risk_level = "high"
            risk_description = "高风险患者，需要密切监护和个体化治疗方案"
        elif risk_score >= 3:
            risk_level = "medium"
            risk_description = "中等风险患者，需要规范治疗和定期随访"
        else:
            risk_level = "low"
            risk_description = "低风险患者，预后良好"

        # Prognosis estimation (simplified)
        prognosis = {
            "risk_level": risk_level,
            "risk_score": risk_score,
            "risk_description": risk_description,
        }

        # Stage-based survival estimates (example data)
        if diagnosis in ["肺腺癌", "肺鳞癌", "肺癌"]:
            survival_estimates = {
                "I": {"5_year_survival": "60-80%", "median_survival": "60+ months"},
                "II": {"5_year_survival": "40-60%", "median_survival": "40-50 months"},
                "III": {"5_year_survival": "15-30%", "median_survival": "15-25 months"},
                "IV": {"5_year_survival": "5-10%", "median_survival": "8-12 months"},
            }
            if stage and stage in survival_estimates:
                prognosis["survival_estimates"] = survival_estimates[stage]

        # Treatment recommendations
        treatment_recommendations = []
        if risk_level == "high":
            treatment_recommendations = [
                "建议多学科会诊（MDT）制定个体化治疗方案",
                "需要全面评估手术耐受性",
                "考虑新辅助治疗降低手术风险",
                "加强术后监护和康复管理",
            ]
        elif risk_level == "medium":
            treatment_recommendations = [
                "规范化综合治疗（手术+化疗/放疗）",
                "定期复查监测疾病进展",
                "营养支持和康复训练",
            ]
        else:
            treatment_recommendations = [
                "首选根治性手术",
                "术后规范化辅助治疗",
                "定期随访监测",
            ]

        prognosis["treatment_recommendations"] = treatment_recommendations

        logger.info(f"Completed risk assessment for patient: {patient_id}")
        return {
            "patient_id": patient_id,
            "diagnosis": diagnosis,
            "stage": stage,
            "risk_factors": risk_factors,
            "prognosis": prognosis,
        }

    except Exception as e:
        logger.error(f"Error in risk assessment: {str(e)}")
        return {"error": str(e)}
