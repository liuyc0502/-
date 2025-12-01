import logging
from utils.logging_utils import configure_logging
from fastmcp import FastMCP
from tool_collection.mcp.local_mcp_service import local_mcp_service
from tool_collection.mcp.patient_management_tools import patient_tools
from tool_collection.mcp.case_library_tools import case_tools
from tool_collection.mcp.care_plan_tools import care_plan_tools
from tool_collection.mcp.document_parsing_tools import doc_parsing_tools
"""
hierarchical proxy architecture:
- local service layer: stable local mount service
- remote proxy layer: dynamic managed remote mcp service proxy
"""

configure_logging(logging.INFO)
logger = logging.getLogger("nexent_mcp_service")

# initialize main mcp service
nexent_mcp = FastMCP(name="nexent_mcp")

# mount local service (stable, not affected by remote proxy)
nexent_mcp.mount(local_mcp_service.name, local_mcp_service)

nexent_mcp.mount(patient_tools.name, patient_tools)
nexent_mcp.mount(case_tools.name, case_tools)
nexent_mcp.mount(care_plan_tools.name, care_plan_tools)
nexent_mcp.mount(doc_parsing_tools.name, doc_parsing_tools)
if __name__ == "__main__":
    nexent_mcp.run(transport="sse", host="0.0.0.0", port=5011)
