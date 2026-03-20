# 0报告解读中心 — 患者端第5个侧边栏页面

## Context

当前患者端侧边栏有4个选项（对话、症状自报、我的档案、康复计划），4个不太均衡。虽然「我的档案」中已有报告列表（检验/影像/病理报告），但那里只是**原始报告数据的展示**——患者看不懂专业术语、不清楚哪些指标异常、不知道应该关注什么。

此功能新增「报告解读」页面，用 AI 将专业医学报告翻译成大白话，覆盖三个核心需求：

1. **看不懂报告**：AI 用通俗语言逐项解释，标注严重程度（绿/黄/红），给出下一步建议
2. **不知道变化趋势**：跨报告指标对比，看到"上次5.2 → 这次7.8 ↑"这样的直观变化
3. **不清楚该关注什么**：AI 高亮异常指标，按紧急度排序，告诉患者"这个需要尽快找医生"

**与「我的档案」的差异：** 档案是原始数据存储和浏览，解读中心是 AI 增值解释层。类比：档案 = 银行账户流水，解读中心 = 财务分析报告。

**核心需求：** 患者通过侧边栏进入「报告解读」页面，看到所有报告的时间轴列表，点击任一报告可查看 AI 通俗解读卡片（复用已有 ReportInterpretationCard 组件模式），同时可查看关键指标的跨报告变化趋势。

------

## Architecture

```
患者端侧边栏「报告解读」→

Tab 1 报告列表（时间轴）：
  读取患者时间线 + 报告数据 → 按日期倒序展示所有报告 →
  每份报告显示：类型标签 + 标题 + 日期 + AI 解读状态（已解读/待解读） →
  点击报告 → 展开/跳转到详情页 →

Tab 2 指标趋势：
  从多份报告中提取关键指标（肿瘤标志物、血常规等） →
  按指标分组，展示时间线上的变化趋势 → 异常值红色标记 →

报告详情（展开或弹窗）：
  AI 生成通俗解读 → 复用 ReportInterpretationCard 卡片模式 →
  五板块：核心结论（大白话）、关键发现、术语解释、需要关注、下一步建议 →
  严重程度整体标记（绿/黄/红）
```

**数据来源：**

- 复用已有 `patientService.getPatientTimeline()` 获取时间线
- 复用已有 `patientService.getPatientReports()` 获取报告详情
- 报告类型：检验报告（LabReport）、影像报告（ImagingReport）、病理报告（通过时间线 pathology_findings）

**AI 解读生成方式：**

- 前端调用后端 API → 后端将报告内容发送给 AI agent → AI 输出结构化解读 JSON → 后端缓存解读结果 → 前端渲染
- 复用已有的 `ReportInterpretationCard` 组件样式和 `ReportInterpretationData` 类型（来自 Report_Interpretation_QC 功能）
- 患者端解读使用更通俗的语言（通过不同的 system prompt），与医生端专业解读形成差异

**缓存策略：** 解读结果存入数据库，同一份报告不重复调用 AI。支持「重新解读」刷新。

------

## Implementation Steps

### Phase 1: 类型定义 + 后端 API

**Step 1:** 创建 `/opt/frontend/types/reportCenter.ts`

```typescript
// 报告解读状态
export type InterpretationStatus = "pending" | "ready" | "error";

// 严重程度
export type SeverityLevel = "green" | "yellow" | "red";

// 报告列表项（聚合展示）
export interface ReportListItem {
  report_id: string;
  report_type: "lab" | "imaging" | "pathology";
  report_title: string;
  report_date: string;
  source_timeline_id?: number;
  interpretation_status: InterpretationStatus;
  severity?: SeverityLevel;
  summary?: string;            // AI 一句话摘要
}

// 患者端通俗解读数据（扩展已有 ReportInterpretationData）
export interface PatientReportInterpretation {
  report_id: string;
  report_type: "lab" | "imaging" | "pathology";
  report_title: string;
  report_date: string;
  severity: SeverityLevel;
  severity_label: string;       // "情况正常" / "需要关注" / "建议尽快就医"
  plain_summary: string;        // 一段大白话总结
  sections: PatientInterpretationSection[];
  next_steps: string[];         // 下一步建议
  disclaimer: string;           // 免责声明
  generated_at: string;
}

export interface PatientInterpretationSection {
  id: string;
  title: string;                // "核心结论" / "关键发现" / "术语解释" / "需要关注"
  icon: string;
  content?: string;
  items?: PatientInterpretationItem[];
  highlight?: boolean;
}

export interface PatientInterpretationItem {
  label: string;
  value?: string;
  explanation?: string;
  status?: "normal" | "abnormal" | "warning";
}

// 指标趋势数据
export interface MetricTrend {
  metric_name: string;
  metric_unit: string;
  normal_range?: string;
  data_points: MetricDataPoint[];
  current_status: "normal" | "abnormal" | "warning";
}

export interface MetricDataPoint {
  date: string;
  value: number;
  report_title: string;
  is_abnormal: boolean;
}
```

**Step 2:** 创建 `/opt/backend/database/report_interpretation_db.py`

数据库表 `patient_report_interpretations`：

- `interpretation_id` (PK), `patient_id`, `report_id` (报告唯一标识), `report_type`
- `interpretation_json` (JSONB, 存储 PatientReportInterpretation)
- `severity`, `summary`
- `tenant_id`, `create_time`, `update_time`

CRUD：`save_interpretation`, `get_interpretation`, `list_interpretations_by_patient`, `delete_interpretation`

**Step 3:** 创建 `/opt/backend/apps/report_interpretation_app.py` (FastAPI router)

```
GET    /report-center/list/{patient_id}                    报告列表（含解读状态）
GET    /report-center/{patient_id}/interpretation/{report_id}  获取已缓存解读
POST   /report-center/{patient_id}/interpret/{report_id}   触发AI解读（如无缓存）
POST   /report-center/{patient_id}/reinterpret/{report_id} 重新生成解读
GET    /report-center/{patient_id}/trends                   获取指标趋势数据
```

在 `/opt/backend/main_service.py` 中注册路由。

### Phase 2: 前端 — 侧边栏入口 + 框架组件

**Step 4:** 在 `/opt/frontend/const/portalChatConfig.ts` 的 patient navItems 中添加

```typescript
{ id: "report-center", label: "报告解读", icon: FileSearch },
```

import `FileSearch` from `lucide-react`。放在「我的档案」之后、「康复计划」之前。

最终5个navItem顺序：对话、症状自报、我的档案、**报告解读**、康复计划

**Step 5:** 创建 `/opt/frontend/components/patient/report-center/ReportCenterView.tsx`

顶层视图组件（参考 `PatientProfileView.tsx` 的 Tabs 结构）：

```
+-------------------------------------------------------+
| 报告解读                       [报告列表]  [指标趋势]   |
+-------------------------------------------------------+
|                                                        |
|   Tab 内容区                                            |
|                                                        |
+-------------------------------------------------------+
```

- Header + 两个 Tab（报告列表 / 指标趋势）
- 使用 shadcn Tabs 组件，与 PatientProfileView 风格一致
- 数据加载：通过 `useAuth` 获取 patient → 调用 reportCenterService

**Step 6:** 在 `/opt/frontend/app/[locale]/chat/internal/chatInterface.tsx` 中注册路由

```typescript
import { ReportCenterView } from "@/components/patient/report-center/ReportCenterView";
{activeView === "report-center" && <ReportCenterView />}
```

### Phase 3: 前端 — 报告列表 Tab

**Step 7:** 创建 `/opt/frontend/components/patient/report-center/ReportListTab.tsx`

报告列表组件（时间轴样式）：

- 按日期倒序排列所有报告
- 每个报告卡片（shadcn Card）：
  - 左侧：类型标签（检验=蓝色、影像=紫色、病理=橙色）
  - 中间：标题 + 日期 + AI 摘要（如已解读）
  - 右侧：严重程度点（绿/黄/红/灰=未解读）+ 展开箭头
- 点击展开 → 显示 `ReportInterpretationDetail` 组件
- 未解读报告点击时触发 AI 解读 → loading 状态 → 展示结果

**Step 8:** 创建 `/opt/frontend/components/patient/report-center/ReportInterpretationDetail.tsx`

报告通俗解读详情组件（复用 ReportInterpretationCard 的视觉模式，但面向患者）：

- 顶部：严重程度横幅（绿="情况正常 ✅" / 黄="需要关注 ⚠️" / 红="建议尽快就医 🔴"）
- 大白话总结区：`plain_summary`，浅色背景卡片
- 四个可折叠板块：
  - 📋 核心结论：用简单语言说明主要发现
  - 🔍 关键发现：列表，每项标注正常/异常/警告状态
  - 📖 术语解释：把专业词汇翻译成日常用语
  - ⚠️ 需要关注：高亮异常项和注意事项
- 下一步建议区：建议列表（"建议X天后复查"等）
- 底部免责声明（灰色小字）
- 操作栏：[重新解读] [跳转原始报告]（跳到「我的档案」）

### Phase 4: 前端 — 指标趋势 Tab

**Step 9:** 创建 `/opt/frontend/components/patient/report-center/MetricTrendsTab.tsx`

指标趋势组件：

- 从后端获取指标数据 → 按指标名分组
- 每个指标一个卡片：
  - 标题：指标名 + 当前状态标签（正常/偏高/偏低）
  - 正常范围文字显示
  - 简易折线趋势图（不引入重型图表库，用 CSS/SVG 实现简单折线）：
    - X 轴：日期
    - Y 轴：数值
    - 正常范围用浅绿色带标注
    - 异常点用红色标记
  - 数据点悬浮显示：日期 + 值 + 来源报告
- 顶部筛选：全部 / 异常优先
- 空状态：「暂无可追踪的指标数据」

**Step 10:** 创建 `/opt/frontend/components/patient/report-center/SimpleLineChart.tsx`

轻量级 SVG 折线图组件（避免引入 recharts 等重依赖）：

- Props: `dataPoints: {x: string, y: number, abnormal: boolean}[]`, `normalRange?: {min: number, max: number}`, `unit: string`
- SVG 渲染：polyline 连线 + circle 数据点 + rect 正常范围带
- 响应式宽度，固定高度 120px
- 异常点红色，正常点绿色

### Phase 5: 后端 — AI 解读 + 指标提取

**Step 11:** 创建 `/opt/backend/tool_collection/mcp/report_interpretation_patient_tools.py`

MCP 工具（参考 `care_plan_tools.py`，使用 `FastMCP("report_interpretation_patient")`）：

- `interpret_report_for_patient(patient_id, report_id, report_type)` — 读取报告原始内容 + 调用 AI 生成通俗解读 JSON → 存入数据库 → 返回
- `extract_metric_trends(patient_id)` — 遍历所有检验报告提取数值型指标 → 按指标名分组 → 标注异常值 → 返回趋势数据

在 `/opt/backend/nexent_mcp_service.py` 中注册。

**Step 12:** 在后端 API 路由中实现解读触发逻辑

`POST /report-center/{patient_id}/interpret/{report_id}` 的处理流程：

1. 检查数据库是否已有缓存解读 → 有则直接返回
2. 无缓存 → 根据 report_type 读取报告原始数据
3. 构造 prompt（通俗化 system prompt + 报告内容）→ 调用 AI
4. 解析 AI 输出的结构化 JSON → 存入数据库 → 返回前端

### Phase 6: 前端服务 

**Step 13:** 创建 `/opt/frontend/services/reportCenterService.ts`

```typescript
// 封装所有 API 调用
getReportList(patientId: number): Promise<ReportListItem[]>
getInterpretation(patientId: number, reportId: string): Promise<PatientReportInterpretation>
requestInterpretation(patientId: number, reportId: string): Promise<PatientReportInterpretation>
reinterpret(patientId: number, reportId: string): Promise<PatientReportInterpretation>
getMetricTrends(patientId: number): Promise<MetricTrend[]>
```

------

## Critical Files

| File                                                         | Action                                 |
| :----------------------------------------------------------- | :------------------------------------- |
| `/opt/frontend/types/reportCenter.ts`                        | 新建 - 所有类型定义                    |
| `/opt/frontend/const/portalChatConfig.ts`                    | 添加 report-center navItem             |
| `/opt/frontend/app/[locale]/chat/internal/chatInterface.tsx` | 添加 report-center 路由                |
| `/opt/frontend/components/patient/report-center/ReportCenterView.tsx` | 新建 - 顶层视图（Tabs）                |
| `/opt/frontend/components/patient/report-center/ReportListTab.tsx` | 新建 - 报告列表（时间轴）              |
| `/opt/frontend/components/patient/report-center/ReportInterpretationDetail.tsx` | 新建 - 通俗解读详情                    |
| `/opt/frontend/components/patient/report-center/MetricTrendsTab.tsx` | 新建 - 指标趋势                        |
| `/opt/frontend/components/patient/report-center/SimpleLineChart.tsx` | 新建 - 轻量SVG折线图                   |
| `/opt/frontend/services/reportCenterService.ts`              | 新建 - API 服务                        |
| `/opt/backend/database/report_interpretation_db.py`          | 新建 - 数据库操作                      |
| `/opt/backend/apps/report_interpretation_app.py`             | 新建 - FastAPI 路由                    |
| `/opt/backend/tool_collection/mcp/report_interpretation_patient_tools.py` | 新建 - MCP 工具                        |
| `/opt/backend/main_service.py`                               | 注册新路由                             |
| `/opt/backend/database/db_models.py`                         | 添加 patient_report_interpretations 表 |

### Pattern References

- 侧边栏页面参考：`/opt/frontend/components/patient/profile/PatientProfileView.tsx`（Tabs 结构）
- 卡片样式参考：`/opt/frontend/app/[locale]/chat/streaming/ReportInterpretationCard.tsx`（解读卡片视觉）
- navItem 配置：`/opt/frontend/const/portalChatConfig.ts`（patient navItems 模式）
- 路由注册：`/opt/frontend/app/[locale]/chat/internal/chatInterface.tsx`（activeView 条件渲染）
- 前端服务参考：`/opt/frontend/services/carePlanService.ts`（API 封装模式）
- MCP 工具参考：`/opt/backend/tool_collection/mcp/care_plan_tools.py`（FastMCP 模式）
- 报告数据类型：`/opt/frontend/types/patient.ts`（LabReport, ImagingReport, TimelineStage）
- 已有解读类型参考：`/opt/frontend/types/reportInterpretation.ts`（ReportInterpretationData）

------

## Verification

1. **侧边栏入口测试**：
   - 患者端侧边栏出现第5个选项「报告解读」（FileSearch 图标）
   - 5个选项排列正常：对话、症状自报、我的档案、报告解读、康复计划
2. **报告列表测试**：
   - 进入页面 → 显示所有报告（按日期倒序）
   - 报告类型标签颜色正确（检验蓝/影像紫/病理橙）
   - 未解读报告显示灰色点 + "待解读"
3. **AI 解读测试**：
   - 点击未解读报告 → loading "AI 正在解读中..." → 解读结果展示
   - 严重程度横幅颜色正确（绿/黄/红）
   - 四个板块可折叠展开
   - 大白话总结可读性好（非专业术语堆砌）
   - 再次点击同一报告 → 直接展示缓存结果（无 loading）
4. **重新解读测试**：
   - 点击「重新解读」→ 重新生成 → 结果可能不同
5. **指标趋势测试**：
   - 切换到「指标趋势」Tab → 展示指标卡片
   - 折线图正确渲染数据点
   - 异常值红色标记
   - 正常范围浅绿色带显示
   - 「异常优先」筛选正常工作
6. **跳转原始报告测试**：
   - 点击「查看原始报告」→ 跳转到「我的档案」对应报告
7. **回归测试**：
   - 「我的档案」中的报告列表功能不受影响
   - 患者端其他4个页面功能正常