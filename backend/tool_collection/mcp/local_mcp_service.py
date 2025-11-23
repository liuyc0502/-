"""
Local MCP Service - Entry point for all MCP tools
This module aggregates all MCP tool collections for the pathology Q&A agent.
"""
from fastmcp import FastMCP

# Create main MCP server
local_mcp_service = FastMCP("local")

# Import all tool collections
from tool_collection.mcp.patient_management_tools import patient_tools
from tool_collection.mcp.case_library_tools import case_tools
from tool_collection.mcp.knowledge_base_tools import knowledge_tools
from tool_collection.mcp.care_plan_tools import care_plan_tools
from tool_collection.mcp.diagnostic_assistance_tools import diagnostic_tools
from tool_collection.mcp.pathology_image_tools import pathology_image_tools
from tool_collection.mcp.image_annotation_tools import annotation_tools
from tool_collection.mcp.multimodal_tools import multimodal_tools


# Export all tool servers for registration
__all__ = [
    "local_mcp_service",
    "patient_tools",
    "case_tools",
    "knowledge_tools",
    "care_plan_tools",
    "diagnostic_tools",
    "pathology_image_tools",
    "annotation_tools",
    "multimodal_tools"
]


# Demo tool for testing
@local_mcp_service.tool(
    name="test_tool_name",
    description="Test tool for verifying MCP server connectivity"
)
async def demo_tool(para_1: str, para_2: int) -> str:
    """Demo tool for testing purposes."""
    print("tool is called successfully")
    print(para_1, para_2)
    return "success"


# Tool collection summary
TOOL_COLLECTIONS = {
    "patient_management": {
        "server": patient_tools,
        "description": "6 tools for patient records and medical data",
        "tools": [
            "get_patient_basic_info",
            "get_patient_timeline",
            "get_patient_medical_images",
            "analyze_patient_metrics",
            "get_patient_todos",
            "get_patient_examination_reports"
        ]
    },
    "case_library": {
        "server": case_tools,
        "description": "6 tools for medical case search and analysis",
        "tools": [
            "search_medical_cases",
            "get_case_detail",
            "search_cases_by_symptoms",
            "get_similar_cases",
            "get_classic_cases_by_disease",
            "analyze_case_trends"
        ]
    },
    "knowledge_base": {
        "server": knowledge_tools,
        "description": "5 tools for medical knowledge retrieval",
        "tools": [
            "search_knowledge",
            "get_knowledge_by_category",
            "get_learning_recommendations",
            "search_diagnosis_guidelines",
            "get_knowledge_document"
        ]
    },
    "care_plan": {
        "server": care_plan_tools,
        "description": "4 tools for rehabilitation planning",
        "tools": [
            "create_care_plan",
            "get_patient_care_plans",
            "update_care_plan_progress",
            "generate_care_plan_suggestions"
        ]
    },
    "diagnostic_assistance": {
        "server": diagnostic_tools,
        "description": "3 tools for diagnostic support",
        "tools": [
            "differential_diagnosis",
            "suggest_next_tests",
            "risk_assessment"
        ]
    },
    "pathology_image": {
        "server": pathology_image_tools,
        "description": "5 tools for AI-powered pathology image analysis",
        "tools": [
            "analyze_pathology_slide",
            "detect_lesion_regions",
            "compare_pathology_images",
            "grade_tumor_differentiation",
            "identify_cell_types"
        ]
    },
    "image_annotation": {
        "server": annotation_tools,
        "description": "6 tools for interactive image annotation",
        "tools": [
            "analyze_marked_region",
            "identify_point_location",
            "generate_auto_annotations",
            "measure_region",
            "interactive_pathology_qa",
            "save_annotation_report"
        ]
    },
    "multimodal": {
        "server": multimodal_tools,
        "description": "6 tools for voice and multi-modal interactions",
        "tools": [
            "voice_pathology_qa",
            "generate_voice_report",
            "multimodal_case_presentation",
            "real_time_image_analysis",
            "image_to_text_description",
            "similar_image_search"
        ]
    }
}


def get_all_tool_servers():
    """Get all MCP tool servers for registration."""
    return [
        patient_tools,
        case_tools,
        knowledge_tools,
        care_plan_tools,
        diagnostic_tools,
        pathology_image_tools,
        annotation_tools,
        multimodal_tools
    ]


def get_tool_count():
    """Get total number of tools available."""
    return sum(len(col["tools"]) for col in TOOL_COLLECTIONS.values())


def print_tool_summary():
    """Print summary of all available tools."""
    print("\n" + "="*60)
    print("Pathology Q&A Agent - MCP Tools Summary")
    print("="*60)

    total = 0
    for name, collection in TOOL_COLLECTIONS.items():
        count = len(collection["tools"])
        total += count
        print(f"\n{name.upper()} ({count} tools)")
        print(f"  {collection['description']}")
        for tool in collection["tools"]:
            print(f"    - {tool}")

    print("\n" + "="*60)
    print(f"Total: {total} MCP tools available")
    print("="*60 + "\n")
