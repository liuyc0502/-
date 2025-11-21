"""
Contextual Prompt Tools for AI Agent
MCP-based tools for generating interactive UI prompts based on conversation context
"""

from fastmcp import FastMCP
from typing import Optional, List, Dict, Any, Literal
import logging

logger = logging.getLogger(__name__)

# Create MCP server for contextual prompt tools
contextual_prompt_tools = FastMCP("contextual_prompts")


@contextual_prompt_tools.tool(
    name="suggest_contextual_prompts",
    description="Generate interactive UI prompts (tags, dropdowns, quick actions) based on conversation context. Use this when you want to guide the user with contextual suggestions."
)
async def suggest_contextual_prompts(
    prompt_type: Literal["tags", "dropdown", "quick_actions", "cards", "form"],
    title: str,
    description: Optional[str] = None,
    options: List[Dict[str, Any]] = None,
    context: Optional[str] = None,
    priority: Literal["high", "medium", "low"] = "medium"
) -> Dict[str, Any]:
    """
    Generate contextual UI prompts for user interaction

    Args:
        prompt_type: Type of UI component to render
            - "tags": Clickable tag chips (e.g., patient filters, disease types)
            - "dropdown": Dropdown selection menu
            - "quick_actions": Quick action buttons with icons
            - "cards": Information cards with actions
            - "form": Form fields for structured input
        title: Title of the prompt section
        description: Optional description text
        options: List of options/items to display. Format depends on prompt_type:
            - For tags: [{"label": "类风湿", "value": "rheumatoid", "color": "blue"}]
            - For dropdown: [{"label": "按时间排序", "value": "sort_by_time"}]
            - For quick_actions: [{"label": "查看病历", "value": "view_records", "icon": "FileText"}]
            - For cards: [{"title": "患者概览", "description": "...", "action": "view_patient"}]
            - For form: [{"field": "patient_name", "type": "text", "label": "患者姓名"}]
        context: Current conversation context (e.g., "patient_detail", "case_search")
        priority: Visual priority (affects styling)

    Returns:
        Structured prompt data that frontend will render as interactive components
    """
    try:
        if not options:
            options = []

        # Validate options format based on prompt_type
        if prompt_type == "tags":
            for opt in options:
                if "label" not in opt or "value" not in opt:
                    raise ValueError("Tags require 'label' and 'value' fields")

        elif prompt_type == "dropdown":
            for opt in options:
                if "label" not in opt or "value" not in opt:
                    raise ValueError("Dropdown requires 'label' and 'value' fields")

        elif prompt_type == "quick_actions":
            for opt in options:
                if "label" not in opt or "value" not in opt:
                    raise ValueError("Quick actions require 'label' and 'value' fields")

        elif prompt_type == "cards":
            for opt in options:
                if "title" not in opt:
                    raise ValueError("Cards require 'title' field")

        elif prompt_type == "form":
            for opt in options:
                if "field" not in opt or "type" not in opt:
                    raise ValueError("Form fields require 'field' and 'type'")

        result = {
            "type": "contextual_prompt",
            "prompt_type": prompt_type,
            "title": title,
            "description": description,
            "options": options,
            "context": context,
            "priority": priority,
            "timestamp": None  # Frontend will add timestamp
        }

        logger.info(f"Generated {prompt_type} contextual prompt with {len(options)} options")
        return result

    except Exception as e:
        logger.error(f"Error generating contextual prompt: {str(e)}")
        return {"error": str(e)}


@contextual_prompt_tools.tool(
    name="suggest_patient_filters",
    description="Generate patient filtering suggestions based on current context. Use when user is viewing patient list and might want to filter."
)
async def suggest_patient_filters(
    current_filters: Optional[Dict[str, Any]] = None,
    patient_count: Optional[int] = None
) -> Dict[str, Any]:
    """
    Generate smart patient filtering suggestions

    Args:
        current_filters: Currently applied filters
        patient_count: Total number of patients

    Returns:
        Contextual prompt with patient filter options
    """
    try:
        options = [
            {"label": "最近就诊", "value": "recent", "color": "blue", "icon": "Clock"},
            {"label": "待随访", "value": "pending_followup", "color": "orange", "icon": "AlertCircle"},
            {"label": "疑难病例", "value": "difficult", "color": "red", "icon": "AlertTriangle"},
            {"label": "类风湿关节炎", "value": "rheumatoid_arthritis", "color": "purple"},
            {"label": "系统性红斑狼疮", "value": "lupus", "color": "pink"},
            {"label": "强直性脊柱炎", "value": "ankylosing_spondylitis", "color": "green"},
        ]

        # Filter out already applied filters
        if current_filters:
            applied = set(current_filters.values())
            options = [opt for opt in options if opt["value"] not in applied]

        description = f"共 {patient_count} 位患者" if patient_count else "筛选患者"

        return await suggest_contextual_prompts(
            prompt_type="tags",
            title="快速筛选",
            description=description,
            options=options,
            context="patient_list",
            priority="high"
        )

    except Exception as e:
        logger.error(f"Error generating patient filters: {str(e)}")
        return {"error": str(e)}


@contextual_prompt_tools.tool(
    name="suggest_case_search_hints",
    description="Generate case search suggestions based on current query. Use when user is searching cases and might need query refinement hints."
)
async def suggest_case_search_hints(
    current_query: Optional[str] = None,
    search_results_count: Optional[int] = None
) -> Dict[str, Any]:
    """
    Generate smart case search query suggestions

    Args:
        current_query: User's current search query
        search_results_count: Number of search results

    Returns:
        Contextual prompt with search refinement suggestions
    """
    try:
        if search_results_count == 0:
            # No results - suggest broader queries
            options = [
                {"label": "🔍 扩大搜索范围", "value": "broaden_search", "action": "suggest"},
                {"label": "📋 浏览全部病例", "value": "view_all", "action": "navigate"},
                {"label": "💡 智能推荐相似病例", "value": "ai_recommend", "action": "ai_search"},
            ]
            title = "未找到相关病例"
            description = "尝试调整搜索条件或查看推荐"

        elif search_results_count and search_results_count > 50:
            # Too many results - suggest narrowing down
            options = [
                {"label": "按疾病类型筛选", "value": "filter_by_disease", "action": "filter"},
                {"label": "按症状筛选", "value": "filter_by_symptom", "action": "filter"},
                {"label": "仅显示经典病例", "value": "classic_only", "action": "filter"},
                {"label": "按相关度排序", "value": "sort_relevance", "action": "sort"},
            ]
            title = "结果较多，精确筛选"
            description = f"找到 {search_results_count} 个病例，建议缩小范围"

        else:
            # Good results - suggest related actions
            options = [
                {"label": "📊 分析病例特征", "value": "analyze_patterns", "action": "analyze"},
                {"label": "📈 查看症状分布", "value": "symptom_distribution", "action": "visualize"},
                {"label": "🔖 保存搜索结果", "value": "save_search", "action": "save"},
                {"label": "💾 导出为报告", "value": "export_report", "action": "export"},
            ]
            title = "相关操作"
            description = f"找到 {search_results_count} 个相关病例"

        return await suggest_contextual_prompts(
            prompt_type="quick_actions",
            title=title,
            description=description,
            options=options,
            context="case_search",
            priority="medium"
        )

    except Exception as e:
        logger.error(f"Error generating case search hints: {str(e)}")
        return {"error": str(e)}


@contextual_prompt_tools.tool(
    name="suggest_next_steps",
    description="Predict user's next likely action and suggest it. Use after completing a task to guide workflow."
)
async def suggest_next_steps(
    completed_action: str,
    context_data: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Predict and suggest next steps in workflow

    Args:
        completed_action: The action user just completed (e.g., "view_patient_detail")
        context_data: Additional context (patient_id, case_id, etc.)

    Returns:
        Contextual prompt with next step suggestions
    """
    try:
        options = []
        title = "接下来您可以"

        if completed_action == "view_patient_detail":
            options = [
                {
                    "label": "📝 添加治疗记录",
                    "value": "add_treatment_record",
                    "icon": "Plus",
                    "description": "记录本次诊疗情况"
                },
                {
                    "label": "📊 查看检查结果",
                    "value": "view_lab_results",
                    "icon": "BarChart",
                    "description": "查看最新化验指标"
                },
                {
                    "label": "📅 安排随访",
                    "value": "schedule_followup",
                    "icon": "Calendar",
                    "description": "设置下次复查时间"
                },
                {
                    "label": "🔍 查找相似病例",
                    "value": "find_similar_cases",
                    "icon": "Search",
                    "description": "参考类似诊疗经验"
                },
            ]

        elif completed_action == "view_case_detail":
            options = [
                {
                    "label": "💾 收藏此病例",
                    "value": "favorite_case",
                    "icon": "Star",
                    "description": "保存到我的收藏"
                },
                {
                    "label": "🔍 查找类似病例",
                    "value": "find_similar",
                    "icon": "Search",
                    "description": "查看相似症状病例"
                },
                {
                    "label": "📋 复制诊疗方案",
                    "value": "copy_treatment",
                    "icon": "Copy",
                    "description": "应用到当前患者"
                },
                {
                    "label": "📊 对比分析",
                    "value": "compare_cases",
                    "icon": "GitCompare",
                    "description": "与其他病例对比"
                },
            ]

        elif completed_action == "search_knowledge":
            options = [
                {
                    "label": "📚 深入学习",
                    "value": "deep_dive",
                    "icon": "BookOpen",
                    "description": "查看完整文档"
                },
                {
                    "label": "🎯 相关主题",
                    "value": "related_topics",
                    "icon": "Network",
                    "description": "探索关联知识点"
                },
                {
                    "label": "✍️ 做笔记",
                    "value": "take_notes",
                    "icon": "Edit",
                    "description": "记录学习要点"
                },
                {
                    "label": "❓ 提问讨论",
                    "value": "ask_question",
                    "icon": "MessageCircle",
                    "description": "向AI提问"
                },
            ]

        elif completed_action == "analyze_metrics":
            options = [
                {
                    "label": "📈 查看趋势图",
                    "value": "view_trend_chart",
                    "icon": "TrendingUp",
                    "description": "可视化指标变化"
                },
                {
                    "label": "⚠️ 异常指标提醒",
                    "value": "alert_abnormal",
                    "icon": "AlertTriangle",
                    "description": "关注异常值"
                },
                {
                    "label": "💊 调整用药方案",
                    "value": "adjust_medication",
                    "icon": "Pill",
                    "description": "根据指标优化治疗"
                },
                {
                    "label": "📝 生成报告",
                    "value": "generate_report",
                    "icon": "FileText",
                    "description": "导出分析结果"
                },
            ]

        else:
            # Default suggestions
            options = [
                {"label": "🏠 返回首页", "value": "go_home", "icon": "Home"},
                {"label": "📋 查看任务列表", "value": "view_todos", "icon": "CheckSquare"},
                {"label": "🔔 查看通知", "value": "view_notifications", "icon": "Bell"},
            ]

        return await suggest_contextual_prompts(
            prompt_type="cards",
            title=title,
            description=None,
            options=options,
            context=f"after_{completed_action}",
            priority="high"
        )

    except Exception as e:
        logger.error(f"Error generating next steps: {str(e)}")
        return {"error": str(e)}


@contextual_prompt_tools.tool(
    name="suggest_smart_form",
    description="Generate smart form with pre-filled suggestions based on context. Use when user needs to input structured data."
)
async def suggest_smart_form(
    form_type: Literal["patient_intake", "treatment_record", "followup_schedule", "todo_create"],
    prefill_data: Optional[Dict[str, Any]] = None,
    context: Optional[str] = None
) -> Dict[str, Any]:
    """
    Generate smart form with contextual suggestions

    Args:
        form_type: Type of form to generate
        prefill_data: Data to pre-fill in the form
        context: Additional context

    Returns:
        Form structure with fields and suggestions
    """
    try:
        fields = []

        if form_type == "patient_intake":
            fields = [
                {"field": "name", "type": "text", "label": "患者姓名", "required": True},
                {"field": "gender", "type": "select", "label": "性别", "options": ["男", "女"], "required": True},
                {"field": "age", "type": "number", "label": "年龄", "required": True},
                {"field": "phone", "type": "tel", "label": "联系电话"},
                {"field": "diagnosis", "type": "text", "label": "初步诊断", "suggestions": ["类风湿关节炎", "系统性红斑狼疮", "强直性脊柱炎"]},
                {"field": "chief_complaint", "type": "textarea", "label": "主诉"},
            ]

        elif form_type == "treatment_record":
            fields = [
                {"field": "stage_date", "type": "date", "label": "诊疗日期", "required": True, "default": "today"},
                {"field": "stage_type", "type": "select", "label": "记录类型", "options": ["初诊", "检查", "确诊", "治疗", "随访"], "required": True},
                {"field": "stage_title", "type": "text", "label": "标题", "required": True},
                {"field": "diagnosis", "type": "text", "label": "诊断"},
                {"field": "doctor_notes", "type": "textarea", "label": "医生观察记录"},
                {"field": "pathology_findings", "type": "textarea", "label": "病理发现"},
                {"field": "patient_summary", "type": "textarea", "label": "患者友好解读"},
            ]

        elif form_type == "followup_schedule":
            fields = [
                {"field": "due_date", "type": "date", "label": "随访日期", "required": True},
                {"field": "todo_type", "type": "select", "label": "类型", "options": ["复查", "用药", "检查", "随访"], "required": True},
                {"field": "todo_title", "type": "text", "label": "任务标题", "required": True},
                {"field": "todo_description", "type": "textarea", "label": "详细说明"},
                {"field": "priority", "type": "select", "label": "优先级", "options": ["high", "medium", "low"], "default": "medium"},
            ]

        elif form_type == "todo_create":
            fields = [
                {"field": "todo_title", "type": "text", "label": "任务标题", "required": True},
                {"field": "todo_type", "type": "select", "label": "类型", "options": ["复查", "用药", "检查", "随访"], "required": True},
                {"field": "due_date", "type": "date", "label": "截止日期", "required": True},
                {"field": "priority", "type": "select", "label": "优先级", "options": ["high", "medium", "low"], "default": "medium"},
                {"field": "todo_description", "type": "textarea", "label": "任务描述"},
            ]

        # Apply prefill data
        if prefill_data:
            for field in fields:
                field_name = field["field"]
                if field_name in prefill_data:
                    field["value"] = prefill_data[field_name]

        return await suggest_contextual_prompts(
            prompt_type="form",
            title=f"填写{form_type}表单",
            description="AI已为您预填充部分字段，请确认或修改",
            options=fields,
            context=context or form_type,
            priority="high"
        )

    except Exception as e:
        logger.error(f"Error generating smart form: {str(e)}")
        return {"error": str(e)}
