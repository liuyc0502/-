"""
Document Parsing Tools - MCP Format
Tools for OCR and intelligent document parsing using PaddleOCR MCP
"""
import logging
import json
from typing import Dict, Any, Optional
from fastmcp import FastMCP, Client

from consts.const import DEFAULT_TENANT_ID

logger = logging.getLogger(__name__)
doc_parsing_tools = FastMCP("document_parsing")

# PaddleOCR MCP server URL
PADDLEOCR_MCP_URL = "http://localhost:5020/sse"


async def call_paddleocr(image_url: str, output_mode: str = "simple") -> str:
    """
    Call PaddleOCR MCP to extract text from image.

    Args:
        image_url: URL or path to image
        output_mode: 'simple' for clean text, 'detailed' for JSON with coordinates

    Returns:
        Extracted text or detailed JSON
    """
    try:
        from consts.const import MAIN_SERVICE_URL
        
        # Ensure full URL for PaddleOCR to access
        full_url = image_url
        # Extract object_name from various URL formats
        object_name = None
        if "file/storage/" in image_url:
            # Extract path after file/storage/
            parts = image_url.split("file/storage/")
            if len(parts) > 1:
                object_name = parts[1].split("?")[0]  # Remove query params
        
        if object_name:
            # Use /file/download/ endpoint which returns clean URL without query params
            full_url = f"{MAIN_SERVICE_URL}/file/download/{object_name}"
        elif image_url.startswith("/api/"):
            full_url = f"{MAIN_SERVICE_URL}{image_url.replace('/api/', '/')}"
        elif image_url.startswith("/"):
            full_url = f"{MAIN_SERVICE_URL}{image_url}"
        
        logger.info(f"Calling PaddleOCR with URL: {full_url}")
        client = Client(PADDLEOCR_MCP_URL, timeout=60)
        async with client:
            # Call the 'ocr' tool from PaddleOCR MCP
            result = await client.call_tool(
                "ocr",
                arguments={
                    "input_data": full_url,
                    "output_mode": output_mode,
                    "file_type": "image"
                }
            )
            return result.content[0].text if result.content else ""
    except Exception as e:
        logger.error(f"PaddleOCR call failed: {str(e)}")
        return f"OCR Error: {str(e)}"


async def parse_with_llm(ocr_text: str, target_schema: Dict[str, str]) -> Dict[str, Any]:
    """
    Use LLM to parse OCR text into structured data.

    Args:
        ocr_text: Raw OCR extracted text
        target_schema: Dict describing target fields and their descriptions

    Returns:
        Dict with parsed structured data
    """
    try:
        from smolagents import OpenAIServerModel
        from database.model_management_db import get_model_by_model_id
        from utils.config_utils import get_model_name_from_config, tenant_config_manager
        
        # Get default tenant's LLM config
        llm_model_config = tenant_config_manager.get_model_config("LLM_ID", tenant_id=DEFAULT_TENANT_ID)
        if not llm_model_config:
            logger.warning("No LLM model configured, returning empty parsed data")
            return {field: "" for field in target_schema.keys()}
        
        # Build the extraction prompt
        schema_description = "\n".join([f"- {field}: {desc}" for field, desc in target_schema.items()])
        
        system_prompt = """You are a medical document parser. Extract structured information from OCR text.
Output ONLY valid JSON with the requested fields. If a field cannot be found, use empty string "".
Do not include any explanation or markdown formatting, just the JSON object."""

        user_prompt = f"""Extract the following fields from this OCR text:

{schema_description}

OCR Text:
---
{ocr_text}
---

Output the extracted data as a JSON object with the field names as keys."""

        # Create LLM client
        llm = OpenAIServerModel(
            model_id=get_model_name_from_config(llm_model_config),
            api_base=llm_model_config.get("base_url", ""),
            api_key=llm_model_config.get("api_key", ""),
            temperature=0.1,  # Low temperature for structured extraction
        )
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]
        
        # Call LLM (non-streaming for simplicity)
        completion_kwargs = llm._prepare_completion_kwargs(
            messages=messages,
            model=llm.model_id,
            temperature=0.1,
        )
        response = llm.client.chat.completions.create(**completion_kwargs)
        
        # Parse response
        content = response.choices[0].message.content.strip()
        
        # Clean up potential markdown formatting
        if content.startswith("```"):
            content = content.split("\n", 1)[1] if "\n" in content else content[3:]
        if content.endswith("```"):
            content = content.rsplit("\n", 1)[0] if "\n" in content else content[:-3]
        content = content.strip()
        
        # Parse JSON
        parsed_data = json.loads(content)
        
        # Ensure all expected fields are present
        for field in target_schema.keys():
            if field not in parsed_data:
                parsed_data[field] = ""
        
        logger.info(f"Successfully parsed OCR text with LLM, extracted {len(parsed_data)} fields")
        return parsed_data
        
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse LLM response as JSON: {str(e)}")
        return {field: "" for field in target_schema.keys()}
    except Exception as e:
        logger.error(f"LLM parsing failed: {str(e)}")
        return {field: "" for field in target_schema.keys()}

async def parse_patient_document_impl(image_url: str) -> Dict[str, Any]:
    """
    Core implementation for parsing patient document.
    Called by both MCP tool and HTTP endpoint.
    """
    try:
        logger.info(f"Parsing patient document from: {image_url}")

        # Step 1: Call PaddleOCR to extract text
        ocr_text = await call_paddleocr(image_url, output_mode="simple")

        if ocr_text.startswith("OCR Error"):
            return {"error": ocr_text}

        # Step 2: Define patient information schema
        patient_schema = {
            "name": "Patient full name",
            "age": "Patient age (number)",
            "gender": "Patient gender (男/女)",
            "date_of_birth": "Date of birth (YYYY-MM-DD format)",
            "medical_record_no": "Medical record number",
            "phone": "Phone number",
            "address": "Home address",
            "diagnosis": "Primary diagnosis",
            "allergies": "Known allergies (JSON array)",
            "family_history": "Family medical history",
            "past_medical_history": "Past medical history (JSON array)"
        }

        # Step 3: Parse with LLM (placeholder for now)
        parsed_data = await parse_with_llm(ocr_text, patient_schema)

        logger.info(f"Successfully parsed patient document")

        return {
            "success": True,
            "ocr_text": ocr_text,
            "parsed_data": parsed_data,
            "message": "Patient information extracted. Please review and confirm before saving.",
            "note": "[Placeholder] In production, this would use an LLM to intelligently map OCR text to patient fields"
        }

    except Exception as e:
        logger.error(f"Error parsing patient document: {str(e)}")
        return {"error": str(e)}





async def parse_case_document_impl(image_url: str) -> Dict[str, Any]:
    """
    Core implementation for parsing case document.
    Called by both MCP tool and HTTP endpoint.
    """
    try:
        logger.info(f"Parsing case document from: {image_url}")

        # Step 1: Call PaddleOCR to extract text
        ocr_text = await call_paddleocr(image_url, output_mode="simple")

        if ocr_text.startswith("OCR Error"):
            return {"error": ocr_text}

        # Step 2: Define case information schema
        case_schema = {
            "case_title": "Case title or summary",
            "diagnosis": "Primary diagnosis",
            "disease_type": "Disease type/category",
            "age": "Patient age",
            "gender": "Patient gender",
            "chief_complaint": "Chief complaint",
            "symptoms": "Clinical symptoms (JSON array)",
            "physical_examination": "Physical examination findings",
            "lab_results": "Laboratory test results",
            "imaging_findings": "Imaging examination findings",
            "pathology_findings": "Pathology findings",
            "diagnosis_result": "Final diagnosis",
            "treatment_plan": "Treatment plan",
            "clinical_outcome": "Clinical outcome",
            "case_discussion": "Case discussion points"
        }

        # Step 3: Parse with LLM (placeholder)
        parsed_data = await parse_with_llm(ocr_text, case_schema)

        logger.info(f"Successfully parsed case document")

        return {
            "success": True,
            "ocr_text": ocr_text,
            "parsed_data": parsed_data,
            "message": "Case information extracted. Please review and confirm before saving.",
            "note": "[Placeholder] In production, this would use an LLM to intelligently map OCR text to case fields"
        }

    except Exception as e:
        logger.error(f"Error parsing case document: {str(e)}")
        return {"error": str(e)}




@doc_parsing_tools.tool(
    name="extract_text_from_image",
    description="Extract raw text from any medical document image using OCR. Use when doctor simply wants to get the text content from a document without structured parsing."
)
async def extract_text_from_image_tool(
    image_url: str,
    output_mode: str = "simple"  # 'simple' or 'detailed'
) -> Dict[str, Any]:
    """
    Extract text from image using PaddleOCR.

    Args:
        image_url: URL or path to image
        output_mode: 'simple' for clean text, 'detailed' for JSON with bounding boxes

    Returns:
        Dict with extracted text
    """
    try:
        logger.info(f"Extracting text from image: {image_url}")

        ocr_result = await call_paddleocr(image_url, output_mode=output_mode)

        if ocr_result.startswith("OCR Error"):
            return {"error": ocr_result}

        return {
            "success": True,
            "image_url": image_url,
            "output_mode": output_mode,
            "extracted_text": ocr_result,
            "message": "Text extracted successfully"
        }

    except Exception as e:
        logger.error(f"Error extracting text: {str(e)}")
        return {"error": str(e)}


@doc_parsing_tools.tool(
    name="detect_document_type",
    description="Intelligently detect medical document type from image. Use when user uploads an image without specifying what type of document it is."
)
async def detect_document_type(image_url: str) -> Dict[str, Any]:
    """
    Detect medical document type using OCR and LLM analysis.

    Args:
        image_url: URL or path to document image

    Returns:
        Dict with document type and confidence
    """
    try:
        logger.info(f"Detecting document type from: {image_url}")

        # Step 1: Extract text with OCR
        ocr_text = await call_paddleocr(image_url, output_mode="simple")

        if ocr_text.startswith("OCR Error"):
            return {"error": ocr_text}

        # Step 2: Use LLM to analyze document type
        from smolagents import OpenAIServerModel
        from database.model_management_db import get_model_by_model_id
        from utils.config_utils import get_model_name_from_config, tenant_config_manager

        llm_model_config = tenant_config_manager.get_model_config("LLM_ID", tenant_id=DEFAULT_TENANT_ID)
        if not llm_model_config:
            logger.warning("No LLM model configured for document type detection")
            return {"document_type": "未知", "confidence": 0.0}

        system_prompt = """You are a medical document classifier. Analyze the OCR text and determine the document type.
Output ONLY a JSON object with these fields:
- document_type: One of "患者档案", "病例资料", "检验报告", "影像报告", "医嘱单", "未知"
- confidence: Float between 0.0 and 1.0
- key_indicators: Array of strings explaining why you chose this type"""

        user_prompt = f"""Analyze this medical document OCR text and classify its type:

OCR Text:
---
{ocr_text[:2000]}
---

Output format:
{{"document_type": "...", "confidence": 0.95, "key_indicators": ["..."]}}"""

        llm = OpenAIServerModel(
            model_id=get_model_name_from_config(llm_model_config),
            api_base=llm_model_config.get("base_url", ""),
            api_key=llm_model_config.get("api_key", ""),
            temperature=0.1,
        )

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]

        completion_kwargs = llm._prepare_completion_kwargs(
            messages=messages,
            model=llm.model_id,
            temperature=0.1,
        )
        response = llm.client.chat.completions.create(**completion_kwargs)

        content = response.choices[0].message.content.strip()

        # Clean up potential markdown formatting
        if content.startswith("```"):
            content = content.split("\n", 1)[1] if "\n" in content else content[3:]
        if content.endswith("```"):
            content = content.rsplit("\n", 1)[0] if "\n" in content else content[:-3]
        content = content.strip()

        import json
        result = json.loads(content)

        logger.info(f"Document type detected: {result.get('document_type')} with confidence {result.get('confidence')}")
        return result

    except Exception as e:
        logger.error(f"Error detecting document type: {str(e)}")
        return {"document_type": "未知", "confidence": 0.0, "error": str(e)}


@doc_parsing_tools.tool(
    name="parse_lab_report",
    description="Parse laboratory test report and extract all test items with results. Use when doctor uploads a lab test report (e.g., liver function, kidney function, blood routine) and wants to extract all test items automatically."
)
async def parse_lab_report(image_url: str) -> Dict[str, Any]:
    """
    Parse lab report and extract structured test items.

    Args:
        image_url: URL or path to lab report image

    Returns:
        Dict with patient info, report metadata, and test items
    """
    try:
        logger.info(f"Parsing lab report from: {image_url}")

        # Step 1: Extract text with OCR
        ocr_text = await call_paddleocr(image_url, output_mode="simple")

        if ocr_text.startswith("OCR Error"):
            return {"error": ocr_text}

        # Step 2: Define lab report schema
        lab_report_schema = {
            "patient_name": "Patient name (Chinese name)",
            "report_type": "Report type (e.g., 肝功能检查, 肾功能检查, 血常规)",
            "report_date": "Report date (YYYY-MM-DD format)",
            "report_institution": "Testing institution/hospital name",
            "report_number": "Report number or barcode",
            "test_items": "Array of test items, each with: test_item_name, test_result, test_unit, reference_range, test_method, abnormal_flag (↑/↓/正常), result_hint (偏高/偏低/正常)"
        }

        # Step 3: Parse with LLM
        parsed_data = await parse_with_llm(ocr_text, lab_report_schema)

        logger.info(f"Successfully parsed lab report with {len(parsed_data.get('test_items', []))} test items")

        return {
            "success": True,
            "ocr_text": ocr_text,
            "patient_name": parsed_data.get("patient_name", ""),
            "report_type": parsed_data.get("report_type", ""),
            "report_date": parsed_data.get("report_date", ""),
            "report_institution": parsed_data.get("report_institution", ""),
            "report_number": parsed_data.get("report_number", ""),
            "test_items": parsed_data.get("test_items", []),
            "message": "Lab report parsed successfully. Please review and confirm before saving."
        }

    except Exception as e:
        logger.error(f"Error parsing lab report: {str(e)}")
        return {"error": str(e)}


@doc_parsing_tools.tool(
    name="parse_imaging_report",
    description="Parse imaging report (X-ray, CT, MRI, ultrasound) and extract findings and impressions. Use when doctor uploads an imaging report document (not the image itself, but the written report)."
)
async def parse_imaging_report(image_url: str) -> Dict[str, Any]:
    """
    Parse imaging report and extract structured findings.

    Args:
        image_url: URL or path to imaging report image

    Returns:
        Dict with patient info, imaging type, findings, and impressions
    """
    try:
        logger.info(f"Parsing imaging report from: {image_url}")

        # Step 1: Extract text with OCR
        ocr_text = await call_paddleocr(image_url, output_mode="simple")

        if ocr_text.startswith("OCR Error"):
            return {"error": ocr_text}

        # Step 2: Define imaging report schema
        imaging_report_schema = {
            "patient_name": "Patient name (Chinese name)",
            "imaging_type": "Imaging type (e.g., 胸部X光, 腹部CT, 头颅MRI, 超声检查)",
            "imaging_date": "Imaging date (YYYY-MM-DD format)",
            "imaging_institution": "Imaging institution/hospital name",
            "report_number": "Report number",
            "examination_site": "Examination site/body part (e.g., 双肺, 腹部, 头颅)",
            "imaging_findings": "Detailed imaging findings (影像所见)",
            "diagnostic_impression": "Diagnostic impression or conclusion (诊断意见/影像印象)",
            "recommendations": "Recommendations for follow-up or further examination"
        }

        # Step 3: Parse with LLM
        parsed_data = await parse_with_llm(ocr_text, imaging_report_schema)

        logger.info(f"Successfully parsed imaging report: {parsed_data.get('imaging_type')}")

        return {
            "success": True,
            "ocr_text": ocr_text,
            "patient_name": parsed_data.get("patient_name", ""),
            "imaging_type": parsed_data.get("imaging_type", ""),
            "imaging_date": parsed_data.get("imaging_date", ""),
            "imaging_institution": parsed_data.get("imaging_institution", ""),
            "report_number": parsed_data.get("report_number", ""),
            "examination_site": parsed_data.get("examination_site", ""),
            "imaging_findings": parsed_data.get("imaging_findings", ""),
            "diagnostic_impression": parsed_data.get("diagnostic_impression", ""),
            "recommendations": parsed_data.get("recommendations", ""),
            "message": "Imaging report parsed successfully. Please review and confirm before saving."
        }

    except Exception as e:
        logger.error(f"Error parsing imaging report: {str(e)}")
        return {"error": str(e)}


@doc_parsing_tools.tool(
    name="parse_medical_order",
    description="Parse medical order document and extract medications, tasks, and precautions. Use when doctor uploads a medical order (医嘱单) and wants to add it to patient's care plan."
)
async def parse_medical_order(image_url: str) -> Dict[str, Any]:
    """
    Parse medical order and extract medications, tasks, and precautions.

    Args:
        image_url: URL or path to medical order image

    Returns:
        Dict with patient info, medications, tasks, and precautions
    """
    try:
        logger.info(f"Parsing medical order from: {image_url}")

        # Step 1: Extract text with OCR
        ocr_text = await call_paddleocr(image_url, output_mode="simple")

        if ocr_text.startswith("OCR Error"):
            return {"error": ocr_text}

        # Step 2: Define medical order schema
        medical_order_schema = {
            "patient_name": "Patient name (Chinese name)",
            "order_date": "Order date (YYYY-MM-DD format)",
            "medications": "Array of medications, each with: medication_name, dosage, frequency, time_slots (array), notes",
            "tasks": "Array of rehabilitation tasks, each with: task_title, task_description, task_category (运动/护理/监测/饮食), frequency, duration",
            "precautions": "Array of precautions/medical advice, each with: precaution_content, priority (high/medium/low)"
        }

        # Step 3: Parse with LLM
        parsed_data = await parse_with_llm(ocr_text, medical_order_schema)

        logger.info(f"Successfully parsed medical order with {len(parsed_data.get('medications', []))} medications and {len(parsed_data.get('tasks', []))} tasks")

        return {
            "success": True,
            "ocr_text": ocr_text,
            "patient_name": parsed_data.get("patient_name", ""),
            "order_date": parsed_data.get("order_date", ""),
            "medications": parsed_data.get("medications", []),
            "tasks": parsed_data.get("tasks", []),
            "precautions": parsed_data.get("precautions", []),
            "message": "Medical order parsed successfully. Please review and confirm before adding to care plan."
        }

    except Exception as e:
        logger.error(f"Error parsing medical order: {str(e)}")
        return {"error": str(e)}


@doc_parsing_tools.tool(
    name="match_patient_by_name",
    description="Match patient by name, optionally using age and date for disambiguation. Use after parsing a report to find the corresponding patient in the system."
)
async def match_patient_by_name(
    patient_name: str,
    report_date: Optional[str] = None,
    patient_age: Optional[int] = None
) -> Dict[str, Any]:
    """
    Match patient by name with optional age and date filtering.

    Args:
        patient_name: Patient name to search for
        report_date: Report date for matching recent visits
        patient_age: Patient age for disambiguation

    Returns:
        Dict with matched patients and recommendation
    """
    try:
        from database.patient_db import list_patients

        logger.info(f"Matching patient by name: {patient_name}")

        # Search for patients with matching name
        all_patients = list_patients(
            tenant_id=DEFAULT_TENANT_ID,
            search_query=patient_name,
            limit=100
        )

        if not all_patients:
            return {
                "found": False,
                "match_type": "none",
                "patients": [],
                "recommendation": f"未找到姓名为 '{patient_name}' 的患者，建议创建新患者档案。"
            }

        # Filter and score matches
        matched_patients = []
        for patient in all_patients:
            match_score = 0.0

            # Exact name match
            if patient.get("name") == patient_name:
                match_score += 0.5

            # Age match
            if patient_age and patient.get("age"):
                age_diff = abs(patient.get("age") - patient_age)
                if age_diff == 0:
                    match_score += 0.3
                elif age_diff <= 2:
                    match_score += 0.2
                elif age_diff <= 5:
                    match_score += 0.1

            # Recent visit (if report_date provided)
            if report_date:
                # This would require checking last visit date from timeline
                # For now, add small bonus
                match_score += 0.2

            if match_score > 0:
                matched_patients.append({
                    "patient_id": patient.get("patient_id"),
                    "medical_record_no": patient.get("medical_record_no"),
                    "name": patient.get("name"),
                    "age": patient.get("age"),
                    "gender": patient.get("gender"),
                    "diagnosis": patient.get("diagnosis"),
                    "match_score": round(match_score, 2)
                })

        # Sort by match score
        matched_patients.sort(key=lambda x: x["match_score"], reverse=True)

        # Determine match type and recommendation
        if len(matched_patients) == 0:
            match_type = "none"
            recommendation = f"未找到匹配的患者，建议创建新患者档案。"
        elif len(matched_patients) == 1:
            match_type = "single"
            patient = matched_patients[0]
            recommendation = f"找到1位匹配患者：{patient['name']}（病历号 {patient['medical_record_no']}），建议关联到该患者。"
        else:
            match_type = "multiple"
            top_match = matched_patients[0]
            if patient_age:
                recommendation = f"找到{len(matched_patients)}位同名患者，根据年龄({patient_age}岁)推荐病历号 {top_match['medical_record_no']}。"
            else:
                recommendation = f"找到{len(matched_patients)}位同名患者，请根据年龄、性别等信息手动选择。"

        logger.info(f"Patient matching complete: {match_type}, found {len(matched_patients)} candidates")

        return {
            "found": len(matched_patients) > 0,
            "match_type": match_type,
            "patients": matched_patients[:5],  # Return top 5 matches
            "recommendation": recommendation
        }

    except Exception as e:
        logger.error(f"Error matching patient: {str(e)}")
        return {"error": str(e)}


@doc_parsing_tools.tool(
    name="parse_patient_archive",
    description="Parse patient archive document and extract patient information with auto-generated medical record number. Use when doctor uploads a patient medical record document and wants to create a new patient."
)
async def parse_patient_archive(image_url: str) -> Dict[str, Any]:
    """
    Parse patient archive and generate next available medical record number.

    Args:
        image_url: URL or path to patient archive image

    Returns:
        Dict with parsed patient information and auto-generated medical record number
    """
    try:
        logger.info(f"Parsing patient archive from: {image_url}")

        # Step 1: Get next available medical record number
        from database.patient_db import list_patients

        all_patients = list_patients(tenant_id=DEFAULT_TENANT_ID, limit=1000)

        # Find maximum medical record number
        max_number = 0
        for patient in all_patients:
            mrn = patient.get("medical_record_no", "")
            if mrn and mrn.startswith("P"):
                try:
                    number = int(mrn[1:])
                    max_number = max(max_number, number)
                except ValueError:
                    continue

        next_medical_record_no = f"P{max_number + 1:08d}"

        # Step 2: Call existing implementation for parsing
        result = await parse_patient_document_impl(image_url)

        if "error" in result:
            return result

        # Step 3: Override medical_record_no with auto-generated one
        if "parsed_data" in result:
            result["parsed_data"]["medical_record_no"] = next_medical_record_no
            result["message"] = f"Patient information extracted. Auto-generated medical record number: {next_medical_record_no}. Please review and confirm before saving."

        logger.info(f"Successfully parsed patient archive with auto-generated medical record number: {next_medical_record_no}")

        return result

    except Exception as e:
        logger.error(f"Error parsing patient archive: {str(e)}")
        return {"error": str(e)}



@doc_parsing_tools.tool(
    name="parse_case_document",
    description="Parse case document and extract case information. Use when doctor uploads a case document and wants to create a new case."
)
async def parse_case_document(image_url: str) -> Dict[str, Any]:
    """
    Parse case document and extract case information.

    Args:
        image_url: URL or path to case document image

    Returns:
        Dict with parsed case information
    """
    try:
        logger.info(f"Parsing case document from: {image_url}")

        # Step 1: Get next available case id
        from database.case_db import list_cases

        all_cases = list_cases(tenant_id=DEFAULT_TENANT_ID, limit=1000)

        # Find maximum case id
        max_number = 0
        for case in all_cases:
            case_id = case.get("case_id", "")
            if case_id and case_id.startswith("C"):
                try:
                    number = int(case_id[1:])
                    max_number = max(max_number, number)
                except ValueError:
                    continue

        next_case_id = f"C{max_number + 1:08d}"

        # Step 2: Call existing implementation for parsing
        result = await parse_case_document_impl(image_url)

        if "error" in result:
            return result

        # Step 3: Override case_id with auto-generated one
        if "parsed_data" in result:
            result["parsed_data"]["case_id"] = next_case_id
            result["message"] = f"Case information extracted. Auto-generated case id: {next_case_id}. Please review and confirm before saving."

        logger.info(f"Successfully parsed case document with auto-generated case id: {next_case_id}")

        return result

    except Exception as e:
        logger.error(f"Error parsing case document: {str(e)}")
        return {"error": str(e)}