"""
OCR Tools - MCP Format
Tools for OCR recognition and document processing using PaddleOCR MCP service
"""
import logging
import httpx
import base64
from typing import Optional, Dict, Any, List
from fastmcp import FastMCP, Client

from consts.const import OCR_MCP_SERVER_URL

logger = logging.getLogger(__name__)

ocr_tools = FastMCP("ocr")

# Default OCR MCP server URL (can be overridden via environment variable)
DEFAULT_OCR_MCP_URL = "http://127.0.0.1:5020"


def get_ocr_server_url() -> str:
    """Get OCR MCP server URL from config or use default."""
    return OCR_MCP_SERVER_URL or DEFAULT_OCR_MCP_URL


async def call_ocr_mcp_tool(tool_name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
    """
    Call a tool on the PaddleOCR MCP server.

    Args:
        tool_name: Name of the tool to call
        arguments: Arguments to pass to the tool

    Returns:
        Tool execution result
    """
    server_url = get_ocr_server_url()

    try:
        # Use FastMCP Client to connect to remote MCP server
        async with Client(server_url) as client:
            result = await client.call_tool(tool_name, arguments)
            return {"success": True, "data": result}
    except Exception as e:
        logger.error(f"Error calling OCR MCP tool {tool_name}: {str(e)}")
        return {"success": False, "error": str(e)}


async def call_ocr_http_api(
    endpoint: str,
    image_data: str,
    pipeline: str = "OCR"
) -> Dict[str, Any]:
    """
    Call OCR service via HTTP API (fallback method).

    Args:
        endpoint: API endpoint path
        image_data: Base64 encoded image or URL
        pipeline: OCR pipeline type ("OCR" or "PP-StructureV3")

    Returns:
        OCR result
    """
    server_url = get_ocr_server_url()

    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                f"{server_url}{endpoint}",
                json={
                    "image": image_data,
                    "pipeline": pipeline
                }
            )
            response.raise_for_status()
            return {"success": True, "data": response.json()}
    except Exception as e:
        logger.error(f"Error calling OCR HTTP API: {str(e)}")
        return {"success": False, "error": str(e)}


@ocr_tools.tool(
    name="ocr_image",
    description="Perform OCR recognition on an image. Use this when user uploads an image and wants to extract text from it."
)
async def ocr_image(
    image_url: str,
    pipeline: str = "OCR"
) -> Dict[str, Any]:
    """
    Perform OCR recognition on an image.

    Args:
        image_url: Image URL or base64 encoded image data
        pipeline: OCR pipeline type:
                  - "OCR": Basic text detection and recognition
                  - "PP-StructureV3": Advanced layout analysis with tables, formulas, etc.

    Returns:
        OCR result containing:
        - text: Full extracted text
        - blocks: List of text blocks with positions
        - tables: Extracted tables (if using PP-StructureV3)
        - confidence: Overall confidence score
    """
    try:
        # Determine if input is URL or base64
        is_url = image_url.startswith(('http://', 'https://'))

        # Call OCR MCP tool
        result = await call_ocr_mcp_tool(
            "ocr" if pipeline == "OCR" else "pp_structure_v3",
            {
                "image": image_url,
                "file_type": "image"
            }
        )

        if not result.get("success"):
            return {
                "error": result.get("error", "OCR processing failed"),
                "image_url": image_url
            }

        data = result.get("data", {})

        # Format response
        return {
            "text": data.get("text", ""),
            "blocks": data.get("blocks", []),
            "tables": data.get("tables", []),
            "confidence": data.get("confidence", 0.0),
            "pipeline": pipeline,
            "image_url": image_url
        }

    except Exception as e:
        logger.error(f"Error in ocr_image: {str(e)}")
        return {"error": str(e), "image_url": image_url}


@ocr_tools.tool(
    name="ocr_pdf",
    description="Perform OCR recognition on a PDF document. Use this when user uploads a PDF and wants to extract text from it."
)
async def ocr_pdf(
    pdf_url: str,
    pages: Optional[List[int]] = None,
    pipeline: str = "PP-StructureV3"
) -> Dict[str, Any]:
    """
    Perform OCR recognition on a PDF document.

    Args:
        pdf_url: PDF file URL or base64 encoded PDF data
        pages: List of page numbers to process (0-indexed). None means all pages.
        pipeline: OCR pipeline type (PP-StructureV3 recommended for PDFs)

    Returns:
        OCR result containing:
        - pages: List of page results, each with text, blocks, tables
        - total_pages: Total number of pages processed
        - full_text: Combined text from all pages
    """
    try:
        # Call OCR MCP tool for PDF
        result = await call_ocr_mcp_tool(
            "pp_structure_v3",
            {
                "image": pdf_url,
                "file_type": "pdf",
                "pages": pages
            }
        )

        if not result.get("success"):
            return {
                "error": result.get("error", "PDF OCR processing failed"),
                "pdf_url": pdf_url
            }

        data = result.get("data", {})

        # Format response for multiple pages
        pages_result = data.get("pages", [])
        full_text = "\n\n".join([
            p.get("text", "") for p in pages_result
        ])

        return {
            "pages": pages_result,
            "total_pages": len(pages_result),
            "full_text": full_text,
            "pipeline": pipeline,
            "pdf_url": pdf_url
        }

    except Exception as e:
        logger.error(f"Error in ocr_pdf: {str(e)}")
        return {"error": str(e), "pdf_url": pdf_url}


@ocr_tools.tool(
    name="ocr_with_layout",
    description="Perform OCR with full layout analysis including tables, formulas, and document structure. Best for complex documents like medical reports."
)
async def ocr_with_layout(
    image_url: str,
    extract_tables: bool = True,
    extract_formulas: bool = True
) -> Dict[str, Any]:
    """
    Perform OCR with comprehensive layout analysis.

    Args:
        image_url: Image or PDF URL
        extract_tables: Whether to extract and structure tables
        extract_formulas: Whether to extract and render formulas

    Returns:
        Structured document content with:
        - markdown: Document converted to markdown format
        - sections: List of document sections (headers, paragraphs, tables, figures)
        - tables: Structured table data
        - formulas: Extracted formula LaTeX
    """
    try:
        # Use PP-StructureV3 for layout analysis
        result = await call_ocr_mcp_tool(
            "pp_structure_v3",
            {
                "image": image_url,
                "extract_tables": extract_tables,
                "extract_formulas": extract_formulas
            }
        )

        if not result.get("success"):
            return {
                "error": result.get("error", "Layout analysis failed"),
                "image_url": image_url
            }

        data = result.get("data", {})

        return {
            "markdown": data.get("markdown", ""),
            "sections": data.get("sections", []),
            "tables": data.get("tables", []),
            "formulas": data.get("formulas", []),
            "raw_text": data.get("text", ""),
            "image_url": image_url
        }

    except Exception as e:
        logger.error(f"Error in ocr_with_layout: {str(e)}")
        return {"error": str(e), "image_url": image_url}


@ocr_tools.tool(
    name="check_ocr_service_status",
    description="Check if the OCR MCP service is available and healthy."
)
async def check_ocr_service_status() -> Dict[str, Any]:
    """
    Check OCR MCP service health status.

    Returns:
        Service status including:
        - available: Whether service is reachable
        - url: Service URL
        - tools: Available OCR tools
    """
    server_url = get_ocr_server_url()

    try:
        async with Client(server_url) as client:
            # Get available tools
            tools = await client.list_tools()
            tool_names = [t.name for t in tools] if tools else []

            return {
                "available": True,
                "url": server_url,
                "tools": tool_names,
                "message": "OCR service is healthy"
            }
    except Exception as e:
        logger.error(f"OCR service health check failed: {str(e)}")
        return {
            "available": False,
            "url": server_url,
            "tools": [],
            "message": f"Service unavailable: {str(e)}"
        }
