"""
Field Extraction Tools - MCP Format
Tools for intelligent field extraction from OCR results using LLM
"""
import logging
import json
from typing import Optional, Dict, Any, List
from fastmcp import FastMCP

logger = logging.getLogger(__name__)

field_extraction_tools = FastMCP("field_extraction")

# Document type definitions
DOCUMENT_TYPES = {
    "case": {
        "name": "病例",
        "description": "Medical case document",
        "subtypes": ["pathology_report", "imaging_report", "clinical_record"]
    },
    "patient_record": {
        "name": "患者病历",
        "description": "Patient medical record",
        "subtypes": ["admission_record", "progress_note", "discharge_summary", "examination_report"]
    }
}

# Template field definitions for different document types
TEMPLATE_FIELDS = {
    # Case templates
    "pathology_report": {
        "name": "病理报告",
        "document_type": "case",
        "fields": [
            {"key": "case_title", "label": "病例标题", "type": "text", "required": True},
            {"key": "diagnosis", "label": "诊断结果", "type": "textarea", "required": True},
            {"key": "disease_type", "label": "疾病类型", "type": "select",
             "options": ["肿瘤", "炎症", "感染", "退行性病变", "先天性疾病", "其他"]},
            {"key": "chief_complaint", "label": "主诉", "type": "textarea"},
            {"key": "pathology_findings", "label": "病理所见", "type": "textarea"},
            {"key": "gross_description", "label": "大体描述", "type": "textarea"},
            {"key": "microscopic_description", "label": "镜下描述", "type": "textarea"},
            {"key": "immunohistochemistry", "label": "免疫组化结果", "type": "textarea"},
            {"key": "molecular_pathology", "label": "分子病理", "type": "textarea"},
            {"key": "clinical_notes", "label": "临床备注", "type": "textarea"},
            {"key": "age", "label": "患者年龄", "type": "number"},
            {"key": "gender", "label": "性别", "type": "select", "options": ["男", "女"]},
        ]
    },
    "imaging_report": {
        "name": "影像报告",
        "document_type": "case",
        "fields": [
            {"key": "case_title", "label": "病例标题", "type": "text", "required": True},
            {"key": "imaging_type", "label": "检查类型", "type": "select",
             "options": ["CT", "MRI", "X光", "超声", "PET-CT", "其他"]},
            {"key": "examination_part", "label": "检查部位", "type": "text"},
            {"key": "imaging_findings", "label": "影像所见", "type": "textarea", "required": True},
            {"key": "diagnosis", "label": "诊断意见", "type": "textarea", "required": True},
            {"key": "disease_type", "label": "疾病类型", "type": "select",
             "options": ["肿瘤", "炎症", "感染", "外伤", "退行性病变", "其他"]},
            {"key": "measurement", "label": "测量数据", "type": "textarea"},
            {"key": "comparison", "label": "对比意见", "type": "textarea"},
            {"key": "age", "label": "患者年龄", "type": "number"},
            {"key": "gender", "label": "性别", "type": "select", "options": ["男", "女"]},
        ]
    },
    "clinical_record": {
        "name": "临床记录",
        "document_type": "case",
        "fields": [
            {"key": "case_title", "label": "病例标题", "type": "text", "required": True},
            {"key": "diagnosis", "label": "诊断", "type": "textarea", "required": True},
            {"key": "disease_type", "label": "疾病类型", "type": "select",
             "options": ["肿瘤", "心血管", "呼吸系统", "消化系统", "神经系统", "内分泌", "其他"]},
            {"key": "chief_complaint", "label": "主诉", "type": "textarea"},
            {"key": "present_illness", "label": "现病史", "type": "textarea"},
            {"key": "physical_examination", "label": "体格检查", "type": "textarea"},
            {"key": "auxiliary_examination", "label": "辅助检查", "type": "textarea"},
            {"key": "treatment_plan", "label": "治疗方案", "type": "textarea"},
            {"key": "age", "label": "患者年龄", "type": "number"},
            {"key": "gender", "label": "性别", "type": "select", "options": ["男", "女"]},
        ]
    },
    # Patient record templates
    "admission_record": {
        "name": "入院记录",
        "document_type": "patient_record",
        "fields": [
            {"key": "patient_name", "label": "患者姓名", "type": "text", "required": True},
            {"key": "gender", "label": "性别", "type": "select", "options": ["男", "女"]},
            {"key": "age", "label": "年龄", "type": "number"},
            {"key": "admission_date", "label": "入院日期", "type": "date"},
            {"key": "chief_complaint", "label": "主诉", "type": "textarea", "required": True},
            {"key": "present_illness", "label": "现病史", "type": "textarea"},
            {"key": "past_history", "label": "既往史", "type": "textarea"},
            {"key": "family_history", "label": "家族史", "type": "textarea"},
            {"key": "allergy_history", "label": "过敏史", "type": "textarea"},
            {"key": "physical_examination", "label": "体格检查", "type": "textarea"},
            {"key": "preliminary_diagnosis", "label": "初步诊断", "type": "textarea", "required": True},
            {"key": "treatment_plan", "label": "诊疗计划", "type": "textarea"},
        ]
    },
    "progress_note": {
        "name": "病程记录",
        "document_type": "patient_record",
        "fields": [
            {"key": "record_date", "label": "记录日期", "type": "date", "required": True},
            {"key": "stage_title", "label": "阶段标题", "type": "text"},
            {"key": "patient_condition", "label": "患者情况", "type": "textarea"},
            {"key": "doctor_notes", "label": "医生记录", "type": "textarea", "required": True},
            {"key": "examination_results", "label": "检查结果", "type": "textarea"},
            {"key": "treatment_response", "label": "治疗反应", "type": "textarea"},
            {"key": "treatment_plan", "label": "治疗方案", "type": "textarea"},
            {"key": "medications", "label": "用药情况", "type": "textarea"},
            {"key": "next_steps", "label": "下一步计划", "type": "textarea"},
        ]
    },
    "discharge_summary": {
        "name": "出院小结",
        "document_type": "patient_record",
        "fields": [
            {"key": "patient_name", "label": "患者姓名", "type": "text"},
            {"key": "admission_date", "label": "入院日期", "type": "date"},
            {"key": "discharge_date", "label": "出院日期", "type": "date"},
            {"key": "admission_diagnosis", "label": "入院诊断", "type": "textarea"},
            {"key": "discharge_diagnosis", "label": "出院诊断", "type": "textarea", "required": True},
            {"key": "treatment_summary", "label": "治疗经过", "type": "textarea"},
            {"key": "discharge_condition", "label": "出院情况", "type": "textarea"},
            {"key": "discharge_instructions", "label": "出院医嘱", "type": "textarea"},
            {"key": "followup_plan", "label": "随访计划", "type": "textarea"},
            {"key": "medications", "label": "出院带药", "type": "textarea"},
        ]
    },
    "examination_report": {
        "name": "检查报告",
        "document_type": "patient_record",
        "fields": [
            {"key": "examination_type", "label": "检查类型", "type": "select",
             "options": ["血常规", "生化", "凝血", "肿瘤标志物", "心电图", "其他"]},
            {"key": "examination_date", "label": "检查日期", "type": "date"},
            {"key": "findings", "label": "检查结果", "type": "textarea", "required": True},
            {"key": "abnormal_items", "label": "异常项目", "type": "textarea"},
            {"key": "clinical_significance", "label": "临床意义", "type": "textarea"},
            {"key": "recommendations", "label": "建议", "type": "textarea"},
        ]
    }
}


# Prompt templates for LLM extraction
DOCUMENT_TYPE_DETECTION_PROMPT = """
你是一个医疗文档分类专家。根据以下OCR识别的文本内容，判断这是什么类型的文档。

## OCR 文本
{ocr_text}

## 文档类型选项
1. case (病例): 包含病理报告、影像报告、临床病例记录等
2. patient_record (患者病历): 包含入院记录、病程记录、出院小结、检查报告等

## 子类型选项
病例(case)子类型:
- pathology_report: 病理报告（包含病理诊断、镜下所见等）
- imaging_report: 影像报告（CT、MRI、X光等检查报告）
- clinical_record: 临床记录（一般性临床病例记录）

患者病历(patient_record)子类型:
- admission_record: 入院记录
- progress_note: 病程记录
- discharge_summary: 出院小结
- examination_report: 检查报告

## 返回格式（严格JSON）
{{
  "type": "case或patient_record",
  "subtype": "具体子类型",
  "confidence": 0.0到1.0的置信度,
  "reasoning": "简短的判断理由"
}}
"""

FIELD_EXTRACTION_PROMPT = """
你是一个医疗文档字段提取专家。根据OCR识别的文本，提取以下字段的值。

## OCR 文本
{ocr_text}

## 图像标注信息（如有）
{annotations}

## 需要提取的字段
{fields_schema}

## 要求
1. 严格按照字段定义提取，不要编造内容
2. 如果某字段在文本中找不到，返回 null
3. 对于日期字段，统一转换为 YYYY-MM-DD 格式
4. 对于选择字段，匹配最接近的选项值
5. 对于数值字段，只提取数字
6. 如果标注信息中有区域编号，尝试关联对应的文本内容

## 返回格式（严格JSON）
{{
  "fields": {{
    "field_key": "提取的值",
    ...
  }},
  "confidence": 0.0到1.0的整体置信度,
  "uncertain_fields": ["不确定的字段key列表"],
  "extraction_notes": "提取过程中的备注"
}}
"""


@field_extraction_tools.tool(
    name="detect_document_type",
    description="Detect the type of a medical document from OCR text. Use this to determine whether it's a case or patient record, and what specific subtype."
)
async def detect_document_type(
    ocr_text: str
) -> Dict[str, Any]:
    """
    Detect the type of medical document from OCR text.

    Args:
        ocr_text: OCR extracted text from the document

    Returns:
        Document type detection result containing:
        - type: "case" or "patient_record"
        - subtype: Specific document subtype
        - confidence: Detection confidence score
        - available_templates: List of suitable templates for this document type
    """
    try:
        # For now, use keyword-based detection
        # In production, this would call an LLM for more accurate detection
        text_lower = ocr_text.lower()

        # Keywords for different document types
        pathology_keywords = ["病理", "镜下", "切片", "组织学", "免疫组化", "病理诊断"]
        imaging_keywords = ["ct", "mri", "x光", "影像", "超声", "扫描", "造影"]
        admission_keywords = ["入院", "入院记录", "住院", "主诉", "现病史", "既往史"]
        progress_keywords = ["病程", "查房", "病情", "治疗反应"]
        discharge_keywords = ["出院", "出院诊断", "出院医嘱", "随访"]
        examination_keywords = ["检验", "血常规", "生化", "尿常规", "肿瘤标志物"]

        # Score each type
        scores = {
            "pathology_report": sum(1 for k in pathology_keywords if k in text_lower),
            "imaging_report": sum(1 for k in imaging_keywords if k in text_lower),
            "admission_record": sum(1 for k in admission_keywords if k in text_lower),
            "progress_note": sum(1 for k in progress_keywords if k in text_lower),
            "discharge_summary": sum(1 for k in discharge_keywords if k in text_lower),
            "examination_report": sum(1 for k in examination_keywords if k in text_lower),
        }

        # Find best match
        best_subtype = max(scores, key=scores.get)
        best_score = scores[best_subtype]

        # Determine document type
        case_subtypes = ["pathology_report", "imaging_report", "clinical_record"]
        doc_type = "case" if best_subtype in case_subtypes else "patient_record"

        # Calculate confidence
        total_score = sum(scores.values())
        confidence = best_score / max(total_score, 1) if total_score > 0 else 0.5

        # Get available templates for this document type
        available_templates = [
            {"key": k, "name": v["name"]}
            for k, v in TEMPLATE_FIELDS.items()
            if v["document_type"] == doc_type
        ]

        return {
            "type": doc_type,
            "subtype": best_subtype,
            "confidence": round(confidence, 2),
            "available_templates": available_templates,
            "type_name": DOCUMENT_TYPES[doc_type]["name"],
            "subtype_name": TEMPLATE_FIELDS.get(best_subtype, {}).get("name", best_subtype)
        }

    except Exception as e:
        logger.error(f"Error detecting document type: {str(e)}")
        return {
            "error": str(e),
            "type": "case",
            "subtype": "clinical_record",
            "confidence": 0.0
        }


@field_extraction_tools.tool(
    name="get_template_fields",
    description="Get the field definitions for a specific document template. Use this to know what fields to extract."
)
async def get_template_fields(
    template_type: str
) -> Dict[str, Any]:
    """
    Get field definitions for a document template.

    Args:
        template_type: Template type key (e.g., "pathology_report", "admission_record")

    Returns:
        Template field definitions
    """
    template = TEMPLATE_FIELDS.get(template_type)

    if not template:
        return {
            "error": f"Unknown template type: {template_type}",
            "available_templates": list(TEMPLATE_FIELDS.keys())
        }

    return {
        "template_type": template_type,
        "template_name": template["name"],
        "document_type": template["document_type"],
        "fields": template["fields"]
    }


@field_extraction_tools.tool(
    name="extract_fields_from_ocr",
    description="Extract structured fields from OCR text using a specified template. This is the main tool for intelligent field extraction."
)
async def extract_fields_from_ocr(
    ocr_text: str,
    template_type: str,
    image_annotations: Optional[List[Dict[str, Any]]] = None
) -> Dict[str, Any]:
    """
    Extract structured fields from OCR text using LLM.

    Args:
        ocr_text: OCR extracted text
        template_type: Template type to use for extraction
        image_annotations: Optional list of image annotations with region info

    Returns:
        Extracted fields with confidence scores
    """
    try:
        template = TEMPLATE_FIELDS.get(template_type)
        if not template:
            return {
                "error": f"Unknown template type: {template_type}",
                "available_templates": list(TEMPLATE_FIELDS.keys())
            }

        # For now, use keyword-based extraction
        # In production, this would call an LLM for more accurate extraction
        fields = template["fields"]
        extracted = {}
        uncertain_fields = []

        for field in fields:
            key = field["key"]
            label = field["label"]
            field_type = field["type"]

            # Simple keyword extraction
            value = extract_field_value(ocr_text, label, field_type, field.get("options"))

            if value is not None:
                extracted[key] = value
            else:
                extracted[key] = None
                if field.get("required"):
                    uncertain_fields.append(key)

        # Include annotation context if available
        annotation_context = []
        if image_annotations:
            for ann in image_annotations:
                region_num = ann.get("regionNumber", "?")
                label = ann.get("label", "")
                remark = ann.get("remark", "")
                if label or remark:
                    annotation_context.append({
                        "region": region_num,
                        "label": label,
                        "remark": remark
                    })

        # Calculate confidence based on extraction completeness
        total_fields = len(fields)
        filled_fields = sum(1 for v in extracted.values() if v is not None)
        confidence = filled_fields / total_fields if total_fields > 0 else 0.0

        return {
            "template_type": template_type,
            "template_name": template["name"],
            "document_type": template["document_type"],
            "fields": extracted,
            "confidence": round(confidence, 2),
            "uncertain_fields": uncertain_fields,
            "annotation_context": annotation_context,
            "field_definitions": fields
        }

    except Exception as e:
        logger.error(f"Error extracting fields: {str(e)}")
        return {"error": str(e)}


def extract_field_value(
    text: str,
    label: str,
    field_type: str,
    options: Optional[List[str]] = None
) -> Optional[Any]:
    """
    Extract a field value from text using simple pattern matching.
    This is a simplified version - production would use LLM.
    """
    import re

    text_lower = text.lower()
    label_lower = label.lower()

    # Try to find label followed by colon and value
    patterns = [
        rf"{re.escape(label)}[：:]\s*([^\n]+)",  # Label: value
        rf"{re.escape(label)}[：:]\s*\n([^\n]+)",  # Label:\nvalue
        rf"【{re.escape(label)}】\s*([^\n【]+)",  # 【Label】value
    ]

    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            value = match.group(1).strip()

            # Process based on field type
            if field_type == "number":
                # Extract number
                num_match = re.search(r'\d+', value)
                if num_match:
                    return int(num_match.group())
            elif field_type == "date":
                # Try to extract date
                date_match = re.search(r'\d{4}[-/年]\d{1,2}[-/月]\d{1,2}', value)
                if date_match:
                    date_str = date_match.group()
                    # Normalize to YYYY-MM-DD
                    date_str = date_str.replace('年', '-').replace('月', '-').replace('日', '').replace('/', '-')
                    return date_str
            elif field_type == "select" and options:
                # Find matching option
                for opt in options:
                    if opt.lower() in value.lower():
                        return opt
            else:
                return value if value else None

    return None


@field_extraction_tools.tool(
    name="list_all_templates",
    description="Get a list of all available document templates for OCR field extraction."
)
async def list_all_templates() -> Dict[str, Any]:
    """
    List all available document templates.

    Returns:
        List of templates grouped by document type
    """
    case_templates = []
    patient_templates = []

    for key, template in TEMPLATE_FIELDS.items():
        template_info = {
            "key": key,
            "name": template["name"],
            "field_count": len(template["fields"]),
            "required_fields": [f["key"] for f in template["fields"] if f.get("required")]
        }

        if template["document_type"] == "case":
            case_templates.append(template_info)
        else:
            patient_templates.append(template_info)

    return {
        "case_templates": case_templates,
        "patient_record_templates": patient_templates,
        "document_types": DOCUMENT_TYPES
    }
