# 病理知识溯源链

## Context

当前智能体回答病理知识问题时只给结论，医生无法追溯推理依据和知识来源。此功能在 AI 回答病理问题时，在聊天流中嵌入"推理链卡片"，展示完整推理过程：引用了哪条知识（来源：教材/指南/文献）、推出了什么中间结论、为什么排除了其他可能性、最终结论的置信度。

**核心需求：** 推理链中每一步的知识来源必须来自 Elasticsearch 知识库的真实检索结果（通过 cite_index 关联），不允许 LLM 编造来源。卡片以垂直时间线形式展示，可折叠展开每一步的推理依据。

------

## Architecture

```
用户提问病理问题 → Agent 调用 knowledge_base_search 检索 ES →
LLM 基于检索结果构建推理链 → 输出 <<<REPORT_CARD>>>JSON<<<END_REPORT_CARD>>> →
_extract_and_emit_report_cards() 提取并发送 REPORT_CARD SSE →
前端 chatStreamHandler 路由到 ReportCardFactory → ReasoningChainCard 渲染
```

**核心原理：** 复用现有的 REPORT_CARD 卡片管道。LLM 在 final_answer 中嵌入 `<<<REPORT_CARD>>>` 标记的推理链 JSON，后端 `_extract_and_emit_report_cards()` 自动提取并通过 SSE 发送 `REPORT_CARD` 消息，前端 `ReportCardFactory` 根据 `card_type` 分发到新的 `ReasoningChainCard` 组件。

**SSE 消息格式：**

```json
{
  "type": "report_card",
  "content": {
    "card_type": "reasoning_chain",
    "question": "肺腺癌如何鉴别诊断？",
    "conclusion": "倾向肺腺癌诊断",
    "confidence": 0.85,
    "steps": [
      {
        "step_number": 1,
        "type": "evidence",
        "title": "WHO肺肿瘤分类标准",
        "content": "根据WHO第5版肺肿瘤分类，腺癌需与鳞癌、大细胞癌鉴别...",
        "knowledge_source": {
          "cite_index": 1,
          "source_name": "WHO Classification of Tumours - Thoracic Tumours",
          "excerpt": "腺癌的诊断需满足腺样分化证据..."
        }
      },
      {
        "step_number": 2,
        "type": "reasoning",
        "title": "形态学分析支持腺癌",
        "content": "腺样结构 + 黏液分泌 → 符合腺癌形态特征"
      },
      {
        "step_number": 3,
        "type": "exclusion",
        "title": "排除鳞状细胞癌",
        "content": "未见角化/细胞间桥，不支持鳞癌诊断"
      }
    ]
  }
}
```

------

## Implementation Steps

### Phase 1: Frontend - 类型定义

**Step 1:** 新建 `/opt/frontend/types/reasoningChain.ts`

```typescript
export interface ReasoningChainData {
  card_type: "reasoning_chain";
  question: string;
  conclusion: string;
  confidence: number; // 0-1
  steps: ReasoningStep[];
}

export interface ReasoningStep {
  step_number: number;
  type: "evidence" | "reasoning" | "exclusion";
  title: string;
  content: string;
  knowledge_source?: {
    cite_index: number;
    source_name: string;
    excerpt: string;
  };
}
```

**Step 2:** 修改 `/opt/frontend/types/chat.ts` L370-378

- 添加 `ReasoningChainData` 的 import 和 re-export
- 在 `ReportCardData` 联合类型中加入 `ReasoningChainData`

### Phase 2: Frontend - 推理链卡片组件

**Step 3:** 新建 `/opt/frontend/app/[locale]/chat/streaming/ReasoningChainCard.tsx`

- Props: `data: ReasoningChainData`
- 状态: `expandedSteps: Set<number>`，默认全部折叠
- **Header**: 紫色/靛蓝主题，显示用户问题 + "推理溯源" badge
- **Timeline body**:
  - 左侧竖线（`w-0.5 bg-gray-200`）连接各步骤圆点
  - 圆点颜色按 type 区分：绿色 `evidence` / 蓝色 `reasoning` / 橙色 `exclusion`
  - 步骤标题可点击展开/折叠（`ChevronDown`/`ChevronRight`）
  - 展开后显示 content 文本
  - `evidence` 类型展示 `knowledge_source` 引用框：`source_name` + `excerpt` + `[[a{cite_index}]]` 标签
- **Footer**: 最终结论 + 置信度进度条（红<50% / 黄50-80% / 绿>80%）
- 图标：`GitBranch`(header), `BookOpen`(evidence), `Brain`(reasoning), `XCircle`(exclusion)
- 参考 `ReportInterpretationCard.tsx` 的折叠交互模式

**Step 4:** 修改 `/opt/frontend/app/[locale]/chat/streaming/ReportCardFactory.tsx`

- 添加 `import ReasoningChainCard from "./ReasoningChainCard"`
- 在 `renderCard()` switch 中添加 `case "reasoning_chain":`

### Phase 3: Backend - 推理链提取

**Step 5:** 修改 `/opt/sdk/nexent/core/agents/nexent_agent.py`

- 在 `_extract_and_emit_report_cards()` 方法中，`triage_recommendation` 之后添加：

  ```python
  if "reasoning_chain" in card_data:
      rc = card_data["reasoning_chain"]
      rc["card_type"] = "reasoning_chain"
      observer.add_message(
          "", ProcessType.REPORT_CARD,
          json.dumps(rc, ensure_ascii=False)
      )
  ```

### Phase 4: Agent Prompt 配置

**Step 6:** 在管理后台修改医生端 agent 的 `constraint_prompt`，追加推理链输出规则

- 规定当用户询问病理知识类问题时，必须先调用 `knowledge_base_search` 检索
- 基于检索结果构建推理链 JSON，嵌入 `<<<REPORT_CARD>>>` 标记
- 硬性要求：`evidence` 步骤必须包含 `knowledge_source`，`cite_index` 必须与检索结果一致

## Critical Files

| File                                                         | Action                            |
| :----------------------------------------------------------- | :-------------------------------- |
| `/opt/frontend/types/reasoningChain.ts`                      | 新建 - 推理链类型定义             |
| `/opt/frontend/types/chat.ts`                                | 修改 - 注册到 ReportCardData 联合类型 |
| `/opt/frontend/app/[locale]/chat/streaming/ReasoningChainCard.tsx` | 新建 - 垂直时间线卡片组件         |
| `/opt/frontend/app/[locale]/chat/streaming/ReportCardFactory.tsx` | 修改 - 添加 import + case         |
| `/opt/sdk/nexent/core/agents/nexent_agent.py`                | 修改 - 添加 reasoning_chain 提取  |
| Agent constraint_prompt（数据库/管理后台）                     | 修改 - 添加推理链输出规则         |

### Pattern References

- 现有卡片组件：`/opt/frontend/app/[locale]/chat/streaming/ReportInterpretationCard.tsx`（折叠交互 + lucide 图标）
- 卡片类型定义：`/opt/frontend/types/reportInterpretation.ts`（类型结构模式）
- 卡片工厂：`/opt/frontend/app/[locale]/chat/streaming/ReportCardFactory.tsx`（分发 + 全屏）
- SSE 流处理：`/opt/frontend/app/[locale]/chat/streaming/chatStreamHandler.tsx`（REPORT_CARD handler）
- 后端提取：`/opt/sdk/nexent/core/agents/nexent_agent.py`（`_extract_and_emit_report_cards()`）
- ES 检索工具：`/opt/sdk/nexent/core/tools/knowledge_base_search_tool.py`（cite_index 机制）

------

## Verification

1. **TypeScript 编译检查**：

   ```bash
   cd frontend && npx tsc --noEmit
   ```

2. **端到端对话测试**：

   - 在聊天界面发送 "Ki-67在乳腺癌中的意义是什么？"
   - 验证：智能体先调用 knowledge_base_search 检索，然后聊天流中出现推理链卡片
   - 验证：卡片显示垂直时间线，各步骤圆点颜色正确（绿/蓝/橙）
   - 点击步骤标题 → 展开显示详细内容和知识来源
   - evidence 步骤的 `[[a1]]` 标记与右侧搜索结果面板的来源一致
   - 底部置信度进度条显示正确百分比和颜色

3. **全屏测试**：

   - 点击卡片右上角放大按钮 → 验证全屏模态框正确渲染（ReportCardFactory 已支持）

4. **历史恢复测试**：

   - 刷新页面或切换对话后返回 → 验证推理链卡片从历史记录正确恢复

5. **边界情况**：

   - 纯推理步骤（无 knowledge_source）→ 不显示引用框
   - confidence 边界值（0, 0.5, 1.0）→ 进度条颜色正确切换
   - 非病理问题 → 不出现推理链卡片
