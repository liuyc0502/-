# 症状自报 + 智能导诊

## Context

当前患者端只有对话、个人档案和康复计划三个功能。患者就诊前往往不知道该挂什么科、该如何描述自己的症状，导致：

1. **信息表达不充分**：患者在就诊时描述症状不完整，遗漏关键信息（持续时长、伴随症状等）
2. **就诊方向不清**：患者不知道该看什么科室，可能挂错号、走弯路
3. **没有症状记录**：症状随时间变化，患者容易忘记之前的状况

此功能让 AI 引导患者完成症状采集，最终生成两样东西：
- **结构化症状摘要卡片**：整理好的症状信息，可带去就诊
- **智能导诊建议**：推荐科室 + 严重程度 + 紧急度 + 就诊前准备

**核心需求：** 患者通过侧边栏独立页面或聊天快捷指令发起症状自报，AI 通过结构化表单采集基础信息 + 对话追问补充细节，最终生成症状摘要+导诊建议卡片，数据写入患者时间线并在侧边栏展示历史记录。

------

## Architecture

```
入口1: 侧边栏「症状自报」页面 → 结构化表单（部位选择、症状特征、时长等）→ 提交到对话 →
入口2: 聊天快捷指令 /symptom → AI 直接开始引导式提问 →

→ AI 基于表单数据/对话内容追问补充 → 信息充分后 AI 输出结构化 JSON →
→ 后端检测到结构化输出 → 通过 Observer 发送 symptom_card 类型的 SSE 消息 →
→ 前端渲染症状摘要卡片 + 导诊建议卡片 →
→ 同时调用 MCP 工具将症状报告写入患者时间线
```

**两个入口的关系：**
- 侧边栏页面提供结构化表单（身体部位选择、症状特征多选、持续时长等），填完后自动创建新对话并将表单数据作为上下文发送给 AI
- 聊天中通过 `/symptom` 快捷指令触发，AI 直接开始对话式引导
- 两种方式最终都进入同一个对话流程，AI 根据已有信息决定是否追问，最终输出统一的症状摘要+导诊卡片

**与报告解读卡片的一致性：** 症状摘要卡片和导诊建议卡片均为**展示型卡片**，不需要阻塞 agent，复用 `REPORT_CARD` 的 SSE 通道，通过 `card_type` 区分。

**SSE 消息格式 — 症状摘要卡片：**

```json
{
  "type": "report_card",
  "content": {
    "card_type": "symptom_summary",
    "patient_name": "张三",
    "report_date": "2026-03-15",
    "chief_complaint": "上腹部间歇性隐痛伴反酸3周",
    "symptoms": [
      {
        "id": "main",
        "label": "主要症状",
        "body_part": "上腹部",
        "description": "间歇性隐痛",
        "duration": "3周",
        "frequency": "每天1-2次，饭后加重",
        "severity": 5
      },
      {
        "id": "accompanying_1",
        "label": "伴随症状",
        "body_part": "胸骨后",
        "description": "反酸、烧灼感",
        "duration": "2周",
        "frequency": "饭后",
        "severity": 3
      }
    ],
    "additional_info": {
      "triggers": ["进食油腻食物", "饭后平卧"],
      "relieving_factors": ["服用抗酸药后缓解"],
      "medical_history": ["高血压"],
      "current_medications": ["氨氯地平 5mg/日"],
      "allergies": ["青霉素"]
    }
  }
}
```

**SSE 消息格式 — 导诊建议卡片：**

```json
{
  "type": "report_card",
  "content": {
    "card_type": "triage_recommendation",
    "severity": "yellow",
    "urgency": "scheduled",
    "urgency_label": "建议择期就诊",
    "recommended_departments": [
      {
        "department": "消化内科",
        "reason": "上腹痛伴反酸，需排除胃食管反流病、消化性溃疡等消化道疾病",
        "priority": 1
      },
      {
        "department": "普外科",
        "reason": "如保守治疗无效，可能需要外科评估",
        "priority": 2
      }
    ],
    "preparation_tips": [
      "就诊前空腹8小时（可能需要做胃镜检查）",
      "携带近期的体检报告或检查结果",
      "记录近一周的症状发作时间和饮食情况"
    ],
    "warning_signs": [
      "如出现呕血、黑便、剧烈腹痛，请立即急诊就诊"
    ],
    "disclaimer": "以上建议仅供参考，不构成医疗诊断。请及时就医，以医生面诊结果为准。"
  }
}
```

------

## Implementation Steps

### Phase 1: Frontend — 侧边栏入口与表单页面

**Step 1:** 在 `/opt/frontend/const/portalChatConfig.ts` 的 patient navItems 中添加

```typescript
{ id: "symptom-report", label: "症状自报", icon: ClipboardList },
```

import `ClipboardList` from `lucide-react`。

**Step 2:** 创建 `/opt/frontend/components/patient/symptom-report/SymptomReportView.tsx`

侧边栏页面组件，包含两个 Tab：

**Tab 1 — 新建症状报告表单：**

- 身体部位选择器：分区按钮组（头颈部/胸部/腹部/腰背部/四肢/皮肤/全身/其他），圆角标签样式，支持多选
- 症状特征多选标签：根据所选部位动态展示常见症状（基于 `BODY_PART_SYMPTOMS` 映射，自动去重）
- 持续时长选择：快捷按钮（今天开始/几天内/1-2周/数周/超过1个月）
- 严重程度滑块：Ant Design Slider，1-10 分，使用患者端主色调 `#6E977B`
- 补充描述输入框：textarea 自由文本
- 提交按钮：「开始智能问诊」，需选择至少一个部位 + 时长后才可提交
- 通过 `onStartChat` 回调将 `SymptomFormData` 传递给父组件

**Tab 2 — 历史症状记录列表：**

- 从患者时间线中筛选 `stage_type = "symptom_report"` 的记录
- 每条记录使用 shadcn Card 展示：标题、日期、诊断摘要
- 空状态提示「暂无症状报告记录」
- 通过 `patientService.getPatientTimeline()` 加载数据

**Step 3:** 在 `/opt/frontend/app/[locale]/chat/internal/chatInterface.tsx` 中

导入并注册 `symptom-report` navItem 的渲染组件：

```typescript
import { SymptomReportView } from "@/components/patient/symptom-report/SymptomReportView";

// 在 patient variant 的条件渲染中添加：
{activeView === "symptom-report" && <SymptomReportView />}
```

### Phase 2: Frontend — 症状采集表单数据定义

**Step 4:** 创建 `/opt/frontend/types/symptomReport.ts`

包含以下类型和常量（详见源文件）：

- `BodyPart` — 8 种身体部位联合类型
- `SymptomFormData` — 表单提交数据（body_parts, symptom_tags, duration, severity, description）
- `BODY_PART_SYMPTOMS` — 身体部位→常见症状的映射常量
- `SymptomSummaryData` / `SymptomItem` — 症状摘要卡片 SSE 数据结构
- `TriageRecommendationData` / `DepartmentRecommendation` — 导诊建议卡片 SSE 数据结构

### Phase 3: Backend — SSE 消息支持

**Step 5:** 无需新增 ProcessType — 复用已有的 `REPORT_CARD` 通道

症状摘要卡片和导诊建议卡片通过 `card_type` 字段区分（`"symptom_summary"` 和 `"triage_recommendation"`），与报告解读卡片共用 `report_card` SSE 消息类型。

**Step 6:** 在 `/opt/sdk/nexent/core/agents/nexent_agent.py` 的 `_extract_and_emit_report_cards` 方法中

扩展已有的 JSON 标记块检测逻辑，新增对 `symptom_summary` 和 `triage_recommendation` 两种 `card_type` 的识别。无需修改方法签名或 SSE 发送逻辑，只需确保这两种 `card_type` 能被正确提取和发送。

**Step 7:** 在管理端配置患者端 agent 的 system prompt

通过管理端 UI 修改患者端 agent 的 `duty_prompt`，添加症状采集引导指令。System prompt 需包含：

- 症状采集流程：部位→特征→时长→伴随症状→加重/缓解因素→病史/用药/过敏
- 信息充分性判断标准：何时认为信息足够，可以生成摘要
- 输出格式规范：`<<<REPORT_CARD>>>{ JSON }<<<END_REPORT_CARD>>>` 标记块格式
- 导诊逻辑指引：严重程度(绿/黄/红)和紧急度(立即急诊/尽快就诊/择期就诊/观察)的判断标准
- 就诊准备建议：根据推荐科室给出针对性准备提示
- 免责声明：必须包含"仅供参考，不构成医疗诊断"

### Phase 4: Frontend — 卡片组件

**Step 8:** 创建 `/opt/frontend/app/[locale]/chat/streaming/SymptomSummaryCard.tsx`

症状摘要卡片组件（翡翠绿主色调，与 ReportInterpretationCard 风格一致）：

- Props: `data: SymptomSummaryData`
- 内部组件 `SeverityBar`：渲染 1-10 严重程度条（绿→黄→红渐变色）
- 布局：
  - 顶部标题栏：ClipboardList 图标 +「症状摘要」+ 日期（`border-emerald-200`, `bg-emerald-50/80`）
  - 主诉区：翡翠绿浅底，显示 `chief_complaint` 一句话
  - 症状列表：每行左侧身体部位标签（emerald 圆角徽章）+ 中间描述+时长 + 右侧 SeverityBar
  - 补充信息区（可折叠，ChevronDown/Right 切换）：诱因/缓解因素/病史/用药/过敏，使用 `InfoRow` 子组件

**Step 9:** 创建 `/opt/frontend/app/[locale]/chat/streaming/TriageRecommendationCard.tsx`

导诊建议卡片组件（严重程度决定整体色调）：

- Props: `data: TriageRecommendationData`
- 样式常量 `SEVERITY_STYLES`（green/yellow/red → bg/border/text/banner）和 `URGENCY_STYLES`（emergency/urgent/scheduled/observation → bg/text）
- 布局：
  - 严重程度横幅：Stethoscope 图标 +「智能导诊建议」+ 紧急度标签 + 严重程度标签
  - emergency 紧急度带红色脉冲动画（`animate-pulse`）
  - 推荐科室列表：编号圆圈 + 科室名（加粗）+ 理由
  - 就诊准备建议：CheckCircle2 图标勾选列表
  - 警示标志区：红色浅底（`bg-red-50/30`），AlertTriangle 图标 + 危险信号列表
  - 底部免责声明：11px 灰色小字

**Step 10:** 修改 `/opt/frontend/app/[locale]/chat/streaming/ReportCardFactory.tsx`

导入新卡片组件并在 switch 中新增两种卡片类型。同时修改 `/opt/frontend/types/chat.ts`，通过 re-export 引入 `SymptomSummaryData` 和 `TriageRecommendationData`，扩展 `ReportCardData` 联合类型。

**注意**：Step 1 中已将 `/symptom` 快捷指令合并到 patient quickActions 中（使用 `...sharedQuickActions` 展开后追加），无需单独步骤。

### Phase 5: Backend — 数据持久化（MCP 工具）

**Step 10 (运行时):** 利用现有的时间线 MCP 工具保存症状报告

AI 在生成症状摘要卡片后，通过现有的时间线 MCP 工具将数据写入患者时间线：

- 调用 `create_timeline_stage` 创建 `stage_type = "symptom_report"` 的时间线事件
- 调用 `create_timeline_detail` 保存症状详情到 `doctor_notes`（JSON 格式）和 `patient_summary`（主诉摘要）
- 这些操作会经过 ConfirmationCard 确认流程（复用已有机制），患者确认后保存

无需新建 API 端点或数据库表，完全复用现有时间线体系。

------

## Critical Files

| File                                                                   | Action                                      | Status |
| :--------------------------------------------------------------------- | :------------------------------------------ | :----- |
| `/opt/frontend/const/portalChatConfig.ts`                              | patient navItems 添加 symptom-report + quickAction（含 ClipboardList 导入） | ✅ 已完成 |
| `/opt/frontend/types/symptomReport.ts`                                 | 新建 - BodyPart、SymptomFormData、BODY_PART_SYMPTOMS、卡片数据类型 | ✅ 已完成 |
| `/opt/frontend/components/patient/symptom-report/SymptomReportView.tsx`| 新建 - 侧边栏症状自报页面（表单Tab+历史Tab）   | ✅ 已完成 |
| `/opt/frontend/app/[locale]/chat/internal/chatInterface.tsx`           | 导入 SymptomReportView + 注册 symptom-report 视图 | ✅ 已完成 |
| `/opt/frontend/app/[locale]/chat/streaming/SymptomSummaryCard.tsx`     | 新建 - 翡翠绿色症状摘要卡片（含 SeverityBar 子组件） | ✅ 已完成 |
| `/opt/frontend/app/[locale]/chat/streaming/TriageRecommendationCard.tsx` | 新建 - 导诊建议卡片（严重程度色调+紧急度脉冲动画） | ✅ 已完成 |
| `/opt/frontend/app/[locale]/chat/streaming/ReportCardFactory.tsx`      | 导入新卡片 + switch 新增 symptom_summary / triage_recommendation | ✅ 已完成 |
| `/opt/frontend/types/chat.ts`                                          | re-export + ReportCardData 联合类型扩展       | ✅ 已完成 |
| `/opt/sdk/nexent/core/agents/nexent_agent.py`                          | `_extract_and_emit_report_cards` 新增 symptom_summary + triage_recommendation 检测 | ✅ 已完成 |
| `/opt/frontend/public/locales/zh/common.json`                          | 添加 42 个 symptomReport.* 扁平 i18n keys     | ✅ 已完成 |
| 管理端 — 患者端 agent system prompt                                      | 配置症状采集引导 + 输出格式 prompt             | ⏳ 待配置 |

### Pattern References

- SSE 消息通道：复用 `REPORT_CARD` 类型（`/opt/sdk/nexent/core/utils/observer.py`）
- Final Answer 拦截：`/opt/sdk/nexent/core/agents/nexent_agent.py`（`_extract_and_emit_report_cards()`）
- 卡片工厂模式：`/opt/frontend/app/[locale]/chat/streaming/ReportCardFactory.tsx`
- 卡片组件参考：`/opt/frontend/app/[locale]/chat/streaming/ReportInterpretationCard.tsx`（样式参考）
- 侧边栏页面参考：`/opt/frontend/components/patient/care-plan/CarePlanView.tsx`（组件结构参考）
- 时间线数据持久化：复用现有 MCP 工具 `create_timeline_stage` + `create_timeline_detail`
- 患者端配置：`/opt/frontend/const/portalChatConfig.ts`（navItems + quickActions）
- Agent prompt 配置：通过管理端 UI 配置 `duty_prompt`

------

## Verification

1. **表单入口测试**：
   - 患者端侧边栏点击「症状自报」→ 进入表单页面
   - 选择「腹部」→ 出现腹部相关症状标签（腹痛、反酸等）
   - 填写表单点击「开始智能问诊」→ 自动创建新对话，AI 基于表单数据追问

2. **对话入口测试**：
   - 在聊天中输入 `/symptom` 或选择快捷指令
   - AI 开始引导式提问（"请问哪里不舒服？"）
   - 逐步回答后，AI 生成症状摘要卡片 + 导诊建议卡片

3. **卡片渲染测试**：
   - 症状摘要卡片：主诉、症状列表、严重程度条、补充信息折叠展开
   - 导诊建议卡片：严重程度横幅颜色正确（绿/黄/红）、科室列表、就诊准备、警示标志
   - 两张卡片依次出现在聊天流中

4. **数据持久化测试**：
   - 症状报告提交后，患者时间线中出现 `symptom_report` 类型事件
   - 侧边栏「症状自报」页面历史列表中出现新记录
   - 医生端查看该患者时间线，能看到症状自报记录

5. **严重程度分级测试**：
   - 描述轻微症状（如"偶尔打喷嚏"）→ 绿色标记 + "建议观察"
   - 描述中等症状（如"腹痛2周伴反酸"）→ 黄色标记 + "建议择期就诊"
   - 描述严重症状（如"胸痛伴呼吸困难"）→ 红色标记 + "建议尽快就诊"

6. **回归测试**：
   - 患者端其他功能（对话、档案、康复计划）不受影响
   - 普通对话不触发症状摘要卡片
