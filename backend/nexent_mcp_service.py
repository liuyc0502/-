import logging
from utils.logging_utils import configure_logging
from fastmcp import FastMCP
from tool_collection.mcp.local_mcp_service import local_mcp_service
from tool_collection.mcp.medical import medical_mcp_service

"""
hierarchical proxy architecture:
- local service layer: stable local mount service
- medical tools layer: domain-specific medical MCP tools
- remote proxy layer: dynamic managed remote mcp service proxy
"""

configure_logging(logging.INFO)
logger = logging.getLogger("nexent_mcp_service")

# initialize main mcp service
nexent_mcp = FastMCP(name="nexent_mcp")

# mount local service (stable, not affected by remote proxy)
nexent_mcp.mount(local_mcp_service.name, local_mcp_service)

# mount medical tools service (domain-specific tools)
nexent_mcp.mount(medical_mcp_service.name, medical_mcp_service)

if __name__ == "__main__":
    nexent_mcp.run(transport="sse", host="0.0.0.0", port=5011)
