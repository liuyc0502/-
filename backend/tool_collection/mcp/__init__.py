"""
Medical AI Agent Tools - MCP Integration Module

This module provides a unified interface for all medical AI tools.
"""

from .patient_management_tools import patient_tools
from .case_library_tools import case_tools
from .knowledge_base_tools import knowledge_tools
from .care_plan_tools import care_plan_tools
from .diagnostic_assistance_tools import diagnostic_tools
from .contextual_prompt_tools import contextual_prompt_tools

# Export all MCP tool servers
__all__ = [
    'patient_tools',
    'case_tools',
    'knowledge_tools',
    'care_plan_tools',
    'diagnostic_tools',
    'contextual_prompt_tools',
]

# Tool server registry for easy access
TOOL_SERVERS = {
    'patient_management': patient_tools,
    'case_library': case_tools,
    'knowledge_base': knowledge_tools,
    'care_plan': care_plan_tools,
    'diagnostic_assistance': diagnostic_tools,
    'contextual_prompts': contextual_prompt_tools,
}

# Tool count summary
TOOL_COUNTS = {
    'patient_management': 6,
    'case_library': 6,
    'knowledge_base': 5,
    'care_plan': 4,
    'diagnostic_assistance': 3,
    'contextual_prompts': 6,
}

TOTAL_TOOLS = sum(TOOL_COUNTS.values())

print(f"""
╔══════════════════════════════════════════════════════════════╗
║       Medical AI Agent Tools - MCP Module Loaded             ║
╚══════════════════════════════════════════════════════════════╝

📦 Tool Categories:
  • Patient Management:      {TOOL_COUNTS['patient_management']} tools
  • Case Library:            {TOOL_COUNTS['case_library']} tools
  • Knowledge Base:          {TOOL_COUNTS['knowledge_base']} tools
  • Care Plan:               {TOOL_COUNTS['care_plan']} tools
  • Diagnostic Assistance:   {TOOL_COUNTS['diagnostic_assistance']} tools
  • Contextual Prompts:      {TOOL_COUNTS['contextual_prompts']} tools

✅ Total Tools Available: {TOTAL_TOOLS}

🚀 Ready for agent integration!
""")
