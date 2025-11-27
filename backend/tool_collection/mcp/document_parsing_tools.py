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


@doc_parsing_tools.tool(
    name="parse_patient_document",
    description="Parse patient document image using OCR and extract structured patient information. Use when doctor uploads a patient medical record document and wants to automatically fill patient information form."
)
async def parse_patient_document_tool(image_url: str) -> Dict[str, Any]:
    """MCP tool wrapper for parse_patient_document_impl"""
    return await parse_patient_document_impl(image_url)


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
    name="parse_case_document",
    description="Parse medical case document image using OCR and extract structured case information. Use when doctor uploads a case document and wants to automatically fill case library form."
)
async def parse_case_document_tool(image_url: str) -> Dict[str, Any]:
    """MCP tool wrapper for parse_case_document_impl"""
    return await parse_case_document_impl(image_url)


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
    name="extract_lab_results_from_image",
    description="Extract laboratory test results from a lab report image. Use when doctor uploads a lab test report and wants to extract metrics automatically."
)
async def extract_lab_results_tool(
    image_url: str
) -> Dict[str, Any]:
    """
    Extract lab test metrics from a lab report image.

    Args:
        image_url: URL or path to lab report image

    Returns:
        Dict with extracted metrics
    """
    try:
        logger.info(f"Extracting lab results from: {image_url}")

        # Step 1: Get detailed OCR with coordinates
        ocr_result = await call_paddleocr(image_url, output_mode="detailed")

        if ocr_result.startswith("OCR Error"):
            return {"error": ocr_result}

        # Step 2: Parse metrics (placeholder - would use LLM in production)
        # Look for patterns like: "WBC: 6.5 10^9/L", "Hemoglobin: 145 g/L"

        return {
            "success": True,
            "ocr_result": ocr_result,
            "message": "Lab results extracted. [Placeholder] Would parse metrics with LLM in production.",
            "note": "In production, this would intelligently extract metric names, values, units, and normal ranges"
        }

    except Exception as e:
        logger.error(f"Error extracting lab results: {str(e)}")
        return {"error": str(e)}
