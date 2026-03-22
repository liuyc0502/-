# Phase 6: 自动触发检测 + PDF 导出

## Context

多智能体辩论会诊系统已完成 Phase 1-5（核心编排、前端 UI、数据库持久化、专科配置、UX 优化、CWEC/ADS 算法）。Phase 6 新增两个增强功能：

1. **自动触发检测**：主 Agent 判断问题复杂度后输出标记，前端展示推荐卡片，医生确认后启动会诊
2. **PDF 导出**：会诊报告可从 ConsultationReportCard 和 ConsultationDetailView 导出为 PDF

两个功能相互独立，可并行实现。

------

## Feature 1: 自动触发检测

### 设计原则

**与 REPORT_CARD 完全一致的模式**：

报告解读卡片（REPORT_CARD）的触发方式是：
1. 在管理端配置 agent 的 `duty_prompt`，指示 LLM 输出 `<<<REPORT_CARD>>>JSON<<<END_REPORT_CARD>>>` 标记
2. `nexent_agent.py` 的 `_extract_and_emit_report_cards()` 在 `final_answer` 发送前拦截标记
3. 解析 JSON、剥离标记文本、通过 `observer.add_message(ProcessType.REPORT_CARD, data)` 发出 SSE 事件

会诊触发采用**完全相同的模式**：
1. 在管理端配置 agent 的 `duty_prompt`，指示 LLM 输出 `<<<CONSULTATION_TRIGGER>>>JSON<<<END_CONSULTATION_TRIGGER>>>` 标记
2. `nexent_agent.py` 新增 `_extract_and_emit_consultation_trigger()` 在 `final_answer` 发送前拦截标记
3. 解析 JSON、剥离标记文本、通过 `observer.add_message(ProcessType.CONSULTATION_RECOMMENDATION, data)` 发出 SSE 事件

### 数据流

```
管理端配置 duty_prompt 含会诊触发指令
  → LLM 输出含 <<<CONSULTATION_TRIGGER>>>JSON<<<END_CONSULTATION_TRIGGER>>>
  → nexent_agent.py interaction() 中 _extract_and_emit_consultation_trigger() 拦截
  → 剥离标记，解析 JSON
  → observer.add_message("", ProcessType.CONSULTATION_RECOMMENDATION, json_data)
  → SSE {type: "consultation_recommendation", content: {specialties, reason}}
  → chatStreamHandler.tsx 存储到 message.consultationRecommendation
  → chatStreamFinalMessage.tsx 渲染 ConsultationTriggerCard
  → 医生确认 → handleStartConsultation()
```

### Step 1.1: 添加 ProcessType 枚举值

**文件**: `sdk/nexent/core/utils/observer.py`

- 在 `ProcessType` 枚举中添加 `CONSULTATION_RECOMMENDATION = "consultation_recommendation"`
- 在 `_init_message_transformers` 中为其添加 `default_transformer`

### Step 1.2: nexent_agent.py 标记检测（核心）

**文件**: `sdk/nexent/core/agents/nexent_agent.py`

在 `interaction()` 方法中，`_extract_and_emit_report_cards` 调用之后、`FINAL_ANSWER` 发送之前，新增 `_extract_and_emit_consultation_trigger()` 调用：

```python
# 现有代码
final_answer_str = self._extract_and_emit_report_cards(final_answer_str, observer)
# 新增
final_answer_str = self._extract_and_emit_consultation_trigger(final_answer_str, observer)

observer.add_message(self.agent.agent_name, ProcessType.FINAL_ANSWER, final_answer_str)
```

**`_extract_and_emit_consultation_trigger` 静态方法**：

- 正则：`<<<CONSULTATION_TRIGGER>>>\s*(.*?)\s*<<<END_CONSULTATION_TRIGGER>>>` (re.DOTALL)
- 解析标记内的 JSON：`{"specialties": ["专科1", "专科2"], "reason": "触发原因"}`
- 通过 `observer.add_message("", ProcessType.CONSULTATION_RECOMMENDATION, json_data)` 发出事件
- 从原文中剥离标记块，返回清理后的文本
- 模式与 `_extract_and_emit_report_cards` 完全一致

**标记格式（LLM 输出）**：

```
<<<CONSULTATION_TRIGGER>>>
{"specialties": ["病理科", "影像科", "肿瘤内科"], "reason": "该病例涉及多学科交叉，需要病理、影像和肿瘤内科协同分析"}
<<<END_CONSULTATION_TRIGGER>>>
```

**SSE 事件**：`{"type": "consultation_recommendation", "content": "{\"specialties\": [...], \"reason\": \"...\"}"}`

**边界情况**：

- 多个标记：只处理第一个
- 标记后还有文本：剥离标记后剩余文本正常作为 FINAL_ANSWER 输出
- 无标记：不影响现有逻辑

### Step 1.3: 前端类型定义与消息类型

**文件**: `frontend/const/chatConfig.ts`

- `messageTypes` 中添加 `CONSULTATION_RECOMMENDATION: "consultation_recommendation" as const`
- `contentTypes` 中添加 `CONSULTATION_RECOMMENDATION: "consultation_recommendation" as const`

**文件**: `frontend/types/chat.ts`

- `ChatMessageType` 接口添加：

```ts
consultationRecommendation?: {
  specialties: string[]
  reason: string
  resolved: boolean  // 医生确认或忽略后设为 true
}
```

### Step 1.4: 流式处理 handler

**文件**: `frontend/app/[locale]/chat/streaming/chatStreamHandler.tsx`

在 switch 中添加 `case chatConfig.messageTypes.CONSULTATION_RECOMMENDATION`：

- 解析 `content` 为 `{specialties, reason}`
- 设置 `currentMessage.consultationRecommendation = { specialties, reason, resolved: false }`
- 参考 `REPORT_CARD` case 的模式（消息级数据）

### Step 1.5: ConsultationTriggerCard 组件

**新建文件**: `frontend/app/[locale]/chat/streaming/ConsultationTriggerCard.tsx`

**Props**:

```ts
interface ConsultationTriggerCardProps {
  specialties: string[]
  reason: string
  resolved: boolean
  onConfirm: (question: string, agentIds: number[]) => void
  onDismiss: () => void
}
```

**行为**：

1. 挂载时调用 `GET /agent/list?agent_role_category=tool` 获取可用专科 Agent
2. 将推荐专科名与 Agent `display_name`/`description` 模糊匹配，预选匹配到的 Agent
3. 未匹配的专科显示警告文字

**UI 布局**：

- 顶部：推荐图标 + "AI 建议发起多专科会诊" 标题
- 触发原因文本
- 专科 Agent 复选框列表（匹配的预选，可调整）
- 底部按钮："开始会诊" + "忽略"
- `resolved === true` 时渲染折叠状态（"已发起会诊" / "已忽略"）

**风格**：与 ConfirmationCard 类似的卡片风格，主题色 `#DA7756`

### Step 1.6: 渲染集成

**文件**: `frontend/app/[locale]/chat/streaming/chatStreamFinalMessage.tsx`

在 assistant 消息渲染区域（reportCards 之后、MarkdownRenderer 之前），添加：

- 当 `message.consultationRecommendation` 存在时渲染 `<ConsultationTriggerCard>`
- `onConfirm` 回调：标记 `resolved = true`，调用 `handleStartConsultation(question, agentIds)`
- `onDismiss` 回调：标记 `resolved = true`

**文件**: `frontend/app/[locale]/chat/streaming/chatStreamMain.tsx`

- 将 `handleStartConsultation` 通过 props 传递到 `chatStreamFinalMessage`（如果尚未传递）

------

## Feature 2: PDF 导出

### 方案：前端 html2pdf.js

选择前端方案的原因：

- 零后端改动，复用现有 DOM 渲染
- `html2pdf.js` = `html2canvas` + `jsPDF` 封装，~150KB
- 支持 Tailwind CSS（读取 computed styles）
- 中文字体由页面已加载的阿里巴巴健康字体支持

### Step 2.1: 安装依赖

```bash
cd frontend && npm install html2pdf.js
```

### Step 2.2: 导出工具函数

**新建文件**: `frontend/lib/exportPdf.ts`

```ts
export async function exportToPdf(
  element: HTMLElement,
  filename: string
): Promise<void>
```

- 动态 import `html2pdf.js`（避免 SSR 问题）
- 配置：A4、portrait、margin 10mm、scale 2（retina）、`useCORS: true`
- 页面分割：`pagebreak: { mode: ['avoid-all', 'css'] }`
- 调用 `html2pdf().set(opts).from(element).save()`

### Step 2.3: ConsultationReportCard 添加导出按钮

**文件**: `frontend/app/[locale]/chat/streaming/ConsultationReportCard.tsx`

- 添加 `useRef<HTMLDivElement>(null)` 包裹报告内容区域（不含导出按钮本身）
- 在 header 区域添加 "导出 PDF" 按钮（`Download` icon from lucide-react）
- 添加 `isExporting` loading 状态
- 点击时调用 `exportToPdf(ref.current, '会诊报告_${consultation_id}_${date}.pdf')`

### Step 2.4: ConsultationDetailView 添加导出按钮

**文件**: `frontend/components/doctor/consultations/ConsultationDetailView.tsx`

- 同样的模式：`useRef` + 导出按钮 + loading 状态
- 按钮位于 header 返回按钮旁边
- 文件名：`会诊详情_${consultation_id}_${date}.pdf`

### Step 2.5: SVG 兼容性检查

- 确认 `ConsultationReportCard` 中的 `ConvergenceChart` SVG 不使用 `<foreignObject>`
- 确认 SVG `<text>` 元素有内联 `font-family`（html2canvas 要求）
- 如发现问题，修复为纯 SVG 渲染

------

## 实现顺序

```
Phase 6A — 共享基础（先做）
  Step 1.1: ProcessType 枚举
  Step 1.3: 前端类型定义与消息类型
  Step 2.1: 安装 html2pdf.js

Phase 6B — SDK 层标记检测
  Step 1.2: nexent_agent.py 新增 _extract_and_emit_consultation_trigger()

Phase 6C — 前端触发卡片
  Step 1.4: 流式 handler
  Step 1.5: ConsultationTriggerCard 组件
  Step 1.6: 渲染集成

Phase 6D — PDF 导出（独立）
  Step 2.2: 导出工具函数
  Step 2.3: ReportCard 导出按钮
  Step 2.4: DetailView 导出按钮
  Step 2.5: SVG 兼容性
```

**注意**：会诊触发的系统提示词通过管理端 UI 配置 agent 的 `duty_prompt`，与报告解读卡片方式一致，不涉及代码改动。

------

## 关键复用

| 已有组件/模式                                                          | 复用方式                                                              |
| :--------------------------------------------------------------------- | :-------------------------------------------------------------------- |
| `_extract_and_emit_report_cards()` in nexent_agent.py                  | 会诊触发完全复制此模式：标记检测 → JSON 解析 → observer.add_message   |
| `<<<REPORT_CARD>>>...<<<END_REPORT_CARD>>>` 标记格式                   | 使用相同的 `<<<XXX>>>...<<<END_XXX>>>` 标记约定                       |
| 管理端 `duty_prompt` 配置                                               | 会诊触发指令通过管理端配置，与报告解读指令方式一致                    |
| `REPORT_CARD` 消息级存储 + `reportCards` 数组 + ReportCardFactory 渲染 | `consultationRecommendation` 采用相同的消息级数据模式                 |
| `handleStartConsultation()` in chatInterface.tsx:1685                  | TriggerCard 确认后直接调用                                            |
| `API_ENDPOINTS.agent.list`                                             | TriggerCard 获取可选 Agent 列表                                       |
| `ConfirmationCard` 卡片风格                                            | TriggerCard UI 参考                                                   |

## 关键文件清单

| 文件                                                                  | 操作                                                                   |
| :-------------------------------------------------------------------- | :--------------------------------------------------------------------- |
| `sdk/nexent/core/utils/observer.py`                                   | 修改 — 添加 CONSULTATION_RECOMMENDATION ProcessType                    |
| `sdk/nexent/core/agents/nexent_agent.py`                              | 修改 — 新增 `_extract_and_emit_consultation_trigger()` + interaction 集成 |
| `frontend/const/chatConfig.ts`                                        | 修改 — 添加 messageType/contentType                                    |
| `frontend/types/chat.ts`                                              | 修改 — ChatMessageType 扩展                                            |
| `frontend/app/[locale]/chat/streaming/chatStreamHandler.tsx`          | 修改 — 添加 handler case                                               |
| `frontend/app/[locale]/chat/streaming/ConsultationTriggerCard.tsx`    | **新建**                                                                |
| `frontend/app/[locale]/chat/streaming/chatStreamFinalMessage.tsx`     | 修改 — 渲染 TriggerCard                                                |
| `frontend/lib/exportPdf.ts`                                           | **新建**                                                                |
| `frontend/app/[locale]/chat/streaming/ConsultationReportCard.tsx`     | 修改 — 添加导出按钮                                                    |
| `frontend/components/doctor/consultations/ConsultationDetailView.tsx` | 修改 — 添加导出按钮                                                    |

------

## 验证方案

### Feature 1 验证

1. 手动在 agent duty_prompt 中写入测试问题，触发 LLM 输出 `<<<CONSULTATION_TRIGGER...>>>` 标记
2. 确认：标记从最终回答中被剥离，不显示给用户
3. 确认：ConsultationTriggerCard 出现，显示推荐专科和原因
4. 确认：预选的 Agent 与推荐专科匹配
5. 确认：点击"开始会诊"成功启动会诊流程
6. 确认：点击"忽略"折叠卡片，不再显示交互控件
7. 边界测试：无匹配 Agent、患者端不触发

### Feature 2 验证

1. 在 ConsultationReportCard 点击"导出 PDF"，确认下载正确
2. 在 ConsultationDetailView 点击"导出 PDF"，确认多页 PDF 正确
3. 确认中文文字、SVG 图表、置信度条在 PDF 中正确渲染
4. 在 Chrome/Firefox 中测试