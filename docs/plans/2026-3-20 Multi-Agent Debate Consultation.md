# 多智能体辩论会诊 (Multi-Agent Debate Consultation)

## Context

当前 Nexent 系统是单 Agent ReAct 循环，面对复杂的多学科问题（如病理报告需要结合影像、临床治疗来综合判断）时，单一 Agent 的知识深度和推理可靠性有限。本功能实现**多个专科 Agent 并行分析 → 多轮辩论 → 医生介入控制 → 形成共识结论**的会诊工作流，是系统从"单专家"到"专家团队"的质的飞跃。

已有的 ReasoningChainCard、ConfirmationCard、ReportCard 等组件直接复用为会诊展示的基础积木。

---

## 设计概要

### 触发方式

- **手动**：医生点击「发起会诊」按钮，选择参与的专科 Agent（已实现）
- **自动**：主 Agent 判断问题复杂度超过阈值时，输出 `<<<CONSULTATION_TRIGGER>>>` 标记（Phase 3）

### 辩论协议

1. **Round 1**：各专科 Agent 独立分析（并行执行）
2. **Round 2+**：每个 Agent 看到其他人的结论，可质疑/补充
3. **医生介入**：每轮结束后医生可选「继续辩论」（可附加指导语）或「形成结论」
4. **封顶轮次**：可配置，默认 5 轮

### 前端展示

- **会诊面板卡片**（ConsultationCard）：左侧多路并行推理进度（可折叠展开），右侧实时共识汇总（可折叠展开）
- **医生决策栏**：集成在聊天主输入框位置，会诊等待时自动替换普通输入框，包含指导意见输入 + 继续辩论/形成结论按钮
- **会诊报告卡片**（ConsultationReportCard）：最终结论展示，含共识点、分歧点、推荐方案

---

## 实现状态

### Phase 1: 后端核心 — 会诊编排引擎 ✅ 已完成

#### Step 1.1: 扩展 Observer ProcessType ✅

**文件**: `sdk/nexent/core/utils/observer.py`

新增 5 个 ProcessType 枚举值及对应 DefaultTransformer：

- `CONSULTATION_START` / `CONSULTATION_AGENT_STEP` / `CONSULTATION_AGENT_OPINION` / `CONSULTATION_ROUND_COMPLETE` / `CONSULTATION_WAITING_DOCTOR`

#### Step 1.2: ConsultationManager ✅

**文件**: `backend/services/consultation_service.py`

- `ConsultationSession` / `AgentOpinion` / `RoundResult` 数据类
- `ConsultationManager` 类：`create_session()` / `wait_for_doctor_decision()` / `resolve_decision()`
- 复用 ConfirmationManager 的 `threading.Event` 阻塞模式

#### Step 1.3: ConsultationOrchestrator ✅

**文件**: `backend/services/consultation_orchestrator.py`

核心编排逻辑：

1. emit CONSULTATION_START
2. 每轮：ThreadPoolExecutor 并行运行 N 个 CoreAgent → 收集结论 → emit ROUND_COMPLETE → WAITING_DOCTOR 阻塞
3. 医生 "continue" → 下一轮（含指导语）; "conclude" → 跳出
4. Coordinator Agent 综合所有轮次结果 → emit REPORT_CARD
5. emit FINAL_ANSWER

关键方法：`_run_specialist_round()` / `_run_single_specialist()` / `_execute_agent()` / `_build_round_prompt()` / `_parse_opinion()` / `_run_coordinator()`

#### Step 1.4: API 端点 ✅

**文件**: `backend/apps/consultation_app.py`


| 端点                                | 方法   | 说明                        |
| --------------------------------- | ---- | ------------------------- |
| `/agent/consultation/start`       | POST | 发起会诊，返回 SSE 流             |
| `/agent/consultation/{id}/decide` | POST | 医生介入决策（continue/conclude） |
| `/agent/consultation/{id}/status` | GET  | 查询会诊状态                    |
| `/agent/consultations`            | GET  | 列出活跃会诊                    |


#### Step 1.5: 路由注册 ✅

**文件**: `backend/apps/base_app.py` — 已注册 `consultation_router`

---

### Phase 2: 前端 — 会诊卡片 UI ✅ 已完成

#### Step 2.1: 类型定义 ✅

**文件**: `frontend/types/consultation.ts`

定义接口：`ConsultationStartData` / `ConsultationAgentStepData` / `ConsultationAgentOpinionData` / `ConsultationRoundCompleteData` / `ConsultationWaitingDoctorData` / `ConsultationReportData` / `ConsultationState`

#### Step 2.2: 流式处理集成 ✅

- `frontend/const/chatConfig.ts` — 5 个 consultation 消息类型 + `CONSULTATION` contentType
- `frontend/types/chat.ts` — `ChatMessageType.consultationData` 字段 + `ReportCardData` 联合类型扩展
- `frontend/app/[locale]/chat/streaming/chatStreamHandler.tsx` — switch 中 5 个 case 累积 consultationState

#### Step 2.3: 会诊面板卡片 ✅

**文件**: `frontend/app/[locale]/chat/streaming/ConsultationCard.tsx`

布局：上方标题栏（轮次指示）→ 左侧专家面板（推理步骤 + 意见 + 置信度条）→ 右侧共识汇总 → 底部医生控制按钮（继续辩论/附加指导/形成结论）

#### Step 2.4: 会诊报告卡片 ✅

- `frontend/app/[locale]/chat/streaming/ConsultationReportCard.tsx` — 置信度条 + 最终推荐 + 共识/分歧 + 可折叠专家意见
- `frontend/app/[locale]/chat/streaming/ReportCardFactory.tsx` — 路由 `consultation_report` case

#### Step 2.5: 触发入口 ✅

- `frontend/app/[locale]/chat/components/chatHeader.tsx` — 「发起会诊」按钮（仅医生端显示），移除了语言/记忆按钮
- `frontend/app/[locale]/chat/components/ConsultationStartModal.tsx` — 会诊问题输入 + Agent 多选（≥2 个）
- `frontend/services/api.ts` — consultation 端点
- `frontend/app/[locale]/chat/internal/chatInterface.tsx` — `handleStartConsultation` SSE 流处理 + Modal 状态管理 + ChatHeader prop 传递

#### Step 2.6: 渲染集成 ✅

- `frontend/app/[locale]/chat/streaming/chatStreamMain.tsx` — 当 `message.consultationData` 存在时渲染 `ConsultationCard`

---

### Phase 3: 数据库持久化 + 会诊记录管理 ✅ 已完成

#### Step 3.1: 数据库表 ✅

- `backend/database/migrations/create_consultation_record_table.sql` — `consultation_record_t` 表，含问题、状态、轮次、专家信息、结论、共识/分歧、置信度、关联对话/患者
- `backend/database/db_models.py` — `ConsultationRecord` SQLAlchemy 模型
- `backend/database/consultation_db.py` — CRUD 操作：`create_consultation_record` / `update_consultation_record` / `get_consultation_by_uuid` / `get_consultation_by_id` / `list_consultations` / `delete_consultation`

#### Step 3.2: 自动持久化 ✅

- `backend/services/consultation_orchestrator.py` — 会诊完成后自动调用 `create_consultation_record` 持久化到数据库，包含完整轮次结果和最终报告

#### Step 3.3: 历史 API ✅

- `GET /agent/consultation/history` — 分页查询会诊历史记录
- `GET /agent/consultation/history/{id}` — 查询单条会诊详情
- `DELETE /agent/consultation/history/{id}` — 软删除会诊记录

#### Step 3.4: 会诊记录页面 ✅

- `frontend/const/portalChatConfig.ts` — 医生端侧边栏新增「会诊记录」导航（`UsersRound` 图标）
- `frontend/components/doctor/consultations/ConsultationHistoryView.tsx` — 会诊记录列表页，卡片式网格布局，展示状态/置信度/专家/轮次/推荐方案预览，支持分页和删除
- `frontend/components/doctor/consultations/ConsultationDetailView.tsx` — 会诊详情页，展示问题、置信度条、最终推荐、共识/分歧、可折叠的逐轮辩论过程
- `frontend/app/[locale]/chat/internal/chatInterface.tsx` — 视图路由集成，列表 ↔ 详情切换
- `frontend/services/api.ts` — history/historyDetail/historyDelete 端点

---

### Phase 4: 专科智能体配置 ✅ 已完成

#### Step 4.1: 侧边栏导航 ✅

- `frontend/const/portalChatConfig.ts` — 医生端侧边栏新增「专科配置」导航（`Stethoscope` 图标），位于「会诊记录」之后

#### Step 4.2: 专科智能体配置页面 ✅

- `frontend/components/doctor/consultations/SpecialistAgentConfigView.tsx` — 专科智能体 CRUD 页面，复用现有 `/agent/*` API，无后端改动
  - 卡片网格列表，展示显示名称、专科方向、启用状态，支持 Switch 直接切换启用/禁用
  - 编辑 Modal：显示名称、专科方向（description）、职责提示词（duty_prompt）、启用开关、工具选择（Checkbox 列表）
  - 新建时调用 `getCreatingSubAgentId()` 创建空白 agent，初始化 `agent_role_category = "tool"`
  - 工具绑定通过 `fetchTools()` 获取全量列表 + `updateToolConfig()` diff 更新
- `frontend/app/[locale]/chat/internal/chatInterface.tsx` — 视图路由集成 `specialist-config`

#### Step 4.3: UI 风格统一 ✅

- `frontend/app/[locale]/chat/components/chatHeader.tsx` — 「发起会诊」按钮改为主题色 `#DA7756`
- `frontend/components/doctor/consultations/ConsultationHistoryView.tsx` — Header 统一为标准灰底风格
- `frontend/components/doctor/consultations/ConsultationDetailView.tsx` — Header 统一为标准灰底风格

---

### Phase 5: UI/UX 优化 (2026-3-20) ✅ 已完成

#### 5.1: 会诊卡片文字折叠展开 ✅

- `ConsultationCard.tsx` — 新增 `ExpandableText` 组件，替换 `line-clamp` 硬截断
- 思考步骤（2行）、结论（4行）、共识汇总（3行）均支持"展开全部/收起"

#### 5.2: 医生决策输入集成到主聊天输入框 ✅

- `ConsultationCard.tsx` — 移除底部的独立医生操控区域（输入框 + 按钮）
- `chatStreamMain.tsx` — 在底部 ChatInput 位置检测 `activeConsultation`（`waitingForDoctor && !isComplete`），显示会诊决策栏替代普通输入框
- 决策栏包含：指导意见输入框 + "继续辩论"按钮 + "形成结论"按钮，Enter 快捷键支持

#### 5.3: 会诊卡片渲染顺序修复 ✅

- `chatStreamMain.tsx` — `ConsultationCard` 移到 `ChatStreamFinalMessage` 之前渲染，确保先显示会诊过程卡片，再显示最终结论报告

#### 5.4: 医生决策超时延长 ✅

- `consultation_service.py` + `consultation_orchestrator.py` — `wait_for_doctor_decision` 超时从 300s 改为 3600s（1小时），避免医生思考时间不够导致自动结束

#### 5.5: 聊天 Header 精简 ✅

- `chatHeader.tsx` — 移除状态（ConversationStatus）、标签（TagsManager）、摘要（SummaryEditor）组件及品牌名显示，仅保留关联患者和关联时间线
- `chatInterface.tsx` — 移除对应 props 传递

#### 5.6: 流式消息过滤（防止 TaskWindow 文字交织） ✅

- `chatStreamHandler.tsx:128-136` — 会诊进行中过滤非 `consultation_` 前缀的消息，防止并行 specialist agent 的 MODEL_OUTPUT 混入 TaskWindow

---

### Phase 6: 增强功能（后续迭代）

- **自动触发检测**：与 REPORT_CARD 完全一致的模式 — 管理端 `duty_prompt` 配置触发指令，LLM 输出 `<<<CONSULTATION_TRIGGER>>>JSON<<<END_CONSULTATION_TRIGGER>>>` 标记，`nexent_agent.py` 新增 `_extract_and_emit_consultation_trigger()` 拦截并发出 `CONSULTATION_RECOMMENDATION` SSE 事件，前端渲染推荐卡片，医生确认后启动会诊
- **PDF 导出**：前端 `html2pdf.js` 方案，在 ConsultationReportCard 和 ConsultationDetailView 各添加导出按钮
- 详细设计见 [设计文档](2026-3-21%20Consultation%20trigger.md)

---

## SSE 消息协议


| ProcessType                            | content JSON                                                                                | 用途         |
| -------------------------------------- | ------------------------------------------------------------------------------------------- | ---------- |
| `consultation_start`                   | `{consultation_id, question, specialists: [{name, specialty}], max_rounds}`                 | 初始化会诊卡片    |
| `consultation_agent_step`              | `{consultation_id, agent_name, round, step, type: "thinking"|"tool_use"|"conclusion"}`      | 实时推理步骤     |
| `consultation_agent_opinion`           | `{consultation_id, agent_name, round, conclusion, confidence, agrees_with, disagrees_with}` | Agent 轮次结论 |
| `consultation_round_complete`          | `{consultation_id, round, summary, consensus_level: "full"|"partial"|"divergent"}`          | 轮次完成       |
| `consultation_waiting_doctor`          | `{consultation_id, round}`                                                                  | 显示医生操控按钮   |
| `consultation_report`（via REPORT_CARD） | 完整 ConsultationReportData                                                                   | 最终报告卡片     |
| `consultation_recommendation`            | `{specialties: ["专科1", "专科2"], reason: "触发原因"}`                                       | 自动触发推荐卡片 |


---

## 关键复用


| 已有组件                                           | 复用方式                                 |
| ---------------------------------------------- | ------------------------------------ |
| `ConfirmationManager` (threading.Event 模式)     | ConsultationManager 的阻塞等待机制          |
| `MessageObserver.add_message(agent_name, ...)` | 多 Agent 共享 observer，通过 agent_name 区分 |
| `NexentAgent.create_single_agent()`            | 为每个专科创建独立 CoreAgent                  |
| `ReportCardFactory` + REPORT_CARD ProcessType  | 最终会诊报告的渲染路由                          |
| `chatStreamHandler.tsx` switch 模式              | 新增 consultation 消息类型处理               |
| `ThreadPoolExecutor` (已在 run_agent.py 使用)      | 并行运行多个专科 Agent                       |
| `agentConfigService.ts` 全套 CRUD 函数             | 专科配置页面复用 fetchAgentList/updateAgent/deleteAgent 等 |
| `/agent/list?agent_role_category=tool`          | 专科配置页面和会诊 Modal 共用 tool 类型 agent 列表    |


---

## 验证方案

1. **后端单元测试**：ConsultationManager 的 create/wait/resolve 流程
2. **集成测试**：发起会诊 → 模拟2轮辩论 → 形成结论，验证 SSE 消息序列正确
3. **前端手动测试**：
  - 点击「发起会诊」→ 选择 Agent → 观察 ConsultationCard 实时渲染
  - 各 Agent 推理过程并行展示
  - 点击「继续辩论」→ 观察第二轮推理
  - 点击「形成结论」→ 观察 ConsultationReportCard 生成
4. **边界测试**：超时处理、单 Agent 会诊、最大轮次封顶

