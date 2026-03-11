# Chat Templates / Quick Commands Feature

## Context

医生在聊天时频繁需要输入相似的提示词（录入报告、写出院小结、查待办等）。此功能允许医生：

1. 在配置页面创建带变量字段的对话模板
2. 在聊天界面通过快捷按钮或 `/命令` 触发模板
3. 填写参数表单后，自动生成完整 prompt 填入输入框

**核心需求：** 配置驱动、每个医生有私有模板、支持 `{{变量}}` 占位符替换。

------

## Architecture

```
用户点击/输入/ → 选择模板 → 参数表单弹窗 → 填写参数 → 替换{{变量}} → 填入输入框 → 发送
```

数据模型：

```json
{
  "template_name": "录入检验报告",
  "slash_command": "录入报告",
  "prompt_template": "请帮我录入{{patient_name}}的{{report_type}}报告",
  "fields": [
    {"key": "patient_name", "label": "患者姓名", "required": true, "type": "text"},
    {"key": "report_type", "label": "报告类型", "required": true, "type": "select", "options": ["血常规", "CT"]}
  ]
}
```

------

## Implementation Steps

### Phase 1: Database (Backend)

**Step 1:** 在 `/opt/backend/database/db_models.py` 末尾添加 `ChatTemplate` 模型

- 参考现有 `TableBase` 继承模式
- 表名：`chat_template_t`，schema：`nexent`
- 字段：`template_id`(PK, Sequence), `template_name`(String200), `slash_command`(String100), `prompt_template`(Text), `fields`(JSON), `sort_order`(Integer, default=0), `user_id`(String100), `tenant_id`(String100)
- 继承自 `TableBase` 自动获得：`create_time`, `update_time`, `created_by`, `updated_by`, `delete_flag`

**Step 2:** 创建迁移文件 `/opt/backend/database/migrations/create_chat_template_table.sql`

- 创建 sequence: `chat_template_t_template_id_seq`
- 创建表，索引：`(user_id, tenant_id)` 和 `(tenant_id, slash_command)` WHERE `delete_flag='N'`

**Step 3:** 创建迁移运行器 `/opt/backend/database/migrations/run_chat_template_migration.py`

- 参考现有 `run_care_plan_migration.py` 模式

### Phase 2: Backend CRUD

**Step 4:** 创建 `/opt/backend/database/chat_template_db.py`

- 函数：`list_templates(user_id, tenant_id)` - 按 sort_order+create_time 排序，过滤 delete_flag='Y'
- 函数：`create_template(data, user_id, tenant_id)` - 返回 `{"template_id": id}`
- 函数：`update_template(template_id, data, user_id, tenant_id)` - 校验所有权
- 函数：`soft_delete_template(template_id, user_id, tenant_id)` - 设置 delete_flag='Y'
- 全部使用 `get_db_session()` context manager，`as_dict()` 序列化

**Step 5:** 创建 `/opt/backend/services/chat_template_service.py`

- 薄包装层，参考 `care_plan_service.py`，委托 DB 层
- 在 create 中验证 `template_name`, `slash_command`, `prompt_template` 非空

**Step 6:** 创建 `/opt/backend/apps/chat_template_app.py`

- Pydantic: `FieldDefinition`, `CreateTemplateRequest`, `UpdateTemplateRequest`
- 端点：`GET /chat_template/list`, `POST /chat_template/create`, `PUT /chat_template/update/{id}`, `DELETE /chat_template/delete/{id}`
- 参考 `/opt/backend/apps/care_plan_app.py`：`get_current_user_id(authorization)`, `JSONResponse(status_code=HTTPStatus.OK, content=result)`
- `fields` 字段需在 endpoint 中调用 `.dict()` 后再传入 service

**Step 7:** 在 `/opt/backend/apps/base_app.py` 注册路由

- 在 line 23 附近添加：`from apps.chat_template_app import router as chat_template_router`
- 在 line 61（care_plan_router 下方）添加：`app.include_router(chat_template_router)`

### Phase 3: Frontend API Layer

**Step 8:** 在 `/opt/frontend/services/api.ts` 添加端点（carePlan block 之后）

```typescript
chatTemplate: {
  list: `${API_BASE_URL}/chat_template/list`,
  create: `${API_BASE_URL}/chat_template/create`,
  update: (id: number) => `${API_BASE_URL}/chat_template/update/${id}`,
  delete: (id: number) => `${API_BASE_URL}/chat_template/delete/${id}`,
},
```

**Step 9:** 创建 `/opt/frontend/services/chatTemplateService.ts`

- 导出 `ChatTemplate`, `FieldDefinition`, `CreateTemplateRequest`, `UpdateTemplateRequest` 类型
- 导出函数：`listTemplates()`, `createTemplate(req)`, `updateTemplate(id, req)`, `deleteTemplate(id)`
- 参考 `carePlanService.ts`：`getAuthHeaders()`，`log.error()`

### Phase 4: Frontend - Settings Management Page

**Step 10:** 在 `/opt/frontend/const/portalChatConfig.ts` 中添加新导航项

- 在 doctor portal navItems 中添加：`{ id: "templates", label: "快捷指令", icon: LayoutTemplate }`
- 更新 `PortalNavItemId` 类型（在 `/opt/frontend/types/chat.ts` 中）加入 `"templates"`

**Step 11:** 创建 `/opt/frontend/components/doctor/templates/TemplateListView.tsx`

- 组件遵循 `CaseLibraryView.tsx` 模式（同一目录层级）
- Ant Design `Table`：列含 名称、指令名(前缀/)、字段数、排序、操作(编辑/删除)
- Ant Design `Modal` + `Form` 创建/编辑：
  - template_name (Input, required)
  - slash_command (Input, required, 自动去除前导`/`)
  - prompt_template (TextArea, required, 提示 `{{变量}}` 语法)
  - sort_order (InputNumber)
  - fields: `Form.List` 动态行，每行含 key/label/type(Select)/required(Switch)/options(条件显示)
- Delete：`Popconfirm` + `deleteTemplate()` + 刷新列表
- 使用 `App.useApp()` 获取 `message`
- 组件 mount 时调用 `listTemplates()` 加载数据

**Step 11b:** 在 `/opt/frontend/app/[locale]/chat/internal/chatInterface.tsx` 中注册新视图

- 在 view 渲染条件块（lines ~1881-1925）中添加：

  ```tsx
  {activeView === "templates" && <TemplateListView />}
  ```

- 导入 `TemplateListView` 组件

### Phase 5: Frontend - Chat Integration

**Step 12:** 创建 `/opt/frontend/app/[locale]/chat/components/chatTemplateModal.tsx`

- Props: `template`, `visible`, `onClose`, `onSubmit(renderedPrompt: string)`
- Ant Design Modal + Form，按 `template.fields` 动态渲染字段
- 字段类型映射：`text→Input`, `textarea→Input.TextArea`, `date→DatePicker(→format YYYY-MM-DD)`, `select→Select`
- 提交时执行变量替换：`rendered.replaceAll('{{key}}', value)` 遍历所有字段
- 提交后关闭 modal 并 reset form

**Step 13:** 创建 `/opt/frontend/app/[locale]/chat/components/chatCommandPicker.tsx`

- Props: `templates`, `query`, `visible`, `onSelect`, `onClose`
- 绝对定位于输入框上方（`position: absolute; bottom: 100%`），不计算 caret 坐标
- 过滤：`slash_command.includes(query) || template_name.includes(query)` (不区分大小写)
- 键盘：ArrowUp/Down 选择，Enter 确认，Escape 关闭
- 点击外部关闭（`mousedown` listener on document）
- 样式：`bg-white border border-[#E8E2D6] rounded-lg shadow-lg`

**Step 14:** 修改 `/opt/frontend/app/[locale]/chat/components/chatInput.tsx`

- 新增 state：`templates`, `showCommandPicker`, `commandQuery`, `selectedTemplate`, `showTemplateModal`
- `useEffect` mount 时调用 `listTemplates().then(setTemplates)`
- `onChange` handler：检测 `/` 触发，更新 `commandQuery`，空格或删除过 `/` 则关闭 picker
- `handleKeyDown`：picker 可见时拦截方向键/Enter/Escape 传给 picker
- `handleTemplateSelect(template)`：清除输入框中的斜杠文本，打开 modal
- `handleTemplateModalSubmit(rendered)`：填入输入框，关闭 modal，聚焦 textarea
- 快捷按钮区：在 textarea 上方渲染 `templates.slice(0,8)` 的圆角 chip 按钮（横向滚动）
- JSX 末尾添加 `<ChatCommandPicker>` 和 `<ChatTemplateModal>`

### Phase 6: i18n（仅中文）

**Step 15:** 在 `/opt/frontend/public/locales/zh/common.json` 添加 `chatTemplate.*` 翻译键（无需英文）

------

## Critical Files

| File                                                         | Action                    |
| ------------------------------------------------------------ | ------------------------- |
| `/opt/backend/database/db_models.py`                         | 添加 ChatTemplate 模型    |
| `/opt/backend/database/migrations/create_chat_template_table.sql` | 新建                      |
| `/opt/backend/database/migrations/run_chat_template_migration.py` | 新建                      |
| `/opt/backend/database/chat_template_db.py`                  | 新建                      |
| `/opt/backend/services/chat_template_service.py`             | 新建                      |
| `/opt/backend/apps/chat_template_app.py`                     | 新建                      |
| `/opt/backend/apps/base_app.py`                              | 注册路由（2行修改）       |
| `/opt/frontend/services/api.ts`                              | 添加 chatTemplate 端点    |
| `/opt/frontend/services/chatTemplateService.ts`              | 新建                      |
| `/opt/frontend/components/doctor/templates/TemplateListView.tsx` | 新建                      |
| `/opt/frontend/app/[locale]/chat/components/chatTemplateModal.tsx` | 新建                      |
| `/opt/frontend/app/[locale]/chat/components/chatCommandPicker.tsx` | 新建                      |
| `/opt/frontend/app/[locale]/chat/components/chatInput.tsx`   | 修改（最复杂）            |
| `/opt/frontend/const/portalChatConfig.ts`                    | 添加 templates 导航项     |
| `/opt/frontend/types/chat.ts`                                | 更新 PortalNavItemId 类型 |
| `/opt/frontend/app/[locale]/chat/internal/chatInterface.tsx` | 注册 templates 视图渲染   |
| `/opt/frontend/public/locales/zh/common.json`                | 添加 i18n keys（仅中文）  |

### Pattern References

- 后端 CRUD 模式：`/opt/backend/apps/care_plan_app.py`
- 后端 DB 层：`/opt/backend/database/care_plan_db.py`（或 `memory_config_db.py`）
- 前端 API 服务：`/opt/frontend/services/carePlanService.ts`（如存在）或 `configService.ts`
- Auth：`from utils.auth_utils import get_current_user_id`
- Session：`from database.client import get_db_session, as_dict`

------

## Verification

1. **后端迁移**：`cd /opt/backend && python database/migrations/run_chat_template_migration.py`

   验证：PostgreSQL 中存在 `nexent.chat_template_t` 表

2. **后端 API 测试**（speed mode 无需 token）：

   ```bash
    # 创建
    curl -X POST http://localhost:5010/api/chat_template/create \
      -H "Content-Type: application/json" \
      -d '{"template_name":"录入检验报告","slash_command":"录入报告","prompt_template":"帮我录入{{patient_name}}的报告","fields":[{"key":"patient_name","label":"患者姓名","required":true,"type":"text"}]}'
    # 列表
    curl http://localhost:5010/api/chat_template/list
    # 更新（用创建返回的 template_id）
    curl -X PUT http://localhost:5010/api/chat_template/update/1 -H "Content-Type: application/json" -d '{"sort_order":1}'
    # 删除
    curl -X DELETE http://localhost:5010/api/chat_template/delete/1
    # 验证软删除：list 应不返回已删除项，DB 中 delete_flag='Y'
   ```

3. **前端配置页**：访问 `http://localhost:3000/zh/doctor`，点击侧边栏"快捷指令"导航项，验证视图切换到模板管理界面，创建模板后验证表格显示

4. **聊天集成**：

   - 验证快捷按钮区显示于输入框上方
   - 点击按钮 → 参数表单弹出 → 填写 → 提交 → prompt 填入输入框
   - 在输入框输入 `/` → 命令选择器出现 → 键入过滤文字 → Enter 选择 → 参数表单弹出

5. **i18n**：验证中文界面文字显示正确