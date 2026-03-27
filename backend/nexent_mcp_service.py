import logging
from utils.logging_utils import configure_logging
from fastmcp import FastMCP
from tool_collection.mcp.local_mcp_service import local_mcp_service
from tool_collection.mcp.patient_lookup_tools import patient_lookup_tools
from tool_collection.mcp.doctor_patient_management_tools import doctor_patient_mgmt_tools
from tool_collection.mcp.doctor_timeline_management_tools import doctor_timeline_mgmt_tools
from tool_collection.mcp.care_plan_tools import care_plan_tools
from tool_collection.mcp.doctor_case_management_tools import doctor_case_mgmt_tools
from tool_collection.mcp.doctor_todo_tools import doctor_todo_tools
from tool_collection.mcp.patient_timeline_tools import patient_timeline_tools
from tool_collection.mcp.patient_info_tools import patient_info_tools
from tool_collection.mcp.medical_case_tools import medical_case_tools
from tool_collection.mcp.doctor_report_management_tools import doctor_report_mgmt_tools
from tool_collection.mcp.chart_generation_tools import chart_generation_tools

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
nexent_mcp.mount(patient_lookup_tools.name, patient_lookup_tools)
nexent_mcp.mount(doctor_patient_mgmt_tools.name, doctor_patient_mgmt_tools)
nexent_mcp.mount(doctor_timeline_mgmt_tools.name, doctor_timeline_mgmt_tools)
nexent_mcp.mount(care_plan_tools.name, care_plan_tools)
nexent_mcp.mount(doctor_case_mgmt_tools.name, doctor_case_mgmt_tools)
nexent_mcp.mount(doctor_todo_tools.name, doctor_todo_tools)
nexent_mcp.mount(patient_timeline_tools.name, patient_timeline_tools)
nexent_mcp.mount(patient_info_tools.name, patient_info_tools)
nexent_mcp.mount(medical_case_tools.name, medical_case_tools)
nexent_mcp.mount(doctor_report_mgmt_tools.name, doctor_report_mgmt_tools)
nexent_mcp.mount(chart_generation_tools.name, chart_generation_tools)
if __name__ == "__main__":
    nexent_mcp.run(transport="sse", host="0.0.0.0", port=5011)
