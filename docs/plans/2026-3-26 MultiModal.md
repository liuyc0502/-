# 会诊多模态支持实现计划

## Context

当前会诊功能只支持纯文本问题输入，但普通聊天已具备完整的多模态基础设施（MinIO 上传、VLM 图片分析、文件预处理），且项目有 PaddleOCR MCP 工具（`/opt/backend/paddleocr_sse_server.py`，端口 5020）可精确提取报告图片中的文字。本次改动将多模态 + OCR 能力接入会诊全流程，让医生在发起会诊和干预时可上传影像/文件，专科 Agent 可直接分析图片、调用 OCR 提取文字并输出图表。

## V1 范围

- 会诊发起时上传文件/图片
- 医生干预（continue/conclude）时追加文件
- 专科 Agent 读取并分析上传的图片/文件
- PaddleOCR MCP 预处理 + Agent 按需调用 OCR（双层 OCR 策略）
- Agent 通过 `generate_chart` MCP 工具生成交互式图表（recharts 渲染），也支持 Mermaid 图
- 附件存储复用 MinIO，引用存入会诊记录

**不含**：Agent 生成图片文件、图像标注

------

## 实现步骤

### Step 1: 后端 Request Model 扩展

**文件**：

- `/opt/backend/apps/consultation_app.py`
- `/opt/backend/services/consultation_service.py`

**改动**：

- `ConsultationStartRequest` 增加 `minio_files: Optional[List[Dict[str, Any]]] = None`
  - 每项格式：`{name, type, object_name, url}`
- `ConsultationDecisionRequest` 同样增加 `minio_files`
- `start_consultation()` 将 `minio_files` 传入 `create_session()` 和 orchestrator
- `consultation_decision()` 将 `minio_files` 传入 `resolve_decision()`
- `ConsultationSession` dataclass 增加 `minio_files: List[dict]` 字段
- `resolve_decision()` 在 `decision_result` 中存储 `minio_files`

### Step 2: 数据库 Schema

**文件**：

- `/opt/backend/database/db_models.py` — `ConsultationRecord` 增加 `attachments = Column(JSON)`
- `/opt/backend/database/consultation_db.py` — `create_consultation_record()` 写入 attachments
- 新建迁移脚本：`ALTER TABLE consultation_record_t ADD COLUMN attachments JSONB DEFAULT '[]'`

attachments 格式：

```json
[{"name": "xray.jpg", "type": "image", "object_name": "...", "url": "...", "round": 0, "source": "initial"}]
```

### Step 3: 编排器 + OCR 预处理（核心改动）

**文件**：

- `/opt/backend/services/consultation_orchestrator.py`
- `/opt/backend/paddleocr_sse_server.py`（参考，不修改）

**改动**：

1. `run_consultation()` 接收 `minio_files` 参数，存为 `self.all_minio_files`
2. **OCR 预处理**：在第一轮开始前，对所有图片类型附件调用 PaddleOCR MCP 的 `ocr(file_path=URL)` 提取文字，缓存为 `{object_name: ocr_text}` 映射。新增 `_preprocess_ocr()` 方法实现此逻辑
3. `_build_round_prompt()` 调用 `join_minio_file_description_to_query()` (复用自 `/opt/backend/agents/create_agent_info.py:336`) 将文件描述拼入 question，**同时将 OCR 提取的文字附加在对应图片描述下方**
4. `_run_single_specialist()` / `_execute_agent()` 提取图片类型文件的 URL，传入 `agent.run(prompt, images=image_urls)`
5. 每轮结束等待医生决策时，若决策带 minio_files，合并到 `self.all_minio_files`，并对新图片执行 OCR 预处理
6. 持久化时在 consultation_record 中保存 attachments
7. 在 prompt 末尾添加图表输出指引（Mermaid + chart JSON 格式说明）+ OCR 工具提示

**Prompt 中的 OCR 指引**：

```
## 附件分析
以下附件已通过 OCR 预处理提取了文字内容。如果你需要对特定区域重新识别或提取更精确的内容，
可以调用 ocr(file_path=URL) 工具。

[图片: xray_report.jpg]
- 下载地址: http://backend/file/download/...
- OCR 提取文字:
  检查所见：...
  诊断意见：...
```

**数据流**：

```
minio_files (images) → _preprocess_ocr() → ocr_text_cache
minio_files + ocr_text_cache → enriched question text (文件描述 + OCR 文字)
minio_files (images) → extract URLs → agent.run(images=[...])
Agent 按需 → ocr(file_path=URL) → 针对性二次 OCR
doctor intervention minio_files → OCR preprocess → merge → next round uses all
```

**OCR 预处理调用方式**：通过 MCP client 连接 PaddleOCR server（`http://localhost:5020/sse`），调用 `ocr` tool。复用 `consultation_app.py:112-119` 中已有的 MCP host 发现逻辑。

### Step 4: 前端 — 会诊发起弹窗文件上传

**文件**：`/opt/frontend/app/[locale]/chat/components/ConsultationStartModal.tsx`

**改动**：

- 引入 `FilePreview` 类型和 `storageService`
- 添加 `attachments` state 和文件上传区（拖拽 + 点击），参考 `chatInput.tsx` 的模式
- 显示文件预览（图片缩略图 / 文件图标 + 名称），支持移除
- `handleStart()` 中先上传文件到 MinIO，收集结果，再调用 `onStart(question, agentIds, minioFiles)`
- 上传过程显示进度
- Modal 关闭时清理 blob URL

**文件**：`/opt/frontend/app/[locale]/chat/internal/chatInterface.tsx`

- `startConsultation` 调用处接收 `minioFiles`，加入请求 body

### Step 5: 前端 — 医生干预时追加文件

**文件**：`/opt/frontend/app/[locale]/chat/streaming/chatStreamMain.tsx`

**改动**：

- 在医生决策输入栏旁添加附件按钮（回形针图标）
- 添加 `interventionAttachments` state
- 选择文件后显示小预览 chips
- `handleConsultationDecision()` 中先上传文件，再将 `minio_files` 加入请求 body
- 提交后重置附件 state

### Step 6: 前端 — 图表渲染（交互式）

**新建文件**：`/opt/frontend/components/consultation/InteractiveChart.tsx`

**InteractiveChart 组件**（独立组件，接收 `{type, title, data, xKey, yKeys}` props）：

- **Hover 提示**：recharts 原生 `<Tooltip>` 组件，显示数值、单位、参考范围
- **缩放**：`<Brush>` 组件支持区域缩放，拖拽查看数据细节
- **数据筛选**：
  - 可点击图例 `<Legend onClick>` 显示/隐藏数据系列
  - 图表类型切换按钮（柱状 ↔ 折线 ↔ 面积图），保持数据不变
- **全屏查看**：右上角展开按钮，点击后用 Modal/Dialog 全屏展示图表
- **导出**：
  - 全屏模式下提供导出按钮
  - PNG 导出：用 `html2canvas` 或 recharts 的 SVG → canvas → PNG
  - PDF 导出：组合图表 + 标题 + 数据表格，用 `jspdf` 生成（检查项目是否已有 PDF 导出依赖，优先复用）
- 支持的图表类型：bar, line, area, pie, radar
- 响应式布局：默认嵌入宽度自适应，全屏时占满视口

**文件**：`/opt/frontend/app/[locale]/chat/streaming/ConsultationCard.tsx`

**改动**：

- 创建 `RichOpinionContent` 组件，解析意见文本中的特殊代码块：
  - \````mermaid` → 用已有 `Diagram` 组件渲染 (`/opt/frontend/components/ui/Diagram.tsx`)
  - \````chart` → 解析 JSON，用 `InteractiveChart` 渲染
  - 纯文本段落 → 保持原有渲染
- 在 `SpecialistPanel` 中用 `RichOpinionContent` 替换直接的文本渲染
- 在会诊卡片头部区域显示上传的附件缩略图

**文件**：`/opt/frontend/types/consultation.ts`

- `ConsultationState` 增加 `attachments` 字段
- `chatStreamHandler.tsx` 中 `CONSULTATION_START` 事件提取 attachments

**导出复用**：项目已有 `/opt/frontend/lib/exportPdf.ts`（基于 `html2pdf.js`），`ConsultationDetailView` 已在使用。图表全屏模式的 PDF/PNG 导出直接调用 `exportToPdf()`，无需新增依赖。PNG 导出可用 `html2canvas`（`html2pdf.js` 内含）单独截图。

------

## 关键设计决策

1. **双层 OCR 策略**：编排器预处理做一次基础 OCR（提取全文），Agent 保留按需调 OCR 的能力（针对特定区域/格式重新识别）。预处理保证每个 Agent 都能看到文字内容，按需调用保证灵活性
2. **三通道附件分析**：① query 中拼入文件描述 + OCR 文字（纯文本兼容）② `images` 参数传原图 URL（VLM 直接看图）③ Agent 可调用 `ocr()` 工具二次识别
3. **不做 VLM 预处理**：与普通聊天不同，会诊中各专科 Agent 应直接分析原图（不同专科对同一影像的解读不同），用 OCR 替代 VLM 预处理
4. **图表用 MCP 工具**：新增 `generate_chart` MCP 工具（注册在 nexent MCP server），Agent 调用工具传入数据，返回结构化 JSON，前端 `InteractiveChart` 组件渲染（支持 hover 提示、缩放、数据筛选、图表类型切换、全屏、PNG/PDF 导出）。同时支持 Mermaid 代码块作为补充
5. **复用 MinIO 存储**：不新建 attachment 表，consultation_record 的 attachments JSON 字段存引用即可

## 验证方式

1. 发起会诊时上传一张检验报告图片 + 一个 PDF，验证：
   - OCR 预处理成功提取文字
   - Agent 回复中引用了图片内容和 OCR 结果
   - Agent 能调用 `ocr()` 工具做二次识别
2. 医生干预时追加文件，验证下一轮 Agent 能看到新文件（含 OCR 文字）
3. 会诊详情页能显示所有附件
4. Agent 输出 Mermaid 图 / chart JSON 时，前端正确渲染
5. 数据库 consultation_record 的 attachments 字段正确存储

## 实现状态（2026-03-26 更新）

所有步骤已完成代码编写：

| 步骤 | 状态 | 关键文件 |
|------|------|----------|
| Step 1: 后端 Request Model | 已完成 | `consultation_app.py`, `consultation_service.py` |
| Step 2: 数据库 Schema | 已完成 | `db_models.py`, `consultation_db.py`, `add_consultation_attachments.sql` |
| Step 3: 编排器 + OCR | 已完成 | `consultation_orchestrator.py` (新增 `_preprocess_ocr`, `_build_attachment_section`, `_extract_image_urls`) |
| Step 4: 前端发起弹窗 | 已完成 | `ConsultationStartModal.tsx` (文件上传 + 拖拽 + 预览) |
| Step 5: 医生干预附件 | 已完成 | `chatStreamMain.tsx` (回形针按钮 + 文件 chips) |
| Step 6: 交互式图表 | 已完成 | `InteractiveChart.tsx` (recharts), `ConsultationCard.tsx` (`RichOpinionContent`) |

**新增文件**：
- `backend/tool_collection/mcp/chart_generation_tools.py` — `generate_chart` MCP 工具
- `backend/database/migrations/add_consultation_attachments.sql` — DB 迁移
- `backend/database/migrations/run_consultation_attachments_migration.py` — 迁移运行脚本
- `frontend/components/consultation/InteractiveChart.tsx` — 交互式图表组件
- `frontend/types/consultation.ts` — 新增 `ConsultationAttachment` 类型

**待验证**：需要运行数据库迁移脚本，并进行端到端测试