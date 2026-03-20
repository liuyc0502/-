# 对话中的交互式确认卡片

## Context

当前智能体调用 MCP 工具（创建患者、生成待办、保存报告等）时直接保存到数据库，医生没有机会确认或修改。此功能在工具执行前拦截，在聊天流中嵌入交互式确认卡片，医生可以：确认保存、手动编辑后保存、或让智能体重新生成（可附带修改指令）。

**核心需求：** 所有写入操作（创建/更新/删除）在执行前需要医生确认，卡片内嵌在聊天流中，支持确认、编辑、重新生成三种操作。

------

## Architecture

```
Agent决定调用写入工具 → 工具包装器拦截 → 通过Observer发送tool_confirmation消息 →
agent线程阻塞等待 → 前端渲染确认卡片 → 医生操作 →
POST /api/agent/confirm/{id} → 后端唤醒线程 → 执行/跳过工具 → 继续agent流程
```

**拦截原理：** 在 MCP 工具外层包一层包装函数。包装函数被 smolagents 的 python_executor 调用时，不立即执行真正的工具，而是：

1. 通过 `observer.add_message()` 发送 `tool_confirmation` 类型的 SSE 消息（含工具名 + 参数）
2. 在 `threading.Event.wait(timeout=300)` 上阻塞 agent 线程
3. 前端收到 SSE 消息后渲染确认卡片
4. 医生操作后前端调用 `POST /api/agent/confirm/{id}`
5. 后端设置 `Event`，agent 线程被唤醒，根据医生的选择执行或跳过

**SSE 消息格式：**

```json
{
  "type": "tool_confirmation",
  "content": {
    "confirmation_id": "uuid",
    "tool_name": "create_new_patient",
    "tool_display_name": "创建患者",
    "parameters": {
      "name": "张三",
      "gender": "男",
      "age": 45,
      "medical_record_no": "MR-2026-001"
    },
    "parameter_schema": [
      {"key": "name", "label": "姓名", "type": "text", "required": true},
      {"key": "gender", "label": "性别", "type": "select", "options": ["男", "女"], "required": true},
      {"key": "age", "label": "年龄", "type": "number", "required": true}
    ]
  }
}
```

------

## Implementation Steps

### Phase 1: Backend - 确认管理基础设施

**Step 1:** 创建 `/opt/backend/services/confirmation_service.py`

- `ConfirmationRequest` dataclass：`confirmation_id`, `tool_name`, `parameters`, `event: threading.Event`, `result: dict`, `status`, `created_at`
- `ConfirmationManager` 单例类：
  - `pending: Dict[str, ConfirmationRequest]` 存储待确认请求
  - `create_confirmation(tool_name, parameters) → confirmation_id` 创建请求
  - `wait_for_confirmation(confirmation_id, timeout=300) → result` 阻塞等待
  - `resolve_confirmation(confirmation_id, action, parameters, instructions)` 设置结果并唤醒
  - `cleanup_expired()` 清理超时请求
- 全局实例 `confirmation_manager = ConfirmationManager()`

**Step 2:** 在 `/opt/sdk/nexent/core/utils/observer.py` 的 `ProcessType` 枚举中添加

```python
TOOL_CONFIRMATION = "tool_confirmation"  # interactive confirmation card for write operations
```

在 `MessageObserver._init_message_transformers()` 中添加对应的 `DefaultTransformer`

**Step 3:** 创建 `/opt/backend/apps/confirmation_app.py`

- Pydantic: `ConfirmationResponse(action: str, parameters: dict, instructions: str)`
- 端点：`POST /api/agent/confirm/{confirmation_id}`
  - `action`: `"confirm"` | `"regenerate"`
  - `parameters`: 编辑后的参数（confirm 时使用）
  - `instructions`: 重新生成时的修改指令
- 端点：`GET /api/agent/confirmations` 查询待确认列表（用于断线重连）
- 参考 `/opt/backend/apps/care_plan_app.py` 的模式

**Step 4:** 在 `/opt/backend/apps/base_app.py` 注册路由

- 添加 `from apps.confirmation_app import router as confirmation_router`
- 添加 `app.include_router(confirmation_router)`

### Phase 2: Backend - 工具包装器

**Step 5:** 创建 `/opt/backend/tool_collection/mcp/confirmable_wrapper.py`

- 定义 `CONFIRMABLE_TOOLS` 字典：映射工具名到显示名和参数 schema

  ```python
  CONFIRMABLE_TOOLS = {
      "create_new_patient": {
          "display_name": "创建患者",
          "schema": [
              {"key": "name", "label": "姓名", "type": "text", "required": True},
              {"key": "gender", "label": "性别", "type": "select", "options": ["男", "女"], "required": True},
              ...
          ]
      },
      "update_patient_info": { ... },
      "delete_patient_record": { ... },
      "create_patient_todo": { ... },
      "update_todo_status": { ... },
      "delete_patient_todo": { ... },
      # ... 其他写入工具
  }
  ```

- 函数 `wrap_confirmable_tool(original_tool, observer, confirmation_manager)`：

  1. 检查 tool_name 是否在 `CONFIRMABLE_TOOLS` 中
  2. 如果是，创建 `ConfirmationRequest`，通过 observer 发送 `tool_confirmation` 消息
  3. 调用 `confirmation_manager.wait_for_confirmation()`
  4. 根据结果：
     - `action="confirm"` → 用（可能修改过的）参数调用原始工具
     - `action="regenerate"` → 返回描述性字符串给 agent，如 `"医生要求重新生成，修改指令：{instructions}"`
     - 超时 → 返回 `"确认超时，操作未执行"`

**Step 6:** 修改 `/opt/sdk/nexent/core/agents/run_agent.py`

- 在 `agent_run_thread()` 中，创建 `NexentAgent` 时传入 `confirmation_manager`
- 在 `AgentRunInfo` 中新增 `confirmation_manager` 字段

**Step 7:** 修改 `/opt/sdk/nexent/core/agents/nexent_agent.py`

- 在 `create_single_agent()` 或 `create_tool()` 中，对写入工具应用包装器
- 将 `observer` 和 `confirmation_manager` 传递到工具包装层

### Phase 3: Frontend - 消息类型和 API

**Step 8:** 在 `/opt/frontend/const/chatConfig.ts` 的 `messageTypes` 中添加

```typescript
TOOL_CONFIRMATION: "tool_confirmation" as const,
```

在 `contentTypes` 中也添加相同项

**Step 9:** 在 `/opt/frontend/services/api.ts` 添加端点（agent block 内）

```typescript
confirmation: {
  confirm: (id: string) => `${API_BASE_URL}/agent/confirm/${id}`,
  list: `${API_BASE_URL}/agent/confirmations`,
},
```

**Step 10:** 在 `/opt/frontend/types/chat.ts` 扩展类型

- 添加 `ToolConfirmationData` 接口

  ```typescript
  interface ToolConfirmationData {
    confirmation_id: string
    tool_name: string
    tool_display_name: string
    parameters: Record<string, any>
    parameter_schema: ParameterFieldSchema[]
  }
  ```

- 添加 `ParameterFieldSchema` 接口：`key, label, type, required, options`

### Phase 4: Frontend - 流处理和确认卡片组件

**Step 11:** 修改 `/opt/frontend/app/[locale]/chat/streaming/chatStreamHandler.tsx`

- 在 SSE 消息类型 switch 中添加 `case chatConfig.messageTypes.TOOL_CONFIRMATION:`
- 解析 JSON content，创建 `StepContent` 类型为 `TOOL_CONFIRMATION`

**Step 12:** 创建 `/opt/frontend/app/chat/streaming/ConfirmationCard.tsx`

- Props: `data: ToolConfirmationData`, `onStatusChange: (status) => void`
- 状态：`pending` → `confirmed/editing/regenerating` → `completed/failed`
- 默认展示模式：只读字段列表 + 三个按钮
  - 确认按钮：调用 `POST /api/agent/confirm/{id}` with `action: "confirm"`
  - 编辑按钮：切换到表单编辑模式，显示可编辑字段
  - 重新生成按钮：展开文本输入框输入修改指令，然后调用 `action: "regenerate"`
- 编辑模式：根据 `parameter_schema` 渲染表单字段
  - `text` → Input
  - `number` → InputNumber
  - `select` → Select
  - `date` → DatePicker
  - `textarea` → Input.TextArea
  - `list` → 动态列表（用于 allergies 等数组字段）
- 完成后卡片变为灰色/禁用状态，显示结果状态
- 使用 shadcn Card + Ant Design Form 组件
- 样式参考现有 CARD 类型在 taskWindow 中的渲染

**Step 13:** 修改 `/opt/frontend/app/[locale]/chat/streaming/taskWindow.tsx`

- 在 `messageHandlers` 数组中添加 `TOOL_CONFIRMATION` 类型的处理器
- 渲染 `<ConfirmationCard>` 组件

## Critical Files

| File                                                         | Action                            |
| :----------------------------------------------------------- | :-------------------------------- |
| `/opt/backend/services/confirmation_service.py`              | 新建 - 确认管理器                 |
| `/opt/backend/apps/confirmation_app.py`                      | 新建 - REST 端点                  |
| `/opt/backend/apps/base_app.py`                              | 注册路由（2行修改）               |
| `/opt/backend/tool_collection/mcp/confirmable_wrapper.py`    | 新建 - 工具包装器 + 工具配置      |
| `/opt/sdk/nexent/core/utils/observer.py`                     | 添加 TOOL_CONFIRMATION 枚举       |
| `/opt/sdk/nexent/core/agents/run_agent.py`                   | 传递 confirmation_manager         |
| `/opt/sdk/nexent/core/agents/agent_model.py`                 | AgentRunInfo 新增字段             |
| `/opt/sdk/nexent/core/agents/nexent_agent.py`                | 工具创建时应用包装器              |
| `/opt/frontend/const/chatConfig.ts`                          | 添加 TOOL_CONFIRMATION 消息类型   |
| `/opt/frontend/services/api.ts`                              | 添加 confirmation 端点            |
| `/opt/frontend/types/chat.ts`                                | 添加 ToolConfirmationData 类型    |
| `/opt/frontend/app/[locale]/chat/streaming/chatStreamHandler.tsx` | 处理 tool_confirmation SSE 消息   |
| `/opt/frontend/components/chat/ConfirmationCard.tsx`         | 新建 - 确认卡片组件               |
| `/opt/frontend/app/[locale]/chat/streaming/taskWindow.tsx`   | 添加 TOOL_CONFIRMATION 渲染处理器 |
### Pattern References

- 后端服务模式：`/opt/backend/services/agent_service.py`（SSE 流 + agent 管理）
- 后端 REST 端点：`/opt/backend/apps/care_plan_app.py`（Pydantic + JSONResponse）
- Agent 线程模式：`/opt/sdk/nexent/core/agents/run_agent.py`（Thread + Observer）
- MCP 工具模式：`/opt/backend/tool_collection/mcp/doctor_patient_management_tools.py`
- 前端流处理：`/opt/frontend/app/[locale]/chat/streaming/chatStreamHandler.tsx`
- 前端卡片渲染：`/opt/frontend/app/[locale]/chat/streaming/taskWindow.tsx`（CARD 类型处理）
- Auth：`from utils.auth_utils import get_current_user_id`

------

## Verification

1. **后端确认服务测试**：

   ```bash
   # 启动后端后，手动测试确认端点
   # 先创建一个模拟确认请求（通过对话触发）
   # 然后调用确认接口
   curl -X POST http://localhost:5010/api/agent/confirm/{confirmation_id} \
     -H "Content-Type: application/json" \
     -d '{"action": "confirm", "parameters": {}, "instructions": ""}'
   ```

2. **端到端对话测试**：

   - 在聊天界面发送 "帮我创建一个患者，姓名张三，男，45岁"
   - 验证：智能体分析后，聊天流中出现确认卡片而非直接保存
   - 点击"确认" → 验证数据保存到数据库，卡片状态变为"已确认"
   - 再次测试，点击"编辑" → 修改年龄为50 → 保存 → 验证数据库中年龄为50
   - 再次测试，点击"重新生成" → 输入"加上过敏史：青霉素" → 验证智能体重新生成含过敏史的卡片

3. **超时测试**：

   - 触发确认卡片后等待5分钟不操作
   - 验证：agent 返回超时提示，卡片变为超时状态

4. **多工具测试**：

   - 发送 "帮我创建患者张三并添加一个复查的待办"
   - 验证：两个确认卡片依次出现（先创建患者，确认后再创建待办）