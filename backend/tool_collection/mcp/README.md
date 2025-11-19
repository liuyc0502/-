# Medical AI Agent Tools - MCP Format

This directory contains **25 specialized tools** for medical AI agents, designed specifically for pathology knowledge Q&A and patient management.

## 📦 Tool Categories

### 1. Patient Management Tools (`patient_management_tools.py`)

**6 tools for managing patient records and medical data:**

| Tool Name | Description | Use Case |
|-----------|-------------|----------|
| `get_patient_basic_info` | Get patient demographics and diagnosis summary | "这个患者的基本情况是什么？" |
| `get_patient_timeline` | Get complete diagnostic timeline | "患者的诊断时间线是怎样的？" |
| `get_patient_medical_images` | Get pathology slides, CT scans, X-rays, etc. | "调取患者的病理切片影像" |
| `analyze_patient_metrics` | Analyze lab results and metric trends | "分析患者的血常规指标趋势" |
| `get_patient_todos` | Get pending tasks and examinations | "这个患者还有哪些未完成的检查？" |
| `get_patient_examination_reports` | Get examination reports with AI interpretations | "患者最新的病理报告结果是什么？" |

---

### 2. Case Library Tools (`case_library_tools.py`)

**6 tools for searching and analyzing medical cases:**

| Tool Name | Description | Use Case |
|-----------|-------------|----------|
| `search_medical_cases` | Intelligent case search with NLP | "查找肺腺癌伴淋巴结转移的病例" |
| `get_case_detail` | Get complete case information | "显示病例#2024001的完整信息" |
| `search_cases_by_symptoms` | Search cases by symptom combinations | "查找同时有咳嗽、胸痛症状的病例" |
| `get_similar_cases` | Get similar case recommendations | "给我推荐与这个患者相似的病例" |
| `get_classic_cases_by_disease` | Get classic teaching cases | "肺鳞癌有哪些经典病例？" |
| `analyze_case_trends` | Analyze epidemiological trends | "过去一年肺癌病例的发病趋势" |

---

### 3. Knowledge Base Tools (`knowledge_base_tools.py`)

**5 tools for medical knowledge retrieval:**

| Tool Name | Description | Use Case |
|-----------|-------------|----------|
| `search_knowledge` | Semantic search in knowledge base | "肺腺癌的诊断标准是什么？" |
| `get_knowledge_by_category` | Browse knowledge by category | "显示所有诊断标准相关的知识" |
| `get_learning_recommendations` | Personalized learning recommendations | "推荐我应该学习的病理知识" |
| `search_diagnosis_guidelines` | Search clinical guidelines | "肺癌的分期标准是什么？" |
| `get_knowledge_document` | Get full document content | "显示这份诊断指南的完整内容" |

---

### 4. Care Plan Tools (`care_plan_tools.py`)

**4 tools for rehabilitation and care planning:**

| Tool Name | Description | Use Case |
|-----------|-------------|----------|
| `create_care_plan` | Create rehabilitation plan | "为患者创建术后康复计划" |
| `get_patient_care_plans` | Get all care plans for patient | "患者当前的康复计划有哪些？" |
| `update_care_plan_progress` | Update plan execution progress | "记录患者今天的用药情况" |
| `generate_care_plan_suggestions` | AI-powered plan suggestions | "根据患者情况生成术后康复建议" |

---

### 5. Diagnostic Assistance Tools (`diagnostic_assistance_tools.py`)

**3 tools for diagnostic support:**

| Tool Name | Description | Use Case |
|-----------|-------------|----------|
| `differential_diagnosis` | Generate differential diagnosis list | "根据这些症状可能是什么疾病？" |
| `suggest_next_tests` | Recommend next diagnostic tests | "为了确诊还需要做什么检查？" |
| `risk_assessment` | Assess patient risk and prognosis | "评估患者的预后和风险因素" |

---

## 🚀 Quick Start

### 1. Import and Register Tools

```python
from tool_collection.mcp.patient_management_tools import patient_tools
from tool_collection.mcp.case_library_tools import case_tools
from tool_collection.mcp.knowledge_base_tools import knowledge_tools
from tool_collection.mcp.care_plan_tools import care_plan_tools
from tool_collection.mcp.diagnostic_assistance_tools import diagnostic_tools

# All MCP servers are ready to use
# Each module exports a FastMCP server instance
```

### 2. Scan and Register Tools in Database

```python
from services.tool_configuration_service import update_tool_list

# This will scan all MCP tools and register them in the database
await update_tool_list(tenant_id="your_tenant_id", user_id="admin")
```

### 3. Assign Tools to Agents

Via Admin Portal:
1. Navigate to **Agent Configuration** → **Tool Assignment**
2. Select your doctor portal main agent
3. Drag tools from the tool library to assign them
4. Click **Save**

Via API:
```python
from services.tool_configuration_service import update_tool_info_impl

# Enable a tool for an agent
await update_tool_info_impl(
    request={
        "agent_id": 1,
        "tool_id": 123,
        "enabled": True,
        "params": {}
    },
    tenant_id="your_tenant_id",
    user_id="admin"
)
```

---

## 💡 Usage Examples

### Example 1: Patient Information Query

**User Question (Doctor):**
> "患者张三的基本情况和最近的检查报告是什么？"

**Agent Execution:**
```python
# Tool 1: Get patient basic info
patient_info = await get_patient_basic_info(
    patient_id=1,
    tenant_id="tenant_123",
    include_summary=True
)

# Tool 2: Get examination reports
reports = await get_patient_examination_reports_tool(
    patient_id=1,
    tenant_id="tenant_123",
    status="已解读",
    limit=5
)

# Agent response:
# "患者张三，男性，65岁，病案号MR20240001。主要诊断为肺腺癌T2N1M0（II期）。
# 最近的检查报告包括：
# 1. 2024-11-15 病理报告：肺腺癌，中分化...
# 2. 2024-11-10 血液检查：白细胞8.5×10⁹/L，正常范围..."
```

### Example 2: Case Similarity Search

**User Question:**
> "查找与当前患者情况相似的病例，参考治疗方案"

**Agent Execution:**
```python
# Tool: Get similar cases based on patient
similar_cases = await get_similar_cases_tool(
    patient_id=1,
    tenant_id="tenant_123",
    similarity_threshold=0.7,
    limit=5
)

# Agent response with similar case recommendations and differential diagnosis
```

### Example 3: Differential Diagnosis

**User Question:**
> "患者有咳嗽、胸痛、咯血症状，年龄60岁，男性，可能是什么疾病？"

**Agent Execution:**
```python
# Tool: Differential diagnosis
diagnosis_suggestions = await differential_diagnosis_tool(
    symptoms=["咳嗽", "胸痛", "咯血"],
    tenant_id="tenant_123",
    patient_demographics={"age": 60, "gender": "male"}
)

# Agent response with top 5 differential diagnoses, probability scores, and recommended tests
```

### Example 4: Create Care Plan

**User Question:**
> "为患者创建一个术后康复计划，包括用药和康复训练"

**Agent Execution:**
```python
# Tool 1: Generate care plan suggestions
suggestions = await generate_care_plan_suggestions_tool(
    patient_id=1,
    tenant_id="tenant_123",
    diagnosis="肺腺癌",
    treatment_stage="post-surgery"
)

# Tool 2: Create care plan with suggested medications and tasks
plan = await create_care_plan_tool(
    patient_id=1,
    tenant_id="tenant_123",
    user_id="doctor_001",
    plan_name="术后康复计划",
    plan_description="肺腺癌术后2周康复方案",
    start_date="2024-11-20",
    duration_days=14,
    medications=suggestions['medication_suggestions'],
    tasks=suggestions['task_suggestions'],
    precautions=suggestions['precautions']
)

# Agent response with created care plan summary
```

---

## 🔧 Tool Configuration

### Required Parameters

All tools require these standard parameters:
- `tenant_id` (str): Tenant ID for data isolation
- `user_id` (str): User ID for audit trail (where applicable)

### Authentication

Tools use the existing authentication system:
```python
from utils.auth_utils import get_current_user_id

user_id, tenant_id = get_current_user_id(authorization_header)
```

### Error Handling

All tools return error information in a consistent format:
```python
{
    "error": "Error description",
    "details": "Additional context"
}
```

---

## 📊 Tool Integration with Agents

### Portal Main Agent Configuration

For **Doctor Portal Main Agent**, recommended tool assignment:

**Essential Tools (High Priority):**
- `get_patient_basic_info`
- `get_patient_timeline`
- `get_patient_examination_reports`
- `search_medical_cases`
- `get_case_detail`
- `search_knowledge`
- `differential_diagnosis`

**Recommended Tools (Medium Priority):**
- `analyze_patient_metrics`
- `get_patient_medical_images`
- `search_cases_by_symptoms`
- `get_similar_cases`
- `search_diagnosis_guidelines`
- `suggest_next_tests`
- `create_care_plan`

**Optional Tools (Low Priority):**
- `get_patient_todos`
- `get_knowledge_by_category`
- `get_learning_recommendations`
- `analyze_case_trends`
- `get_classic_cases_by_disease`
- `generate_care_plan_suggestions`
- `update_care_plan_progress`
- `risk_assessment`

---

## 🧪 Testing Tools

### Manual Testing

Use the tool validation endpoint:
```bash
POST /tool/validate
{
    "tool_id": 123,
    "test_params": {
        "patient_id": 1,
        "tenant_id": "test_tenant"
    }
}
```

### Unit Testing

```python
import pytest
from tool_collection.mcp.patient_management_tools import get_patient_basic_info

@pytest.mark.asyncio
async def test_get_patient_info():
    result = await get_patient_basic_info(
        patient_id=1,
        tenant_id="test_tenant",
        include_summary=True
    )
    assert "patient_id" in result
    assert result["patient_id"] == 1
```

---

## 📝 Adding New Tools

### Step 1: Create Tool Function

```python
from fastmcp import FastMCP

your_tools = FastMCP("your_tool_category")

@your_tools.tool(
    name="your_tool_name",
    description="Clear description for AI agent to understand when to use this tool"
)
async def your_tool_function(
    required_param: str,
    optional_param: Optional[str] = None
) -> Dict[str, Any]:
    """
    Tool implementation

    Args:
        required_param: Description
        optional_param: Description

    Returns:
        Result dictionary
    """
    try:
        # Your logic here
        result = {"success": True, "data": "..."}
        return result
    except Exception as e:
        logger.error(f"Error: {str(e)}")
        return {"error": str(e)}
```

### Step 2: Register in Database

Run tool scan to auto-register:
```bash
GET /tool/scan_tool
```

### Step 3: Assign to Agent

Use admin portal or API to assign the new tool to agents.

---

## 🎯 Best Practices

### 1. Tool Description
- Write clear, concise descriptions
- Include Chinese use case examples
- Specify when the tool should be used

### 2. Parameter Design
- Required parameters should be minimal
- Use Optional for advanced features
- Provide sensible defaults

### 3. Return Format
- Always return Dict[str, Any]
- Include error information on failure
- Use consistent field names

### 4. Performance
- Limit database queries
- Use pagination for large datasets
- Cache frequently accessed data

### 5. Security
- Always validate tenant_id
- Check user permissions
- Sanitize inputs

---

## 📚 Additional Resources

- [MCP Ecosystem Overview](https://modelengine-group.github.io/nexent/zh/mcp-ecosystem/overview.html)
- [Agent Configuration Guide](https://modelengine-group.github.io/nexent/zh/setup/agents.html)
- [Tool Development Guidelines](https://modelengine-group.github.io/nexent/zh/contributing/tools.html)

---

## 🆘 Troubleshooting

### Tool Not Showing in Admin Portal
- Run `/tool/scan_tool` to refresh tool list
- Check `is_available` flag in `ag_tool_info_t` table
- Verify tool name follows naming convention (alphanumeric + underscore only)

### Tool Execution Fails
- Check logs for detailed error messages
- Verify all required services are running
- Ensure database connections are active
- Validate input parameters

### Permission Issues
- Verify tenant_id and user_id are correct
- Check portal agent assignments
- Ensure tool is enabled for the agent

---

**Last Updated:** November 2025
**Maintained by:** ModelEngine Group
**License:** MIT with additional conditions
