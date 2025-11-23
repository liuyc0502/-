"""
AI Summary Tools - MCP Format
Tools for generating AI-powered summaries for various content types
"""
import logging
from typing import Optional, List, Dict, Any

from fastmcp import FastMCP

from database.patient_db import get_patient_by_id, get_patient_timeline
from database.medical_case_db import get_case_by_id
from database.conversation_db import get_conversation_by_id

logger = logging.getLogger(__name__)

ai_summary_tools = FastMCP("ai_summary")


@ai_summary_tools.tool(
    name="generate_conversation_summary",
    description="Generate an AI summary for a conversation. Analyzes the conversation content and creates a concise summary highlighting key points, questions asked, and conclusions reached."
)
async def generate_conversation_summary(
    conversation_id: int,
    tenant_id: str,
    summary_style: str = "clinical",
    max_length: int = 200
) -> Dict[str, Any]:
    """
    Generate AI summary for a conversation.

    Args:
        conversation_id: The conversation ID to summarize
        tenant_id: Tenant ID for data isolation
        summary_style: Style of summary (clinical/brief/detailed)
        max_length: Maximum length of summary in characters

    Returns:
        Generated summary with metadata
    """
    try:
        # Get conversation data
        conversation = get_conversation_by_id(conversation_id, tenant_id)
        if not conversation:
            return {"error": "Conversation not found", "conversation_id": conversation_id}

        style_prompts = {
            "clinical": """请为以下医疗对话生成临床风格的摘要：
1. 患者主诉/咨询问题
2. 关键讨论点
3. 给出的建议或结论
4. 后续注意事项（如有）

请使用专业但易懂的语言，控制在{}字以内。""",
            "brief": """请为以下对话生成简短摘要，突出核心问题和结论，控制在{}字以内。""",
            "detailed": """请详细总结以下对话内容，包括：
1. 对话背景
2. 讨论的所有要点
3. 各方观点
4. 最终结论或建议
5. 待解决问题

控制在{}字以内。"""
        }

        prompt = style_prompts.get(summary_style, style_prompts["clinical"]).format(max_length)

        result = {
            "conversation_id": conversation_id,
            "conversation_title": conversation.get("conversation_title"),
            "summary_style": summary_style,
            "max_length": max_length,
            "summary_prompt": prompt,
            "status": "ready_for_summary",
            "expected_output": {
                "summary": "生成的摘要内容",
                "key_topics": ["主题1", "主题2"],
                "word_count": 0,
                "generated_at": "timestamp"
            }
        }

        logger.info(f"Prepared conversation summary generation for {conversation_id}")
        return result

    except Exception as e:
        logger.error(f"Error generating conversation summary: {str(e)}")
        return {"error": str(e)}


@ai_summary_tools.tool(
    name="generate_patient_summary",
    description="Generate a comprehensive AI summary of a patient's medical history, current condition, and treatment progress. Useful for quick patient overview."
)
async def generate_patient_summary(
    patient_id: int,
    tenant_id: str,
    include_timeline: bool = True,
    summary_focus: str = "comprehensive"
) -> Dict[str, Any]:
    """
    Generate AI summary for a patient.

    Args:
        patient_id: The patient ID
        tenant_id: Tenant ID for data isolation
        include_timeline: Whether to include timeline events
        summary_focus: Focus area (comprehensive/diagnosis/treatment/prognosis)

    Returns:
        Patient summary with key information
    """
    try:
        # Get patient data
        patient = get_patient_by_id(patient_id, tenant_id)
        if not patient:
            return {"error": "Patient not found", "patient_id": patient_id}

        # Get timeline if requested
        timeline = []
        if include_timeline:
            timeline = get_patient_timeline(patient_id, tenant_id)

        focus_prompts = {
            "comprehensive": """请为该患者生成综合摘要，包括：
1. 基本信息概述
2. 主要诊断
3. 治疗历程
4. 当前状态
5. 注意事项

请使用医疗专业语言。""",
            "diagnosis": """请总结该患者的诊断信息：
1. 主要诊断
2. 次要诊断
3. 鉴别诊断历程
4. 诊断依据""",
            "treatment": """请总结该患者的治疗情况：
1. 已接受的治疗
2. 当前治疗方案
3. 治疗效果评估
4. 后续治疗建议""",
            "prognosis": """请评估该患者的预后：
1. 当前状态评估
2. 预期恢复情况
3. 风险因素
4. 随访建议"""
        }

        prompt = focus_prompts.get(summary_focus, focus_prompts["comprehensive"])

        result = {
            "patient_id": patient_id,
            "patient_name": patient.get("name"),
            "diagnosis": patient.get("diagnosis"),
            "summary_focus": summary_focus,
            "include_timeline": include_timeline,
            "timeline_events_count": len(timeline),
            "summary_prompt": prompt,
            "patient_data": {
                "age": patient.get("age"),
                "gender": patient.get("gender"),
                "diagnosis": patient.get("diagnosis"),
                "allergies": patient.get("allergies", []),
                "past_medical_history": patient.get("past_medical_history", [])
            },
            "status": "ready_for_summary",
            "expected_output": {
                "summary": "患者综合摘要",
                "key_points": ["要点1", "要点2"],
                "risk_factors": ["风险因素"],
                "recommendations": ["建议"],
                "generated_at": "timestamp"
            }
        }

        logger.info(f"Prepared patient summary generation for {patient_id}")
        return result

    except Exception as e:
        logger.error(f"Error generating patient summary: {str(e)}")
        return {"error": str(e)}


@ai_summary_tools.tool(
    name="generate_case_summary",
    description="Generate an AI summary of a medical case. Analyzes case details and creates an educational or clinical summary."
)
async def generate_case_summary(
    case_id: int,
    tenant_id: str,
    summary_purpose: str = "clinical"
) -> Dict[str, Any]:
    """
    Generate AI summary for a medical case.

    Args:
        case_id: The case ID
        tenant_id: Tenant ID for data isolation
        summary_purpose: Purpose (clinical/educational/reference)

    Returns:
        Case summary with key findings
    """
    try:
        # Get case data
        case = get_case_by_id(case_id, tenant_id)
        if not case:
            return {"error": "Case not found", "case_id": case_id}

        purpose_prompts = {
            "clinical": """请生成该病例的临床摘要：
1. 病例概述
2. 临床表现
3. 诊断过程
4. 治疗方案及效果
5. 临床要点""",
            "educational": """请生成该病例的教学摘要：
1. 病例背景介绍
2. 关键临床特征
3. 诊断思路分析
4. 鉴别诊断讨论
5. 治疗原则
6. 学习要点与启示""",
            "reference": """请生成该病例的参考摘要：
1. 简明病例描述
2. 诊断结论
3. 治疗结果
4. 适用场景"""
        }

        prompt = purpose_prompts.get(summary_purpose, purpose_prompts["clinical"])

        result = {
            "case_id": case_id,
            "case_title": case.get("title"),
            "diagnosis": case.get("diagnosis"),
            "summary_purpose": summary_purpose,
            "summary_prompt": prompt,
            "case_data": {
                "diagnosis": case.get("diagnosis"),
                "symptoms": case.get("symptoms"),
                "age": case.get("age"),
                "gender": case.get("gender"),
                "treatment": case.get("treatment"),
                "outcome": case.get("outcome")
            },
            "status": "ready_for_summary",
            "expected_output": {
                "summary": "病例摘要内容",
                "key_findings": ["发现1", "发现2"],
                "learning_points": ["学习点1", "学习点2"],
                "generated_at": "timestamp"
            }
        }

        logger.info(f"Prepared case summary generation for {case_id}")
        return result

    except Exception as e:
        logger.error(f"Error generating case summary: {str(e)}")
        return {"error": str(e)}


@ai_summary_tools.tool(
    name="generate_report_interpretation",
    description="Generate a patient-friendly AI interpretation of a medical report. Translates medical terminology into easy-to-understand language."
)
async def generate_report_interpretation(
    report_content: str,
    report_type: str = "pathology",
    language_level: str = "simple"
) -> Dict[str, Any]:
    """
    Generate patient-friendly interpretation of medical report.

    Args:
        report_content: The report content to interpret
        report_type: Type of report (pathology/radiology/laboratory/general)
        language_level: Complexity level (simple/moderate/detailed)

    Returns:
        Patient-friendly interpretation
    """
    try:
        type_prompts = {
            "pathology": """请将以下病理报告解读为通俗易懂的语言：
1. 检查发现了什么
2. 这些发现意味着什么
3. 需要注意什么
4. 后续建议

用患者能理解的语言解释专业术语。""",
            "radiology": """请将以下影像报告解读为通俗易懂的语言：
1. 检查看到了什么
2. 正常与异常的部分
3. 这些发现的意义
4. 需要关注的问题""",
            "laboratory": """请将以下检验报告解读为通俗易懂的语言：
1. 各项指标的含义
2. 异常指标解释
3. 可能的原因
4. 建议措施""",
            "general": """请将以下医疗报告解读为通俗易懂的语言：
1. 报告的主要内容
2. 关键发现
3. 需要了解的信息
4. 后续建议"""
        }

        level_instructions = {
            "simple": "请使用非常简单的语言，避免所有医学术语，像对完全没有医学背景的人解释一样。",
            "moderate": "请使用通俗语言，必要时解释关键医学术语。",
            "detailed": "请详细解释，包含医学术语但提供清晰解释，适合有一定医学常识的人。"
        }

        prompt = type_prompts.get(report_type, type_prompts["general"])
        prompt += "\n\n" + level_instructions.get(language_level, level_instructions["simple"])

        result = {
            "report_type": report_type,
            "language_level": language_level,
            "report_content_preview": report_content[:500] + "..." if len(report_content) > 500 else report_content,
            "interpretation_prompt": prompt,
            "status": "ready_for_interpretation",
            "expected_output": {
                "interpretation": "通俗易懂的解读内容",
                "key_findings_explained": ["解读的关键发现"],
                "terms_explained": {
                    "专业术语1": "通俗解释1"
                },
                "action_items": ["建议行动"],
                "generated_at": "timestamp"
            }
        }

        logger.info(f"Prepared report interpretation for {report_type} report")
        return result

    except Exception as e:
        logger.error(f"Error generating report interpretation: {str(e)}")
        return {"error": str(e)}


@ai_summary_tools.tool(
    name="generate_image_analysis_summary",
    description="Generate an AI summary of pathology image analysis results. Combines visual findings with diagnostic interpretation."
)
async def generate_image_analysis_summary(
    image_url: str,
    analysis_results: Optional[Dict] = None,
    annotations: Optional[List[Dict]] = None,
    summary_type: str = "diagnostic"
) -> Dict[str, Any]:
    """
    Generate summary of image analysis.

    Args:
        image_url: URL of the analyzed image
        analysis_results: Previous analysis results if available
        annotations: User annotations on the image
        summary_type: Type (diagnostic/descriptive/educational)

    Returns:
        Comprehensive image analysis summary
    """
    try:
        type_prompts = {
            "diagnostic": """请根据图像分析结果生成诊断摘要：
1. 主要发现
2. 异常区域描述
3. 诊断印象
4. 建议进一步检查（如需要）""",
            "descriptive": """请详细描述图像分析结果：
1. 组织/细胞类型
2. 形态学特征
3. 结构异常
4. 整体评估""",
            "educational": """请生成教学性的图像分析摘要：
1. 可见的正常结构
2. 病理改变
3. 如何识别关键特征
4. 鉴别诊断要点"""
        }

        prompt = type_prompts.get(summary_type, type_prompts["diagnostic"])

        result = {
            "image_url": image_url,
            "summary_type": summary_type,
            "has_analysis_results": analysis_results is not None,
            "annotations_count": len(annotations) if annotations else 0,
            "summary_prompt": prompt,
            "input_data": {
                "analysis_results": analysis_results,
                "annotations": annotations
            },
            "status": "ready_for_summary",
            "expected_output": {
                "summary": "图像分析综合摘要",
                "key_findings": ["发现1", "发现2"],
                "diagnostic_impression": "诊断印象",
                "confidence_level": "high/medium/low",
                "recommendations": ["建议"],
                "generated_at": "timestamp"
            }
        }

        logger.info(f"Prepared image analysis summary")
        return result

    except Exception as e:
        logger.error(f"Error generating image analysis summary: {str(e)}")
        return {"error": str(e)}


@ai_summary_tools.tool(
    name="batch_generate_summaries",
    description="Generate AI summaries for multiple items in batch. Useful for generating summaries for multiple conversations, patients, or cases at once."
)
async def batch_generate_summaries(
    items: List[Dict],
    item_type: str,
    tenant_id: str,
    summary_style: str = "brief"
) -> Dict[str, Any]:
    """
    Batch generate summaries for multiple items.

    Args:
        items: List of items with their IDs
        item_type: Type of items (conversation/patient/case)
        tenant_id: Tenant ID for data isolation
        summary_style: Style of summaries

    Returns:
        Batch summary generation status
    """
    try:
        if not items:
            return {"error": "No items provided for batch summary"}

        result = {
            "item_type": item_type,
            "total_items": len(items),
            "summary_style": summary_style,
            "items": items,
            "status": "ready_for_batch_processing",
            "expected_output": {
                "summaries": [
                    {
                        "item_id": "id",
                        "summary": "摘要内容",
                        "status": "success/failed"
                    }
                ],
                "success_count": 0,
                "failed_count": 0,
                "processing_time_ms": 0
            }
        }

        logger.info(f"Prepared batch summary generation for {len(items)} {item_type} items")
        return result

    except Exception as e:
        logger.error(f"Error in batch summary generation: {str(e)}")
        return {"error": str(e)}
