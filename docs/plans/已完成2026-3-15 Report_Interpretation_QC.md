# 病理报告结构化解读 + 质控

## Context

当前医生在对话中上传病理报告（PDF/图片/文字）后，AI 只是给出一段纯文字回复。这种方式存在两个问题：

1. **信息不结构化**：医生需要从大段文字中自己提取核心诊断、关键描述等要点
2. **无主动质控**：AI 不会检查报告本身是否缺失关键字段（如切缘、脉管侵犯、TNM 分期等）

此功能让 AI 在接收到病理报告后，自动完成两件事：
- **结构化拆解**：将报告拆为五个板块，以卡片形式展示
- **质控检查**：自动检查关键字段缺失，红黄绿标记

**核心需求：** 医生上传报告后，聊天流中自动嵌入"报告解读卡片"和"质控检查卡片"，取代纯文字回复。

------

## Architecture

```
医生上传报告（PDF/图片/文字） → AI 接收内容（已有 OCR 能力处理图片/PDF）→
System Prompt 规定输出结构化 JSON → AI 输出包含 report_interpretation 和 qc_check 的 JSON →
后端检测到结构化输出 → 通过 Observer 发送 report_card / qc_card 类型的 SSE 消息 →
前端渲染报告解读卡片 + 质控检查卡片
```

**与确认卡片的区别：** 确认卡片需要阻塞 agent 线程等待医生操作。报告解读卡和质控卡是**展示型卡片**，不需要阻塞，AI 输出后直接渲染即可。因此不需要 ConfirmationManager 机制，只需要：
1. 后端通过 SSE 发送卡片数据
2. 前端识别消息类型并渲染对应卡片组件

**SSE 消息格式 — 报告解读卡：**

```json
{
  "type": "report_card",
  "content": {
    "card_type": "report_interpretation",
    "report_title": "肺部穿刺活检病理报告",
    "sections": [
      {
        "id": "core_diagnosis",
        "title": "核心诊断",
        "icon": "🎯",
        "content": "左肺下叶穿刺活检：浸润性腺癌，腺泡型为主，WHO 分级 II 级",
        "highlight": true
      },
      {
        "id": "key_findings",
        "title": "关键描述",
        "icon": "🔬",
        "content": "肿瘤细胞呈腺泡状排列，可见核异型...",
        "highlight": false
      },
      {
        "id": "terminology",
        "title": "术语解释",
        "icon": "📖",
        "items": [
          {"term": "浸润性腺癌", "explanation": "癌细胞已突破基底膜，向周围组织生长的腺体来源恶性肿瘤"},
          {"term": "腺泡型", "explanation": "癌细胞排列成腺泡状结构，是肺腺癌最常见的亚型之一"}
        ]
      },
      {
        "id": "clinical_significance",
        "title": "临床意义",
        "icon": "💡",
        "content": "需结合影像学评估肿瘤范围，建议完善分子检测（EGFR、ALK、ROS1）指导靶向治疗方案选择"
      },
      {
        "id": "pending_items",
        "title": "待确认点",
        "icon": "❓",
        "items": [
          "建议补充免疫组化：TTF-1、Napsin A 确认腺癌分化",
          "建议完善分子病理检测"
        ]
      }
    ],
    "source_references": [
      {"source": "WHO 胸部肿瘤分类（第5版）", "relevance": "腺癌亚型分类标准"}
    ]
  }
}
```

**SSE 消息格式 — 质控检查卡：**

```json
{
  "type": "report_card",
  "content": {
    "card_type": "qc_check",
    "report_title": "肺部穿刺活检病理报告",
    "summary": {
      "total": 10,
      "pass": 7,
      "warning": 1,
      "missing": 2
    },
    "fields": [
      {"field": "标本类型", "status": "pass", "value": "穿刺活检"},
      {"field": "部位", "status": "pass", "value": "左肺下叶"},
      {"field": "组织学类型", "status": "pass", "value": "浸润性腺癌"},
      {"field": "组织学分级", "status": "pass", "value": "WHO II 级"},
      {"field": "切缘状态", "status": "not_applicable", "value": "穿刺标本不适用"},
      {"field": "脉管侵犯", "status": "missing", "value": null, "suggestion": "建议补充脉管侵犯评估"},
      {"field": "神经侵犯", "status": "missing", "value": null, "suggestion": "建议补充神经侵犯评估"},
      {"field": "淋巴结", "status": "not_applicable", "value": "穿刺标本不适用"},
      {"field": "TNM 分期", "status": "warning", "value": "未见完整分期", "suggestion": "建议结合影像学完善 TNM 分期"},
      {"field": "免疫组化", "status": "pass", "value": "CK7(+), TTF-1(+)"}
    ]
  }
}
```

------

## Implementation Steps

### Phase 1: Backend — SSE 消息类型注册

**Step 1:** 在 `/opt/sdk/nexent/core/utils/observer.py` 的 `ProcessType` 枚举中添加

```python
REPORT_CARD = "report_card"  # structured pathology report card (interpretation + QC)
```

在 `MessageObserver._init_message_transformers()` 中添加对应的 `DefaultTransformer`

### Phase 2: Backend — Final Answer 拦截与卡片提取

**Step 2:** 在 `/opt/sdk/nexent/core/agents/nexent_agent.py` 中添加 `_extract_and_emit_report_cards` 静态方法

在 `final_answer_str` 发送给 Observer 之前，检测其中是否包含 `<<<REPORT_CARD>>>...<<<END_REPORT_CARD>>>` 标记块。如果有，提取 JSON 内容，分别发送 `report_interpretation` 和 `qc_check` 类型的 `REPORT_CARD` SSE 消息，并从文字中移除标记块。

```python
# 在 interaction() 方法中，final_answer 处理位置：
final_answer_str = re.sub(THINK_TAG_PATTERN, "", final_answer_str, flags=re.DOTALL | re.IGNORECASE)
final_answer_str = self._extract_and_emit_report_cards(final_answer_str, observer)  # 新增
observer.add_message(self.agent.agent_name, ProcessType.FINAL_ANSWER, final_answer_str)
```

**Step 3:** 在管理端配置医生端 agent 的 system prompt

通过管理端 UI 修改医生端 agent 的 `duty_prompt`（职责提示词），添加报告解读指令。system prompt 通过 Jinja2 模板渲染，配置存储在数据库中，通过 `create_agent_config()` 读取。

### Phase 3: Frontend — 消息类型和类型定义

**Step 4:** 在 `/opt/frontend/const/chatConfig.ts` 的 `messageTypes` 和 `contentTypes` 中添加

```typescript
REPORT_CARD: "report_card" as const,
```

**Step 5:** 在 `/opt/frontend/types/chat.ts` 添加类型定义

```typescript
// 报告解读卡片数据
export interface ReportInterpretationData {
  card_type: "report_interpretation"
  report_title: string
  sections: ReportSection[]
  source_references?: SourceReference[]
}

export interface ReportSection {
  id: string
  title: string
  icon: string
  content?: string
  items?: ReportSectionItem[]
  highlight?: boolean
}

export interface ReportSectionItem {
  term?: string
  explanation?: string
  text?: string
}

export interface SourceReference {
  source: string
  relevance: string
}

// 质控检查卡片数据
export interface QCCheckData {
  card_type: "qc_check"
  report_title: string
  summary: {
    total: number
    pass: number
    warning: number
    missing: number
  }
  fields: QCField[]
}

export interface QCField {
  field: string
  status: "pass" | "missing" | "warning" | "not_applicable"
  value: string | null
  suggestion?: string
}

// 联合类型
export type ReportCardData = ReportInterpretationData | QCCheckData
```

### Phase 4: Frontend — 流处理（消息级别渲染）

**Step 6:** 修改 `/opt/frontend/app/[locale]/chat/streaming/chatStreamHandler.tsx`

报告卡片**提升到消息级别**渲染，不再嵌入任务详情的 step 中。这样用户无需滚动展开 step 详情即可直接在聊天主区域看到卡片，卡片显示在 finalAnswer 文字上方。

在 `handleStreamResponse` 中，新增顶层 `reportCards: any[]` 数组收集卡片数据。当收到 `REPORT_CARD` SSE 消息时，解析 JSON 并推入该数组（不再推入 `currentStep.contents`）。流结束时将 `reportCards` 挂到助手消息上（`lastMsg.reportCards`）。

```typescript
case chatConfig.messageTypes.REPORT_CARD:
  // Promote report cards to message level, render in main chat area instead of task detail steps
  try {
    const cardData = typeof messageContent === "string"
      ? JSON.parse(messageContent)
      : messageContent;
    reportCards.push(cardData);
  } catch (e) {
    log.error("Failed to parse report card data", e);
  }
  lastContentType = chatConfig.contentTypes.REPORT_CARD;
  break;
```

**Step 6b:** 修改 `/opt/frontend/types/chat.ts`

在 `ChatMessageType` 中添加 `reportCards?: ReportCardData[]` 字段。

**Step 6c:** 修改 `/opt/frontend/app/[locale]/chat/streaming/chatStreamFinalMessage.tsx`

导入 `ReportCardFactory`，在 `MarkdownRenderer`（finalAnswer 文字）上方渲染 `message.reportCards`：

```tsx
{message.reportCards && message.reportCards.length > 0 && (
  <div className="mb-4 space-y-4">
    {message.reportCards.map((card, idx) => (
      <ReportCardFactory key={`report-card-${idx}`} data={card} />
    ))}
  </div>
)}
```

### Phase 5: Frontend — 卡片组件

**Step 7:** 创建 `/opt/frontend/app/[locale]/chat/streaming/ReportInterpretationCard.tsx`

报告解读卡片组件：

- Props: `data: ReportInterpretationData`
- 布局：
  - 顶部标题栏：报告标题 + "结构化解读" 标签
  - 五个可折叠板块，每个板块：
    - 左侧 icon + 标题
    - 右侧展开/折叠箭头
    - 展开后显示内容（纯文本或术语列表）
  - `core_diagnosis` 板块默认展开且高亮显示（浅蓝色背景）
  - 其他板块默认折叠
  - 底部知识来源引用区（灰色小字）
- 样式：使用 shadcn Card，与 ConfirmationCard 风格一致
- 状态管理：`expandedSections: Set<string>` 控制各板块展开状态

**Step 8:** 创建 `/opt/frontend/app/[locale]/chat/streaming/QCCheckCard.tsx`

质控检查卡片组件：

- Props: `data: QCCheckData`
- 布局：
  - 顶部标题栏：报告标题 + "质控检查" 标签
  - 统计概览条：`✅ 7 通过  ⚠️ 1 警告  ❌ 2 缺失`（使用彩色徽章）
  - 字段检查列表，每行：
    - 左侧状态图标：✅ pass（绿色）/ ⚠️ warning（黄色）/ ❌ missing（红色）/ ➖ not_applicable（灰色）
    - 中间字段名
    - 右侧值或缺失提示
    - warning/missing 行底部显示建议文字（浅色小字）
  - 缺失和警告项排在最前面，通过项排在后面
- 样式：紧凑型列表布局，使用 shadcn Card

**Step 9:** 创建 `/opt/frontend/app/[locale]/chat/streaming/ReportCardFactory.tsx`

卡片工厂组件，根据 `card_type` 分发渲染：

```typescript
interface ReportCardFactoryProps {
  data: ReportCardData
}

export function ReportCardFactory({ data }: ReportCardFactoryProps) {
  switch (data.card_type) {
    case "report_interpretation":
      return <ReportInterpretationCard data={data} />
    case "qc_check":
      return <QCCheckCard data={data} />
    default:
      return null
  }
}
```

### Phase 6: Frontend — 消息渲染

报告卡片现在在 `chatStreamFinalMessage.tsx` 中以**消息级别**渲染（见 Step 6c），不再通过任务窗口展示。`taskWindow.tsx` 中的 REPORT_CARD handler 保留作为备用。

------

## Critical Files

| File                                                              | Action                                    | Status |
| :---------------------------------------------------------------- | :---------------------------------------- | :----- |
| `/opt/sdk/nexent/core/utils/observer.py`                          | 添加 REPORT_CARD 枚举 + DefaultTransformer | ✅ 已完成 |
| `/opt/sdk/nexent/core/agents/nexent_agent.py`                     | 添加 `_extract_and_emit_report_cards` 方法  | ✅ 已完成 |
| `/opt/frontend/const/chatConfig.ts`                               | 添加 REPORT_CARD 消息类型（messageTypes + contentTypes） | ✅ 已完成 |
| `/opt/frontend/types/chat.ts`                                     | 添加 ReportCardData 等类型定义             | ✅ 已完成 |
| `/opt/frontend/app/[locale]/chat/streaming/chatStreamHandler.tsx` | report_card 提升至消息级别，收集到 reportCards 数组 | ✅ 已完成 |
| `/opt/frontend/app/[locale]/chat/streaming/chatStreamFinalMessage.tsx` | 在 finalAnswer 上方渲染 reportCards 卡片 | ✅ 已完成 |
| `/opt/frontend/app/[locale]/chat/streaming/ReportInterpretationCard.tsx` | 新建 - 报告解读卡片组件              | ✅ 已完成 |
| `/opt/frontend/app/[locale]/chat/streaming/QCCheckCard.tsx`       | 新建 - 质控检查卡片组件                    | ✅ 已完成 |
| `/opt/frontend/app/[locale]/chat/streaming/ReportCardFactory.tsx` | 新建 - 卡片工厂组件                        | ✅ 已完成 |
| `/opt/frontend/app/[locale]/chat/streaming/taskWindow.tsx`        | REPORT_CARD 渲染处理器（备用）              | ✅ 已完成 |
| `/opt/frontend/public/locales/zh/common.json`                     | 添加 reportCard.* i18n keys               | ✅ 已完成 |
| 管理端 — 医生端 agent system prompt                                | 需手动配置报告解读 prompt 指令              | ⏳ 待配置 |

### Pattern References

- SSE 消息类型注册：`/opt/sdk/nexent/core/utils/observer.py`（ProcessType 枚举 + DefaultTransformer）
- Final Answer 拦截与清理：`/opt/sdk/nexent/core/agents/nexent_agent.py`（`_extract_and_emit_report_cards()`，含 JSON 容错处理）
- 前端流处理：`/opt/frontend/app/[locale]/chat/streaming/chatStreamHandler.tsx`（report_card 收集到消息级别 reportCards 数组）
- 前端卡片渲染：`/opt/frontend/app/[locale]/chat/streaming/chatStreamFinalMessage.tsx`（消息级别渲染，在 finalAnswer 上方）
- 前端卡片渲染（备用）：`/opt/frontend/app/[locale]/chat/streaming/taskWindow.tsx`（MessageHandler 模式）
- 卡片组件参考：`/opt/frontend/app/[locale]/chat/streaming/ConfirmationCard.tsx`（Tailwind 样式）
- Agent prompt 配置：通过管理端 UI 配置 `duty_prompt`，代码在 `/opt/backend/agents/create_agent_info.py`

------

## Verification

1. **基础报告解读测试**：
   - 在聊天界面发送一段病理报告文字（如："左肺下叶穿刺活检：浸润性腺癌，腺泡型为主，WHO 分级 II 级。免疫组化：CK7(+)，TTF-1(+)，Napsin A(+)，CK5/6(-)，P40(-)。"）
   - 验证：聊天流中出现报告解读卡片，五个板块正确展示
   - 验证：各板块可折叠/展开

2. **质控检查测试**：
   - 使用同一份报告
   - 验证：质控卡片正确标记——脉管侵犯(missing)、神经侵犯(missing)、TNM(warning)、切缘(not_applicable)
   - 验证：缺失项排在最前面，通过项排在后面

3. **图片/PDF 报告测试**：
   - 上传一张病理报告图片
   - 验证：OCR 识别后仍能正确触发结构化解读和质控

4. **纯文字问答测试**（回归测试）：
   - 发送普通病理问题（如"什么是腺泡型腺癌？"）
   - 验证：不触发报告卡片，正常文字回复
