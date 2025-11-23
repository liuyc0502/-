"""
Medical MCP Tools Package

This package provides MCP tools for medical domain operations.
"""

from fastmcp import FastMCP

# Create the main medical MCP service
medical_mcp_service = FastMCP("medical_tools")

# Import and register tools from each module
from .patient_tools import register_patient_tools
from .case_tools import register_case_tools
from .care_plan_tools import register_care_plan_tools
from .image_tools import register_image_tools
from .conversation_tools import register_conversation_tools
from .diagnostic_tools import register_diagnostic_tools

# Register all tool categories
register_patient_tools(medical_mcp_service)
register_case_tools(medical_mcp_service)
register_care_plan_tools(medical_mcp_service)
register_image_tools(medical_mcp_service)
register_conversation_tools(medical_mcp_service)
register_diagnostic_tools(medical_mcp_service)

__all__ = ["medical_mcp_service"]
