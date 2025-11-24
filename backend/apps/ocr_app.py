"""
OCR API Endpoints
Handles OCR processing, document type detection, and field extraction
"""
import logging
from http import HTTPStatus
from typing import Optional, List, Dict, Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from starlette.responses import JSONResponse

from tool_collection.mcp.ocr_tools import (
    ocr_image,
    ocr_pdf,
    ocr_with_layout,
    check_ocr_service_status,
)
from tool_collection.mcp.field_extraction_tools import (
    detect_document_type,
    extract_fields_from_ocr,
    get_template_fields,
    list_all_templates,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/ocr", tags=["OCR"])


# Request Models
class OcrImageRequest(BaseModel):
    image_url: str
    pipeline: str = "OCR"  # "OCR" or "PP-StructureV3"


class OcrPdfRequest(BaseModel):
    pdf_url: str
    pages: Optional[List[int]] = None
    pipeline: str = "PP-StructureV3"


class DetectTypeRequest(BaseModel):
    ocr_text: str


class ExtractFieldsRequest(BaseModel):
    ocr_text: str
    template_type: str
    image_annotations: Optional[List[Dict[str, Any]]] = None


class OcrWithLayoutRequest(BaseModel):
    image_url: str
    extract_tables: bool = True
    extract_formulas: bool = True


# Endpoints
@router.get("/status")
async def get_ocr_status():
    """
    Check OCR service availability.

    Returns:
        Service status including availability and available tools
    """
    try:
        result = await check_ocr_service_status()
        return JSONResponse(status_code=HTTPStatus.OK, content=result)
    except Exception as e:
        logger.error(f"Error checking OCR status: {str(e)}")
        return JSONResponse(
            status_code=HTTPStatus.OK,
            content={
                "available": False,
                "url": "",
                "tools": [],
                "message": str(e)
            }
        )


@router.post("/image")
async def process_ocr_image(request: OcrImageRequest):
    """
    Perform OCR on an image.

    Args:
        request: Image URL and pipeline type

    Returns:
        OCR result with extracted text and blocks
    """
    try:
        result = await ocr_image(
            image_url=request.image_url,
            pipeline=request.pipeline
        )

        if "error" in result:
            raise HTTPException(
                status_code=HTTPStatus.BAD_REQUEST,
                detail=result["error"]
            )

        return JSONResponse(status_code=HTTPStatus.OK, content=result)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing OCR image: {str(e)}")
        raise HTTPException(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            detail=f"OCR processing failed: {str(e)}"
        )


@router.post("/pdf")
async def process_ocr_pdf(request: OcrPdfRequest):
    """
    Perform OCR on a PDF document.

    Args:
        request: PDF URL, optional page numbers, and pipeline type

    Returns:
        OCR result with text from each page
    """
    try:
        result = await ocr_pdf(
            pdf_url=request.pdf_url,
            pages=request.pages,
            pipeline=request.pipeline
        )

        if "error" in result:
            raise HTTPException(
                status_code=HTTPStatus.BAD_REQUEST,
                detail=result["error"]
            )

        return JSONResponse(status_code=HTTPStatus.OK, content=result)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing OCR PDF: {str(e)}")
        raise HTTPException(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            detail=f"PDF OCR processing failed: {str(e)}"
        )


@router.post("/layout")
async def process_ocr_with_layout(request: OcrWithLayoutRequest):
    """
    Perform OCR with full layout analysis.

    Args:
        request: Image URL and extraction options

    Returns:
        Structured document with sections, tables, and formulas
    """
    try:
        result = await ocr_with_layout(
            image_url=request.image_url,
            extract_tables=request.extract_tables,
            extract_formulas=request.extract_formulas
        )

        if "error" in result:
            raise HTTPException(
                status_code=HTTPStatus.BAD_REQUEST,
                detail=result["error"]
            )

        return JSONResponse(status_code=HTTPStatus.OK, content=result)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing OCR with layout: {str(e)}")
        raise HTTPException(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            detail=f"Layout analysis failed: {str(e)}"
        )


@router.post("/detect_type")
async def detect_type(request: DetectTypeRequest):
    """
    Detect document type from OCR text.

    Args:
        request: OCR extracted text

    Returns:
        Detected document type and subtype with confidence
    """
    try:
        result = await detect_document_type(ocr_text=request.ocr_text)

        if "error" in result:
            raise HTTPException(
                status_code=HTTPStatus.BAD_REQUEST,
                detail=result["error"]
            )

        return JSONResponse(status_code=HTTPStatus.OK, content=result)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error detecting document type: {str(e)}")
        raise HTTPException(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            detail=f"Document type detection failed: {str(e)}"
        )


@router.post("/extract_fields")
async def extract_fields(request: ExtractFieldsRequest):
    """
    Extract structured fields from OCR text using template.

    Args:
        request: OCR text, template type, and optional annotations

    Returns:
        Extracted fields with confidence scores
    """
    try:
        result = await extract_fields_from_ocr(
            ocr_text=request.ocr_text,
            template_type=request.template_type,
            image_annotations=request.image_annotations
        )

        if "error" in result:
            raise HTTPException(
                status_code=HTTPStatus.BAD_REQUEST,
                detail=result["error"]
            )

        return JSONResponse(status_code=HTTPStatus.OK, content=result)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error extracting fields: {str(e)}")
        raise HTTPException(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            detail=f"Field extraction failed: {str(e)}"
        )


@router.get("/templates/{template_type}")
async def get_template(template_type: str):
    """
    Get field definitions for a specific template.

    Args:
        template_type: Template type key

    Returns:
        Template field definitions
    """
    try:
        result = await get_template_fields(template_type=template_type)

        if "error" in result:
            raise HTTPException(
                status_code=HTTPStatus.NOT_FOUND,
                detail=result["error"]
            )

        return JSONResponse(status_code=HTTPStatus.OK, content=result)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting template: {str(e)}")
        raise HTTPException(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/templates")
async def list_templates():
    """
    List all available document templates.

    Returns:
        All templates grouped by document type
    """
    try:
        result = await list_all_templates()
        return JSONResponse(status_code=HTTPStatus.OK, content=result)

    except Exception as e:
        logger.error(f"Error listing templates: {str(e)}")
        raise HTTPException(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
