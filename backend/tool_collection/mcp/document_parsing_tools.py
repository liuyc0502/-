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
        client = Client(PADDLEOCR_MCP_URL, timeout=60)
        async with client:
            # Call the 'ocr' tool from PaddleOCR MCP
            result = await client.call_tool(
                "ocr",
                arguments={
                    "input_data": image_url,
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
    # TODO: Integrate with your LLM service (OpenAI/Claude)
    # For now, return a placeholder

    parsed_data = {}
    for field_name, field_desc in target_schema.items():
        parsed_data[field_name] = f"[To be extracted from OCR text based on: {field_desc}]"

    return parsed_data


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
