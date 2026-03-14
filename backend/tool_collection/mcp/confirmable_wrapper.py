"""
Confirmable Tool Wrapper - Intercepts write-operation MCP tools to require doctor confirmation.
Wraps tool execution with a confirmation flow: emit SSE card → block → wait for doctor → execute or skip.
"""
import json
import logging
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

# ============================================================================
# Tool Configurations - defines which tools need confirmation and their UI schema
# ============================================================================
CONFIRMABLE_TOOLS: Dict[str, Dict[str, Any]] = {
    # --- Patient Management ---
    "create_new_patient": {
        "display_name": "创建患者",
        "schema": [
            {"key": "name", "label": "姓名", "type": "text", "required": True},
            {"key": "gender", "label": "性别", "type": "select", "options": ["男", "女"], "required": True},
            {"key": "age", "label": "年龄", "type": "number", "required": True},
            {"key": "medical_record_no", "label": "病历号", "type": "text", "required": True},
            {"key": "diagnosis", "label": "诊断", "type": "text", "required": False},
            {"key": "email", "label": "邮箱", "type": "text", "required": False},
            {"key": "phone", "label": "电话", "type": "text", "required": False},
            {"key": "address", "label": "地址", "type": "text", "required": False},
            {"key": "date_of_birth", "label": "出生日期", "type": "date", "required": False},
            {"key": "allergies", "label": "过敏史", "type": "list", "required": False},
            {"key": "past_medical_history", "label": "既往病史", "type": "list", "required": False},
            {"key": "family_history", "label": "家族史", "type": "text", "required": False},
        ]
    },
    "update_patient_info": {
        "display_name": "更新患者信息",
        "schema": [
            {"key": "patient_id", "label": "患者ID", "type": "text", "required": True, "readonly": True},
            {"key": "name", "label": "姓名", "type": "text", "required": False},
            {"key": "gender", "label": "性别", "type": "select", "options": ["男", "女"], "required": False},
            {"key": "age", "label": "年龄", "type": "number", "required": False},
            {"key": "diagnosis", "label": "诊断", "type": "text", "required": False},
            {"key": "email", "label": "邮箱", "type": "text", "required": False},
            {"key": "phone", "label": "电话", "type": "text", "required": False},
            {"key": "address", "label": "地址", "type": "text", "required": False},
            {"key": "allergies", "label": "过敏史", "type": "list", "required": False},
            {"key": "past_medical_history", "label": "既往病史", "type": "list", "required": False},
            {"key": "family_history", "label": "家族史", "type": "text", "required": False},
        ]
    },
    "delete_patient_record": {
        "display_name": "删除患者",
        "schema": [
            {"key": "patient_id", "label": "患者ID", "type": "text", "required": True, "readonly": True},
        ]
    },

    # --- Todo Management ---
    "create_patient_todo": {
        "display_name": "创建待办事项",
        "schema": [
            {"key": "patient_id", "label": "患者ID", "type": "text", "required": True, "readonly": True},
            {"key": "todo_title", "label": "标题", "type": "text", "required": True},
            {"key": "todo_description", "label": "描述", "type": "textarea", "required": True},
            {"key": "todo_type", "label": "类型", "type": "text", "required": True},
            {"key": "due_date", "label": "截止日期", "type": "date", "required": False},
            {"key": "priority", "label": "优先级", "type": "select", "options": ["high", "medium", "low"], "required": True},
            {"key": "status", "label": "状态", "type": "select", "options": ["pending", "in_progress", "completed"], "required": True},
            {"key": "assigned_doctor", "label": "指派医生", "type": "text", "required": False},
        ]
    },
    "update_patient_todo_status": {
        "display_name": "更新待办状态",
        "schema": [
            {"key": "todo_id", "label": "待办ID", "type": "text", "required": True, "readonly": True},
            {"key": "status", "label": "状态", "type": "select", "options": ["pending", "in_progress", "completed"], "required": True},
        ]
    },
    "delete_patient_todo": {
        "display_name": "删除待办事项",
        "schema": [
            {"key": "todo_id", "label": "待办ID", "type": "text", "required": True, "readonly": True},
        ]
    },

    # --- Report Management ---
    "save_lab_report": {
        "display_name": "保存检验报告",
        "schema": [
            {"key": "patient_id", "label": "患者ID", "type": "text", "required": True, "readonly": True},
            {"key": "timeline_id", "label": "时间线ID", "type": "text", "required": True, "readonly": True},
            {"key": "report_type", "label": "报告类型", "type": "text", "required": True},
            {"key": "report_date", "label": "报告日期", "type": "date", "required": False},
            {"key": "report_institution", "label": "检验机构", "type": "text", "required": False},
            {"key": "report_number", "label": "报告编号", "type": "text", "required": False},
            {"key": "ai_summary", "label": "AI摘要", "type": "textarea", "required": False},
        ]
    },
    "delete_lab_report_record": {
        "display_name": "删除检验报告",
        "schema": [
            {"key": "report_id", "label": "报告ID", "type": "text", "required": True, "readonly": True},
        ]
    },
    "save_imaging_report": {
        "display_name": "保存影像报告",
        "schema": [
            {"key": "patient_id", "label": "患者ID", "type": "text", "required": True, "readonly": True},
            {"key": "timeline_id", "label": "时间线ID", "type": "text", "required": True, "readonly": True},
            {"key": "imaging_type", "label": "影像类型", "type": "text", "required": True},
            {"key": "imaging_date", "label": "检查日期", "type": "date", "required": False},
            {"key": "imaging_institution", "label": "检查机构", "type": "text", "required": False},
            {"key": "examination_site", "label": "检查部位", "type": "text", "required": False},
            {"key": "imaging_findings", "label": "影像所见", "type": "textarea", "required": False},
            {"key": "diagnostic_impression", "label": "诊断印象", "type": "textarea", "required": False},
            {"key": "recommendations", "label": "建议", "type": "textarea", "required": False},
            {"key": "ai_summary", "label": "AI摘要", "type": "textarea", "required": False},
        ]
    },
    "delete_imaging_report_record": {
        "display_name": "删除影像报告",
        "schema": [
            {"key": "report_id", "label": "报告ID", "type": "text", "required": True, "readonly": True},
        ]
    },

    # --- Case Management ---
    "create_medical_case": {
        "display_name": "创建病例",
        "schema": [
            {"key": "case_title", "label": "病例标题", "type": "text", "required": True},
            {"key": "diagnosis", "label": "诊断", "type": "text", "required": True},
            {"key": "disease_type", "label": "疾病类型", "type": "text", "required": True},
            {"key": "chief_complaint", "label": "主诉", "type": "textarea", "required": True},
            {"key": "age", "label": "年龄", "type": "number", "required": True},
            {"key": "gender", "label": "性别", "type": "select", "options": ["男", "女"], "required": True},
            {"key": "category", "label": "分类", "type": "text", "required": False},
            {"key": "tags", "label": "标签", "type": "list", "required": False},
        ]
    },
    "update_medical_case_info": {
        "display_name": "更新病例信息",
        "schema": [
            {"key": "case_id", "label": "病例ID", "type": "text", "required": True, "readonly": True},
            {"key": "case_title", "label": "病例标题", "type": "text", "required": False},
            {"key": "diagnosis", "label": "诊断", "type": "text", "required": False},
            {"key": "disease_type", "label": "疾病类型", "type": "text", "required": False},
            {"key": "chief_complaint", "label": "主诉", "type": "textarea", "required": False},
            {"key": "tags", "label": "标签", "type": "list", "required": False},
        ]
    },
    "delete_medical_case_record": {
        "display_name": "删除病例",
        "schema": [
            {"key": "case_id", "label": "病例ID", "type": "text", "required": True, "readonly": True},
        ]
    },
    "save_case_detail": {
        "display_name": "保存病例详情",
        "schema": [
            {"key": "case_id", "label": "病例ID", "type": "text", "required": True, "readonly": True},
            {"key": "present_illness_history", "label": "现病史", "type": "textarea", "required": False},
            {"key": "past_medical_history", "label": "既往史", "type": "textarea", "required": False},
            {"key": "family_history", "label": "家族史", "type": "textarea", "required": False},
            {"key": "diagnosis_basis", "label": "诊断依据", "type": "textarea", "required": False},
            {"key": "treatment_plan", "label": "治疗方案", "type": "textarea", "required": False},
            {"key": "prognosis", "label": "预后", "type": "textarea", "required": False},
            {"key": "clinical_notes", "label": "临床笔记", "type": "textarea", "required": False},
        ]
    },

    # --- Timeline Management ---
    "create_timeline_event": {
        "display_name": "创建时间线事件",
        "schema": [
            {"key": "patient_id", "label": "患者ID", "type": "text", "required": True, "readonly": True},
            {"key": "stage_type", "label": "阶段类型", "type": "text", "required": True},
            {"key": "stage_date", "label": "日期", "type": "date", "required": True},
            {"key": "stage_title", "label": "标题", "type": "text", "required": True},
            {"key": "diagnosis", "label": "诊断", "type": "text", "required": False},
            {"key": "status", "label": "状态", "type": "text", "required": True},
        ]
    },
    "save_timeline_detail": {
        "display_name": "保存时间线详情",
        "schema": [
            {"key": "timeline_id", "label": "时间线ID", "type": "text", "required": True, "readonly": True},
            {"key": "doctor_notes", "label": "医生笔记", "type": "textarea", "required": False},
            {"key": "pathology_findings", "label": "病理发现", "type": "textarea", "required": False},
            {"key": "patient_summary", "label": "患者总结", "type": "textarea", "required": False},
        ]
    },
    "delete_timeline_event": {
        "display_name": "删除时间线事件",
        "schema": [
            {"key": "timeline_id", "label": "时间线ID", "type": "text", "required": True, "readonly": True},
        ]
    },
}

# Internal/system parameters that should not be shown in the confirmation card
HIDDEN_PARAMS = {"tenant_id", "user_id"}


def get_visible_parameters(tool_name: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
    """Filter out hidden system parameters from the confirmation card display."""
    return {k: v for k, v in parameters.items() if k not in HIDDEN_PARAMS}


def _match_confirmable_tool(tool_name: str) -> Optional[str]:
    """
    Match a tool name against CONFIRMABLE_TOOLS, handling MCP server name prefixes.
    MCP mount() prefixes tool names with '{server_name}_', e.g.
    'doctor_patient_management_create_new_patient' for tool 'create_new_patient'.
    Returns the matched key in CONFIRMABLE_TOOLS, or None if no match.
    """
    # Direct match first
    if tool_name in CONFIRMABLE_TOOLS:
        return tool_name
    # Try suffix match: strip any prefix before the known tool name
    for key in CONFIRMABLE_TOOLS:
        if tool_name.endswith(f"_{key}"):
            return key
    return None


def apply_confirmation_wrapper(tool, observer, confirmation_manager):
    """
    Wrap a smolagents Tool with confirmation logic.
    Returns the same tool with its forward() method replaced by a wrapper
    that blocks until doctor confirms.
    """
    tool_name = tool.name

    matched_key = _match_confirmable_tool(tool_name)
    if matched_key is None:
        return tool

    config = CONFIRMABLE_TOOLS[matched_key]
    original_forward = tool.forward

    def wrapped_forward(**kwargs):
        from nexent.core.utils.observer import ProcessType

        visible_params = get_visible_parameters(tool_name, kwargs)
        hidden_params = {k: v for k, v in kwargs.items() if k in HIDDEN_PARAMS}

        # Create confirmation request
        confirmation_id = confirmation_manager.create_confirmation(
            tool_name=tool_name,
            tool_display_name=config["display_name"],
            parameters=visible_params,
            parameter_schema=config["schema"]
        )

        # Emit SSE message for frontend to render confirmation card
        confirmation_data = json.dumps({
            "confirmation_id": confirmation_id,
            "tool_name": tool_name,
            "tool_display_name": config["display_name"],
            "parameters": visible_params,
            "parameter_schema": config["schema"]
        }, ensure_ascii=False)

        observer.add_message("", ProcessType.TOOL_CONFIRMATION, confirmation_data)

        logger.info(f"Waiting for confirmation {confirmation_id} on tool {tool_name}")

        # Block agent thread until doctor responds
        result = confirmation_manager.wait_for_confirmation(confirmation_id, timeout=300)

        action = result.get("action", "error")

        if action == "confirm":
            # Doctor confirmed - execute with (possibly modified) parameters
            confirmed_params = result.get("parameters", visible_params)
            # Merge back hidden params
            final_params = {**confirmed_params, **hidden_params}
            logger.info(f"Executing confirmed tool {tool_name}")
            return original_forward(**final_params)

        elif action == "regenerate":
            instructions = result.get("instructions", "")
            msg = f"医生要求重新生成。"
            if instructions:
                msg += f" 修改指令：{instructions}"
            msg += " 请根据医生的要求重新组织数据后再次调用此工具。"
            logger.info(f"Regeneration requested for {tool_name}: {instructions}")
            return msg

        elif action == "timeout":
            logger.warning(f"Confirmation timeout for {tool_name}")
            return "确认超时，操作未执行。请医生在对话中重新发起该操作。"

        else:
            logger.error(f"Unknown confirmation action: {action}")
            return f"确认流程出错：{result.get('message', '未知错误')}"

    # Replace the forward method
    tool.forward = wrapped_forward
    return tool
