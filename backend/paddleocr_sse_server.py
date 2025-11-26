#!/usr/bin/env python3
"""
PaddleOCR MCP Server with SSE transport
This wrapper starts PaddleOCR MCP using SSE protocol instead of streamable-http
"""
import sys
sys.path.insert(0, '/usr/local/lib/python3.10/site-packages')

import asyncio
import logging
from fastmcp import FastMCP
from paddleocr_mcp.pipelines import create_pipeline_handler

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("paddleocr_sse_server")


async def main():
    """Start PaddleOCR MCP with SSE transport"""
    
    # Create pipeline handler (OCR, local mode)
    logger.info("Initializing PaddleOCR pipeline...")
    pipeline_handler = create_pipeline_handler(
        "OCR",      # pipeline (positional)
        "local",    # ppocr_source (positional)
        pipeline_config=None,
        device=None,
        server_url=None,
        aistudio_access_token=None,
        timeout=60,
    )
    
    await pipeline_handler.start()
    logger.info("PaddleOCR pipeline started")
    
    try:
        # Create FastMCP server
        mcp = FastMCP(
            name="PaddleOCR SSE Server",
            log_level="INFO",
        )
        
        # Register PaddleOCR tools
        pipeline_handler.register_tools(mcp)
        logger.info("PaddleOCR tools registered")
        
        # Run with SSE transport (endpoint will be /sse)
        logger.info("Starting SSE server on http://0.0.0.0:5020/sse")
        await mcp.run_async(
            transport="sse",
            host="0.0.0.0",
            port=5020,
        )
    finally:
        await pipeline_handler.stop()


if __name__ == "__main__":
    asyncio.run(main())

