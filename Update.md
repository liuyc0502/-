# 更新日志
## 2025-11-26

### 优化图片上传流程：移除自动VLM预处理，改为用途选择驱动

**问题背景**:
- 原先所有图片上传后都会自动调用VLM（视觉语言模型）生成描述
- VLM描述不够精确，无法提取完整文字
- 用户上传患者档案/病例文档时，需要的是OCR文字识别，而非VLM描述

**解决方案**:
- 所有图片上传（包括粘贴、拖拽、文件选择）都先弹出用途选择弹窗
- 根据用途执行不同的处理流程，跳过无意义的VLM预处理

**修改文件**:



1. `backend/tool_collection/mcp/document_parsing_tools.py`
   - 修正 PaddleOCR MCP URL 从 `/mcp` 改为 `/sse`

2. `backend/consts/const.py`
   - 新增 `MAIN_SERVICE_URL` 常量（默认值 `http://localhost:5010`）
   - 用于OCR服务访问后端API获取图片

3. `backend/agents/create_agent_info.py`
   - 修正图片URL端口：从错误的8000改为正确的5010
   - 按规范从 `consts.const` 导入配置
   - 修改URL格式：从 `/file/storage/xxx.png?download=redirect` 改为 `/file/download/xxx.png`

4. `backend/apps/file_management_app.py`
   - 新增 `GET /file/download/{object_name}` 端点
   - URL直接以文件扩展名结尾，兼容OCR工具的文件类型检测



**修复OCR工具无法识别文件类型的问题**:
- **问题**: PaddleOCR通过检查URL结尾判断文件类型，但原URL含查询参数`?download=redirect`，导致识别失败
- **解决**: 新增 `/file/download/{object_name}` 端点，URL直接以 `.png/.jpg` 结尾
- **旧URL**: `http://localhost:5010/file/storage/xxx.png?download=redirect` ❌
- **新URL**: `http://localhost:5010/file/download/xxx.png` ✅

**修复前端图片预览无法加载的问题**:
- **问题1**: 上传后返回的URL是MinIO内部路径 `/nexent-bucket/xxx.png`，浏览器无法访问
- **问题2**: 使用redirect模式重定向到 `http://nexent-minio:9000/...`，这是Docker内部地址，浏览器无法访问
- **问题3**: `getFileUrl` API也返回MinIO内部URL，导致诊疗时间线等地方图片无法显示
- **问题4**: `ensureFileUrl` 不识别 `/api/` 开头的URL，导致路径重复 `/api/file/storage/api/file/storage/...`
- **解决**:
  - 修改 `backend/database/attachment_db.py`: 
    - `upload_fileobj()`: 返回 stream 模式URL
    - `get_file_url()`: 返回 stream 模式URL (而非MinIO presigned URL)
  - 修改前端 `ensureFileUrl` 函数 (两处):
    - `frontend/components/doctor/patients/PatientTimeline.tsx`
    - `frontend/components/doctor/patients/EditTimelineDetailModal.tsx`
    - 增加 `/api/` 前缀检测，已经是API路径就直接返回
- **旧URL**: `http://nexent-minio:9000/...` ❌ (Docker内部地址)
- **新URL**: `/api/file/storage/xxx.png?download=stream` ✅ (直接返回图片数据)

---

## 2025-11-25

### 实现医学图像标注与AI分析功能

**新增文件**:
- `backend/database/migrations/create_image_annotation_tables.sql` (数据库迁移 - 创建标注和分析表)
- `backend/tool_collection/mcp/image_annotation_tools.py` (MCP工具 - 图像标注管理，5个工具)
- `backend/tool_collection/mcp/medical_image_analysis_tools.py` (MCP工具 - 医学图像分析，3个工具)
- `backend/tool_collection/mcp/document_parsing_tools.py` (MCP工具 - OCR文档解析，4个工具)
- `frontend/types/annotation.ts` (TypeScript类型 - 标注相关类型定义)
- `frontend/services/annotationService.ts` (API服务 - 标注和分析接口封装)
- `frontend/components/common/image-annotation/ImageUploadPurposeModal.tsx` (组件 - 图片上传用途选择)
- `frontend/components/common/image-annotation/AnnotationCanvas.tsx` (组件 - 基于Konva的标注画布)
- `frontend/components/common/image-annotation/AnnotationToolbar.tsx` (组件 - 标注工具栏)
- `frontend/components/common/image-annotation/AnnotationList.tsx` (组件 - 标注列表侧边栏)
- `frontend/components/common/image-annotation/ImageAnnotationView.tsx` (组件 - 标注主视图)
- `frontend/components/doctor/ocr/OcrPatientFormModal.tsx` (组件 - OCR患者档案表单)
- `frontend/components/doctor/ocr/OcrCaseFormModal.tsx` (组件 - OCR病例库表单)
- `快速集成指南.md` (文档 - 中文集成指南)

**修改文件**:
- `backend/database/db_models.py` (新增 - PatientImageAnnotation、PatientImageAnalysis ORM模型)
- `backend/database/patient_db.py` (新增 - 12个标注和分析相关数据库操作函数)
- `backend/services/patient_service.py` (新增 - 6个标注和分析服务层函数)
- `backend/apps/patient_app.py` (新增 - 5个标注和分析API端点)
- `frontend/app/[locale]/chat/internal/chatInterface.tsx` (集成 - 图片上传用途选择、标注模式切换、OCR表单)

**功能说明**:

#### 1. 图像标注系统
- ✨ **标注画布** (基于 react-konva):
  - 支持圆形和矩形标注绘制
  - 鼠标拖拽创建标注区域
  - 自动编号为"区域1"、"区域2"等
  - 标注高亮显示功能
- 🎨 **预置标注类型** (6种):
  - 病灶 (lesion) - 红色 #FF4D4F
  - 对照 (control) - 绿色 #52C41A
  - 阴影 (shadow) - 黄色 #FAAD14
  - 出血 (hemorrhage) - 棕色 #A0522D
  - 伪影 (artifact) - 灰色 #8C8C8C
  - 其他 (other) - 蓝色 #1890FF
- 📝 **标注管理**:
  - 标注列表展示（区域编号、类型、颜色、描述）
  - 编辑标注描述
  - 删除标注
  - 点击列表项高亮对应区域

#### 2. AI图像分析
- 🤖 **标注区域分析**:
  - 对指定标注区域进行AI分析
  - 自动裁剪标注区域图像
  - 调用多模态视觉模型（GPT-4V/Claude 3.5 Sonnet）
  - 支持自定义问题（如"区域1是否异常"）
- 📊 **多区域对比分析**:
  - 支持多个标注区域的对比分析
  - 生成综合分析报告
- 📈 **分析历史记录**:
  - 保存所有分析结果
  - 关联到会话和标注
  - 支持历史查询

#### 3. OCR文档解析与模板化入库
- 📄 **PaddleOCR集成**:
  - 集成已有的PaddleOCR MCP服务（端口5020）
  - 支持simple和detailed两种OCR模式
  - 准确识别中文医疗文档
- 📋 **患者档案OCR入库**:
  - 自动识别患者文档（姓名、年龄、性别、病历号等）
  - 智能映射到患者信息表单
  - 用户复核后一键入库
- 🏥 **病例库OCR入库**:
  - 自动识别病例文档（诊断、症状、检查结果等）
  - 智能映射到病例表单
  - 用户复核后一键入库
- 🔍 **实验室结果提取**:
  - 从检验报告中提取结构化数据
  - 识别检验项目、数值、参考范围

#### 4. 数据库设计
- 🗄️ **patient_image_annotation_t** (图像标注表):
  - 标注类型、形状、坐标（JSONB）
  - 颜色、标签、编号
  - 裁剪图像URL（用于AI分析）
- 📊 **patient_image_analysis_t** (图像分析表):
  - 分析类型、提示词、结果
  - 关联标注ID、图像ID、会话ID
  - 模型名称、置信度分数

#### 5. MCP工具集
- 🔧 **image_annotation_tools.py** (5个工具):
  - `create_image_annotation` - 创建标注
  - `get_image_annotations` - 获取图像所有标注
  - `update_annotation_label` - 更新标注标签
  - `delete_annotation` - 删除标注
  - `get_annotation_details` - 获取标注详情
- 🤖 **medical_image_analysis_tools.py** (3个工具):
  - `analyze_annotated_region` - 分析标注区域（含图像裁剪）
  - `compare_annotated_regions` - 对比多个标注区域
  - `get_annotation_analysis_history` - 获取分析历史
- 📝 **document_parsing_tools.py** (4个工具):
  - `parse_patient_document` - 解析患者档案文档
  - `parse_case_document` - 解析病例文档
  - `extract_text_from_image` - 纯文本提取
  - `extract_lab_results_from_image` - 实验室结果提取

#### 6. 前端组件架构
- 🎯 **基础组件** (纯UI):
  - `AnnotationCanvas` - 标注画布（绘制、渲染、交互）
  - `AnnotationToolbar` - 工具栏（工具选择、类型选择）
  - `AnnotationList` - 标注列表（展示、编辑、删除）
- 🏗️ **集成组件** (完整功能):
  - `ImageAnnotationView` - 标注主视图（集成所有基础组件）
  - `ImageUploadPurposeModal` - 上传用途选择（3种用途）
- 📋 **业务组件** (OCR表单):
  - `OcrPatientFormModal` - 患者档案OCR表单
  - `OcrCaseFormModal` - 病例库OCR表单

**技术实现**:

**后端架构** (三层架构):
- 数据库层：SQLAlchemy ORM模型 + PostgreSQL JSONB存储坐标
- Service层：业务逻辑编排，调用数据库和MCP工具
- API层：RESTful端点，Pydantic验证，HTTP异常处理

**前端技术栈**:
- react-konva + konva：高性能Canvas标注
- Ant Design：UI组件库
- TypeScript：类型安全
- moment：日期处理

**OCR集成**:
- 通过MCP Client调用PaddleOCR服务（http://localhost:5020/mcp）
- 支持图片URL和Base64两种输入
- 返回结构化文本或详细坐标

**AI分析流程**:
1. 用户圈画标注区域
2. 后端根据坐标裁剪图像
3. 上传裁剪图像到MinIO
4. 调用多模态模型分析（含裁剪图像URL）
5. 保存分析结果到数据库
6. 前端展示分析结果，支持点击"区域X"高亮

**使用场景**:
- 病理医生标注切片图像，AI辅助诊断
- 上传患者档案扫描件，OCR自动录入
- 上传病例文档，OCR自动填充病例表单
- 对标注区域提问："区域1是否为恶性肿瘤？"
- 多区域对比："区域1和区域2有什么区别？"

**用户体验**:
- ✅ 直观的左右分栏界面（图片+聊天）
- ✅ 所见即所得的标注绘制
- ✅ 智能化的OCR识别与表单映射
- ✅ 语义化的区域引用（"区域1"、"区域2"）
- ✅ 聊天中点击区域名称可高亮图片
- ✅ 完整的标注CRUD操作
- ✅ 分析历史记录可追溯

**集成完成** (2025-11-26):
1. ✅ 在ChatInterface中集成ImageUploadPurposeModal - 图片上传后自动弹出用途选择
2. ✅ 在ChatInterface中添加标注模式切换 - 支持全屏标注模式和正常聊天模式切换
3. ✅ 集成ImageAnnotationView组件 - 左右分栏（左侧标注画布，右侧AI聊天占位符）
4. ✅ 集成OCR表单弹窗 - OcrPatientFormModal、OcrCaseFormModal

**集成说明**:
- 📤 **图片上传流程**: 用户上传图片 → 自动显示用途选择弹窗（3个选项）
- 🎨 **病例图片分析**: 选择后聊天页面原地变成左右分栏（左侧标注画布，右侧保留原有聊天界面）
- 📋 **患者档案录入**: 选择后打开OCR患者表单，自动识别并预填充字段
- 📝 **病例库录入**: 选择后打开OCR病例表单，自动识别并预填充字段
- 🔙 **退出标注模式**: 点击"退出标注模式"按钮，聊天页面恢复全屏
- 💾 **状态管理**: 使用React状态管理标注模式、图片URL、表单显示状态
- 🎯 **布局适配**: 标注模式下左侧占50%宽度，聊天区域占50%宽度；非标注模式聊天区域占100%

**待完成工作**:
1. 创建医学图像分析子智能体并分配到医生端Portal
2. 配置多模态视觉模型（GPT-4V或Claude 3.5 Sonnet）
3. 完善标注模式右侧聊天功能（当前为占位符UI）
4. 在标注模式聊天中实现"区域X"语义引用和高亮交互
5. 安装前端依赖：`npm install react-konva konva moment`
6. 运行数据库迁移脚本

---

## 2025-11-23

### 优化病例趋势分析功能，添加时间范围筛选

**修改文件**:
- `backend/tool_collection/mcp/case_library_tools.py` (更新 - 添加时间范围筛选功能)

**功能说明**:

#### 1. 实现时间范围筛选
- ✨ **时间范围计算**：根据 `time_range_days` 参数计算截止日期
- 🔍 **病例筛选**：只分析指定时间范围内的病例（基于 `create_time` 字段）
- 📅 **日期解析**：支持多种日期格式（datetime 对象、ISO 格式字符串、标准格式字符串）
- 🛡️ **容错处理**：日期解析失败时的降级策略

#### 2. 功能增强
- 📊 **返回结果增强**：在返回结果中添加 `cutoff_date` 字段，显示筛选的截止日期
- 💬 **错误提示优化**：当没有找到指定时间范围内的病例时，提供更明确的错误信息
- 🔄 **向后兼容**：如果时间范围很大（≥3650天，约10年），视为"全部时间"，包含没有 `create_time` 的病例

#### 3. 代码改进
- 🎯 **日期比较优化**：正确处理时区问题，只比较日期部分
- 🔧 **格式支持**：支持多种日期格式解析（ISO、标准格式等）
- 📝 **代码可读性**：改进日期处理逻辑，使代码更清晰

**使用场景**:
- "分析最近30天的病例趋势"
- "过去一年中肺腺癌的年龄分布"
- "最近6个月的疾病类型统计"

**技术实现**:
- 计算截止日期：`cutoff_date = datetime.now() - timedelta(days=time_range_days)`
- 遍历所有病例，根据 `create_time` 筛选
- 支持多种日期格式的解析和比较
- 处理边界情况（无日期、解析失败等）

**用户体验**:
- ✅ 时间范围参数现在真正生效
- ✅ 可以分析特定时间段的病例趋势
- ✅ 返回结果包含截止日期信息，更透明
- ✅ 错误提示更清晰，帮助用户理解筛选结果

---

### 实现真实相似度计算，替换硬编码假数据

**修改文件**:
- `backend/tool_collection/mcp/case_library_tools.py` (更新 - 实现真实相似度计算算法)

**功能说明**:

#### 1. 相似度计算函数实现
- ✨ **诊断相似度计算** (`calculate_diagnosis_similarity`):
  - 完全匹配：返回 1.0
  - 部分匹配：计算重叠比例
  - 词级相似度：使用 Jaccard 相似度计算
- ✨ **症状相似度计算** (`calculate_symptom_similarity`):
  - 支持字典和字符串格式的症状列表
  - 使用 Jaccard 相似度和匹配比例加权平均
  - 考虑症状匹配数量和覆盖率
- ✨ **综合相似度计算** (`calculate_case_similarity`):
  - 诊断相似度权重：0.5
  - 症状相似度权重：0.4
  - 疾病类型匹配奖励：0.1（额外加分）
  - 加权平均计算最终相似度分数
  - 生成详细的相似度原因说明

#### 2. 替换硬编码假数据
- ❌ **移除假数据**：
  - 删除诊断匹配固定分数 0.8
  - 删除症状匹配固定分数 0.6
- ✅ **真实计算**：
  - 根据实际诊断文本计算相似度
  - 根据症状匹配情况动态计算分数
  - 相似度分数范围：0.0 - 1.0
  - 分数保留 3 位小数

#### 3. 功能优化
- 🔍 **完整病例详情获取**：计算相似度时获取完整病例详情，确保准确性
- 🚫 **去重机制**：使用 `seen_case_nos` 集合避免重复添加相同病例
- 📊 **返回结果增强**：添加 `case_title` 和 `disease_type` 字段到返回结果
- 🎯 **过滤低相似度**：只返回相似度 > 0 的病例

**技术实现**:

**相似度算法**:
- 诊断相似度：完全匹配 → 部分匹配 → 词级 Jaccard
- 症状相似度：Jaccard 相似度 (60%) + 匹配比例 (40%)
- 综合相似度：加权平均，考虑多个匹配维度

**代码改进**:
- 添加 `Tuple` 类型导入，修复类型注解兼容性
- 优化代码结构，提取相似度计算为独立函数
- 改进错误处理和边界情况处理

**用户体验**:
- ✅ 相似度分数真实反映病例相似程度
- ✅ 相似度原因说明更详细和准确
- ✅ 排序结果更合理，高相似度病例优先显示
- ✅ 避免重复病例出现在结果中

---

## 2025-11-23

### 代码更新：修复数据库操作和前端组件优化

**操作内容**:
- 🌿 **创建新分支**: `feature/code-updates-20251123`
- 📦 **提交更改**: 22 个文件，322 行新增，286 行删除
- 🚀 **推送到 GitHub**: 成功推送到远程仓库

**主要更新文件**:

**后端文件**:
- `backend/database/care_plan_db.py` (更新)
- `backend/database/conversation_db.py` (更新)
- `backend/database/knowledge_db.py` (更新)
- `backend/database/learning_record_db.py` (更新)
- `backend/database/medical_case_db.py` (更新)
- `backend/database/memory_config_db.py` (更新)
- `backend/database/patient_db.py` (更新)
- `backend/database/tool_db.py` (更新)
- `backend/database/user_tenant_db.py` (更新)
- `backend/services/agent_service.py` (更新)
- `backend/services/user_management_service.py` (更新)
- `backend/tool_collection/mcp/patient_management_tools.py` (更新)

**前端文件**:
- `frontend/app/[locale]/chat/components/chatInput.tsx` (更新)
- `frontend/app/[locale]/chat/components/chatLeftSidebar.tsx` (更新)
- `frontend/app/[locale]/chat/internal/chatInterface.tsx` (更新)
- `frontend/app/[locale]/chat/streaming/chatStreamHandler.tsx` (更新)
- `frontend/app/[locale]/chat/streaming/chatStreamMain.tsx` (更新)
- `frontend/app/[locale]/setup/agents/components/AgentSetupOrchestrator.tsx` (更新)
- `frontend/services/agentConfigService.ts` (更新)
- `frontend/types/agentConfig.ts` (更新)

**新增文件**:
- `backend/scripts/delete_tool_info.py` (新建 - 数据库清理脚本)

**功能说明**:
- 🔧 **数据库操作优化**: 更新多个数据库操作文件，改进数据访问和处理逻辑
- 🎨 **前端组件优化**: 优化聊天界面相关组件，改进用户体验
- 🛠️ **服务层改进**: 更新代理服务和用户管理服务，提升功能稳定性
- 📝 **工具脚本**: 新增数据库清理脚本，用于维护数据库

**分支信息**:
- 分支名称: `feature/code-updates-20251123`
- 远程仓库: `origin/feature/code-updates-20251123`
- 提交 ID: `d1403441`

---

### 清除ImageAnnotator.tsx文件空行并创建新分支

**操作内容**:
- 🌿 **创建新分支**: `feature/remove-blank-lines-20251123`
- 📦 **提交更改**: 21 个文件，118475 行新增，1145 行删除
- 🚀 **推送到 GitHub**: 成功推送到远程仓库

**主要更新文件**:
- `frontend/components/image-annotation/ImageAnnotator.tsx` (更新 - 清除所有空行，优化代码格式)

**功能说明**:
- 🧹 **代码清理**: 清除 ImageAnnotator.tsx 文件中的所有空行和空白行，使代码更紧凑
- 📝 **格式优化**: 统一代码格式，提升代码可读性

**分支信息**:
- 分支名称: `feature/remove-blank-lines-20251123`
- 远程仓库: `origin/feature/remove-blank-lines-20251123`
- 提交 ID: `aebfca6b`

---

## 2025-11-22

### 修复时间线附件删除功能错误

**问题描述**:
- 删除时间线附件时出现 "Internal Server Error"
- `delete_timeline_attachments_service` 函数在 service 层缺失
- 数据库层删除函数缺少 `session.commit()` 导致更改未保存

**修改文件**:
- `backend/services/patient_service.py` (更新 - 添加缺失的 `delete_timeline_attachments_service` 函数)
- `backend/database/patient_db.py` (修复 - 在删除函数中添加 `session.commit()`)

**修复内容**:
1. ✅ 在 `patient_service.py` 中添加 `delete_timeline_attachments_service` 函数
2. ✅ 在 `delete_timeline_attachments` 函数中添加 `session.commit()`
3. ✅ 同时修复了 `delete_timeline_images` 和 `delete_timeline_metrics` 函数缺少 `session.commit()` 的问题

**影响范围**:
- 修复了时间线附件删除功能
- 同时修复了时间线图片和指标删除功能的潜在问题

---

### 代码变更分支创建

**操作内容**:
- 🌿 **创建新分支**: `feature/changes-20251122`
- 📦 **提交更改**: 17 个文件，1001 行新增，216 行删除
- 🚀 **推送到 GitHub**: 成功推送到远程仓库

**主要更新文件**:

**前端文件**:
- `frontend/app/[locale]/chat/components/chatHeader.tsx` (更新 - 优化聊天头部组件)
- `frontend/app/[locale]/chat/components/chatInput.tsx` (更新 - 优化聊天输入组件)
- `frontend/components/doctor/cases/CaseDetailView.tsx` (更新 - 更新医生端病例详情视图)
- `frontend/components/doctor/patients/EditTimelineDetailModal.tsx` (更新 - 优化患者时间线编辑模态框)

**新功能模块**:
- `hiv_aids_qa_pipeline/` (新建 - HIV/AIDS QA 处理管道)
  - `hiv_aids_qa_pipeline/config.py` (新建 - 配置文件)
  - `hiv_aids_qa_pipeline/scripts/01_extract_and_clean.py` (新建 - PDF提取和清理脚本)
  - `hiv_aids_qa_pipeline/scripts/02_make_chunks.py` (新建 - 文本分块脚本)
  - `hiv_aids_qa_pipeline/scripts/03_generate_doctor_qa.py` (新建 - 生成医生端QA脚本)
  - `hiv_aids_qa_pipeline/scripts/04_generate_patient_qa.py` (新建 - 生成患者端QA脚本)
  - `hiv_aids_qa_pipeline/utils/` (新建 - 工具模块：分块器、LLM客户端、PDF工具、文本清理等)

**文档更新**:
- `Update.md` (更新 - 记录本次变更)

---

### 对话管理功能增强 - 患者关联与状态管理

**操作内容**:
- 🌿 **创建新分支**: `feature/conversation-management-enhancements-20251122`
- 📦 **提交更改**: 18 个文件，2162 行新增，64 行删除
- 🚀 **推送到 GitHub**: 成功推送到远程仓库

**主要更新文件**:

**后端文件**:
- `backend/apps/conversation_management_app.py` (更新 - 添加患者关联、状态、标签、摘要管理接口)
- `backend/consts/model.py` (更新 - 新增请求模型类型)
- `backend/database/conversation_db.py` (更新 - 添加患者关联、状态、标签、摘要数据库操作，修复 logger 导入)
- `backend/database/db_models.py` (更新 - ConversationRecord 模型添加新字段)
- `backend/services/conversation_management_service.py` (更新 - 添加服务层方法)
- `backend/database/migrations/add_conversation_patient_link.sql` (新建 - 数据库迁移脚本)
- `backend/database/migrations/run_conversation_link_migration.py` (新建 - 迁移执行脚本)

**前端文件**:
- `frontend/app/[locale]/chat/components/chatHeader.tsx` (更新 - 添加患者关联、状态、标签、摘要管理UI)
- `frontend/app/[locale]/chat/components/PatientSelector.tsx` (新建 - 患者选择器组件)
- `frontend/app/[locale]/chat/components/ConversationStatus.tsx` (新建 - 对话状态管理组件)
- `frontend/app/[locale]/chat/components/TagsManager.tsx` (新建 - 标签管理组件)
- `frontend/app/[locale]/chat/components/SummaryEditor.tsx` (新建 - 摘要编辑器组件)
- `frontend/app/[locale]/chat/internal/chatInterface.tsx` (更新 - 集成新组件)
- `frontend/services/conversationService.ts` (更新 - 添加新API调用方法)
- `frontend/services/api.ts` (更新 - 添加API端点)
- `frontend/types/chat.ts` (更新 - 扩展 ConversationListItem 类型定义)
- `frontend/types/conversation.ts` (更新 - 类型定义)

**功能说明**:

#### 1. 对话-患者关联功能
- 🔗 **患者关联**：
  - 支持将对话关联到特定患者
  - 支持取消关联（设置为无患者）
  - 在医生端聊天界面显示患者选择器
  - 自动保存关联关系到数据库
- 📋 **患者信息显示**：
  - 在对话列表中显示关联的患者ID和姓名
  - 支持按患者ID筛选对话列表

#### 2. 对话状态管理
- 📊 **状态类型**：
  - `active` - 进行中
  - `pending_followup` - 待跟进
  - `difficult_case` - 疑难病例
  - `completed` - 已完成
  - `archived` - 已归档
- 🎯 **状态切换**：
  - 在聊天界面顶部显示状态选择器
  - 支持快速切换对话状态
  - 归档时自动记录归档时间戳

#### 3. 对话标签管理
- 🏷️ **标签功能**：
  - 支持为对话添加多个自定义标签
  - 支持编辑和删除标签
  - 标签颜色自动分配
  - 支持按标签筛选对话列表
- 🎨 **UI交互**：
  - 双击标签可编辑
  - 点击删除按钮可移除标签
  - 最多支持10个标签

#### 4. 对话摘要编辑
- 📝 **摘要功能**：
  - 支持为对话添加和编辑摘要
  - 摘要显示在对话列表中
  - 支持多行文本编辑
  - 自动保存到数据库

#### 5. 数据库迁移
- 🗄️ **新增字段**：
  - `patient_id` - 关联患者ID
  - `patient_name` - 患者姓名（冗余字段，优化查询）
  - `conversation_status` - 对话状态
  - `tags` - 标签数组
  - `summary` - 对话摘要
  - `archived_at` - 归档时间戳
  - `archived_to_timeline` - 是否归档到患者时间线
- 🔧 **索引优化**：
  - 为常用查询字段创建索引
  - 添加状态验证函数和触发器

**技术实现**:

**后端架构**:
- 数据库层：添加 CRUD 操作方法
- 服务层：封装业务逻辑
- API层：提供 RESTful 接口
- 数据验证：状态值验证、约束检查

**前端架构**:
- 组件化设计：独立的可复用组件
- 状态管理：使用 React hooks 管理本地状态
- 类型安全：完整的 TypeScript 类型定义
- 错误处理：完善的错误处理和用户反馈

**Bug修复**:
- ✅ 修复 Select 组件 null 值警告（使用空字符串替代）
- ✅ 修复 TagsManager 无限循环问题（添加更新标志）
- ✅ 修复 logger 未定义错误（添加 logging 导入）
- ✅ 修复类型定义缺失问题（扩展 ConversationListItem 接口）
- ✅ 修复 date_range 变量命名不一致问题
- ✅ 修复 API 返回格式问题（添加缺失的返回语句）

**用户体验**:
- ✅ 医生端聊天界面功能更丰富
- ✅ 对话管理更便捷（状态、标签、摘要）
- ✅ 患者关联功能提升工作效率
- ✅ 所有操作实时保存，无需手动刷新

**分支信息**:
- 分支名称: `feature/conversation-management-enhancements-20251122`
- 远程仓库: `origin/feature/conversation-management-enhancements-20251122`
- 提交 ID: `0617f926`

---

## 2025-11-21

### 管理员端UI优化与内存溢出修复

**操作内容**:
- 🌿 **创建新分支**: `feature/admin-ui-cleanup-20251121`
- 📦 **提交更改**: 8 个文件，包含UI优化和内存修复

**主要更新文件**:

**前端文件**:
- `frontend/app/[locale]/admin/components/AgentAssignment.tsx` (更新 - 移除student和admin端口支持，只保留doctor和patient)
- `frontend/app/[locale]/chat/internal/chatInterface.tsx` (更新 - 调整管理员端默认视图逻辑)
- `frontend/const/portalChatConfig.ts` (更新 - 移除管理员端"对话"和"系统设置"导航项)
- `frontend/services/portalAgentAssignmentService.ts` (更新 - PortalType类型只包含doctor和patient)
- `frontend/package.json` (更新 - 增加Node.js内存限制到4GB)
- `frontend/start-dev.sh` (更新 - 添加内存限制环境变量)
- `frontend/components/admin/.gitkeep` (删除)
- `frontend/components/common/.gitkeep` (删除)

**功能说明**:

#### 1. 智能体分配功能简化
- 🎯 **移除student和admin端口支持**：
  - PortalType类型简化为 `"doctor" | "patient"`
  - 从AgentAssignment组件中移除所有student和admin相关代码
  - 只保留医生端和患者端的智能体分配功能
- 🔧 **代码清理**：
  - 移除Promise.all中的student和admin数据加载
  - 简化初始化状态对象

#### 2. 管理员端侧边栏优化
- ✨ **移除冗余导航项**：
  - 删除"对话"导航项（管理员端不再需要对话功能）
  - 删除"系统设置"导航项（功能已整合到其他配置页面）
- 📐 **默认视图调整**：
  - 管理员端默认视图改为第一个导航项（智能体配置）
  - 自动根据variant设置合适的默认视图

#### 3. Node.js内存溢出修复
- 🚀 **增加内存限制**：
  - 所有构建和开发脚本增加 `--max-old-space-size=4096` 参数（4GB）
  - 修复 Next.js 构建/开发时的 JavaScript heap out of memory 错误
  - 更新 package.json 中的 dev、build、start、type-check 脚本
  - 更新 start-dev.sh 脚本设置环境变量

**技术实现**:

**类型系统优化**:
- PortalType类型从 `"doctor" | "student" | "patient" | "admin"` 简化为 `"doctor" | "patient"`
- 确保类型定义与实际使用保持一致

**内存管理**:
- 使用 NODE_OPTIONS 环境变量设置内存限制
- 4GB 内存限制足以支持大型 Next.js 项目的构建和开发

**用户体验**:
- ✅ 管理员端侧边栏更简洁，只显示必要的配置选项
- ✅ 智能体分配界面更清晰，专注于医生端和患者端
- ✅ 构建和开发过程不再出现内存溢出错误

**分支信息**:
- 分支名称: `feature/admin-ui-cleanup-20251121`
- 基于: `feature/care-plan-api-update-20251120`

---

### 患者时间线功能更新

**操作内容**:
- 🌿 **创建新分支**: `feature/patient-timeline-updates-20251121`
- 📦 **提交更改**: 8 个文件，335 行新增，12 行删除
- 🚀 **推送到 GitHub**: 成功推送到远程仓库

**主要更新文件**:

**后端文件**:
- `backend/apps/patient_app.py` (更新 - 新增时间线详情更新接口)
- `backend/database/patient_db.py` (更新 - 优化时间线详情数据库操作)
- `backend/services/patient_service.py` (更新 - 完善患者服务层)

**前端文件**:
- `frontend/components/doctor/patients/EditTimelineDetailModal.tsx` (更新 - 增强时间线详情编辑功能)
- `frontend/components/doctor/patients/PatientTimeline.tsx` (更新)
- `frontend/services/api.ts` (更新)
- `frontend/services/medicalCaseService.ts` (更新)
- `frontend/services/patientService.ts` (更新 - 新增时间线详情相关服务)

**功能说明**:
- ✨ **患者时间线编辑功能增强**: 支持图片、指标和附件管理
- 🔧 **后端API扩展**: 新增时间线详情更新接口
- 📊 **前端服务优化**: 完善患者服务API调用
- 🗄️ **数据库层优化**: 优化时间线详情相关操作

**分支信息**:
- 分支名称: `feature/patient-timeline-updates-20251121`
- 远程仓库: `origin/feature/patient-timeline-updates-20251121`

---

## 2025-11-19


### 患者档案功能增强与康复计划数据库迁移
 
**操作内容**:
- 📦 **提交更改**: 5 个文件，264 行新增，60 行删除
- 🗄️ **数据库迁移**: 创建康复计划管理系统的完整迁移脚本
 
**主要更新文件**:
 
**后端文件**:
- `backend/apps/patient_app.py` (更新 - 修复邮箱字段缺失)
- `backend/database/migrations/create_care_plan_tables.sql` (新建 - SQL迁移脚本)
- `backend/database/migrations/run_care_plan_migration.py` (新建 - Python执行脚本)
- `backend/database/migrations/CARE_PLAN_MIGRATION_README.md` (新建 - 迁移文档)
- `.gitignore` (新建 - Git忽略规则)
 
**前端文件**:
- `frontend/components/doctor/patients/PatientOverview.tsx` (重构 - 添加邮箱显示和可编辑功能)
 
**功能说明**:
 
#### 1. 患者档案基本信息编辑功能
- ✨ **EditableField组件**：
  - 鼠标悬停字段时右侧显示编辑按钮（铅笔图标）
  - 支持4种输入类型：text（单行文本）、number（数字）、select（下拉选择）、textarea（多行文本）
  - 编辑状态下显示保存（绿色勾号）和取消（叉号）按钮
  - 点击保存后立即调用API更新数据并刷新页面
- 📝 **可编辑字段**：
  - 基本信息：姓名、性别（下拉）、年龄（数字）、病历号
  - 联系信息：出生日期、联系电话、邮箱、地址（多行）
  - 医疗史：过敏史（多行，支持顿号/逗号分隔）、家族史（多行）、既往病史（多行，支持顿号/逗号分隔）
- 🎯 **交互体验**：
  - 使用 `group-hover:opacity-100` 实现编辑按钮淡入效果
  - 与病例库编辑功能保持一致的交互体验
  - 数组字段自动处理：显示时用顿号连接，编辑时支持多种分隔符输入
 
#### 2. 邮箱字段显示与保存修复
- 📧 **邮箱字段显示**：在患者档案基本信息中添加邮箱显示，位于联系电话和地址之间
- 🐛 **修复新建患者档案邮箱未保存问题**：
  - 问题原因：后端 `CreatePatientRequest` 模型缺少 `email` 字段
  - 解决方案：在 Pydantic 模型中添加 `email: str = Field(..., description="Patient email address")`
  - 前端表单已正确传递邮箱，数据库模型和数据库层也已支持，只是API层缺失
 
#### 3. 康复计划数据库迁移脚本
- 🗄️ **创建5个数据库表**：
  - `care_plan_t` - 康复计划主表（计划名称、描述、开始/结束日期、状态）
  - `care_plan_medication_t` - 用药安排表（药品名称、剂量、频率、时间点、注意事项）
  - `care_plan_task_t` - 康复任务表（任务标题、描述、类别、频率、持续时间）
  - `care_plan_precaution_t` - 注意事项表（内容、优先级）
  - `care_plan_completion_t` - 完成记录表（日期、项目类型、完成状态、备注）
- 📊 **11个性能优化索引**：
  - care_plan_t: patient_id, status, tenant_id
  - care_plan_medication_t: plan_id
  - care_plan_task_t: plan_id, task_category
  - care_plan_precaution_t: plan_id
  - care_plan_completion_t: plan_id, patient_id+record_date（复合索引）, item_type+item_id（复合索引）
#### 4. 医生端康复计划的可视化

**技术实现**:

 

**EditableField组件**:
- 使用 React hooks 管理编辑状态（`editingField`, `editValues`）
- 支持不同输入类型的条件渲染（Input, TextArea, InputNumber, Select）
- 数组字段的智能处理：编辑时将数组转为字符串，保存时按分隔符拆分回数组
- 优雅的交互动画：opacity过渡、group-hover效果
 
**数据库迁移**:
- SQL迁移脚本：使用PostgreSQL的DO块实现条件创建
- Python执行脚本：自动读取SQL文件、连接数据库、执行迁移、显示结果
- 完整文档：包含表结构说明、运行指南、验证方法、回滚说明
 

 

**康复计划数据关系**:
```
patient_info_t (患者信息)
    ↓ 1:N
care_plan_t (康复计划主表)
    ↓ 1:N
    ├─→ care_plan_medication_t (用药安排)
    ├─→ care_plan_task_t (康复任务)
    ├─→ care_plan_precaution_t (注意事项)
    └─→ care_plan_completion_t (完成记录) ←── 追踪medication和task的完成情况
```

 

---


## 2025-11-19

### 医疗案例和患者相关功能更新

**操作内容**:
- 🌿 **创建新分支**: `feature/medical-case-updates-20250121`
- 📦 **提交更改**: 17 个文件，2212 行新增，2126 行删除
- 🚀 **推送到 GitHub**: 成功推送到远程仓库

**主要更新文件**:

**前端文件**:
- `frontend/components/doctor/cases/CaseDetailView.tsx` (更新 - 病例详情视图优化)
- `frontend/components/doctor/knowledge/KnowledgeBaseView.tsx` (更新)
- `frontend/components/doctor/patients/EditTimelineDetailModal.tsx` (更新)
- `frontend/components/doctor/patients/PatientListView.tsx` (更新)
- `frontend/components/doctor/patients/PatientTimeline.tsx` (更新)
- `frontend/components/doctor/patients/PatientTodos.tsx` (更新)
- `frontend/services/api.ts` (更新)
- `frontend/services/patientService.ts` (更新)
- `frontend/components/doctor/cases/EditCaseDialog.tsx` (删除)

**后端文件**:
- `backend/apps/base_app.py` (更新)
- `backend/apps/medical_case_app.py` (更新)
- `backend/apps/patient_app.py` (更新)
- `backend/database/db_models.py` (更新)
- `backend/database/patient_db.py` (更新)
- `backend/services/patient_service.py` (更新)

**其他文件**:
- `Update.md` (更新)
- `backend/flower_db.sqlite` (更新)

**功能说明**:
- 🔧 **医疗案例功能优化**: 更新病例详情视图和相关组件
- 👥 **患者管理功能更新**: 优化患者列表、时间线和待办事项功能
- 🗄️ **数据库模型更新**: 更新患者和医疗案例相关的数据库模型
- 🔌 **API服务更新**: 优化前后端API接口和服务

**分支信息**:
- 分支名称: `feature/medical-case-updates-20250121`
- 远程仓库: `origin/feature/medical-case-updates-20250121`

---

## 2025-11-18

### 病例管理功能完善与代码优化

**操作内容**:
- 📦 **提交更改**: 15 个文件，1609 行新增，1529 行删除
- 🎨 **代码优化**: 统一代码格式，提升可读性和可维护性

**主要更新文件**:

**前端文件**:
- `frontend/components/doctor/cases/CreateCaseDialog.tsx` (新建 - 创建病例对话框)
- `frontend/components/doctor/cases/EditCaseDialog.tsx` (新建 - 编辑病例对话框)
- `frontend/components/doctor/cases/CaseDetailView.tsx` (重构 - 添加编辑功能和真实数据加载)
- `frontend/components/doctor/cases/CaseLibraryView.tsx` (更新 - 添加新建病例功能)
- `frontend/components/doctor/knowledge/KnowledgeBaseView.tsx` (代码格式优化)
- `frontend/components/doctor/patients/PatientListView.tsx` (代码优化)
- `frontend/components/doctor/patients/PatientTimeline.tsx` (代码优化)
- `frontend/components/doctor/patients/PatientTodos.tsx` (代码优化)
- `frontend/services/patientService.ts` (更新 - 添加删除时间线功能)
- `frontend/services/api.ts` (更新)

**后端文件**:
- `backend/apps/base_app.py` (更新)
- `backend/apps/patient_app.py` (更新)
- `backend/database/db_models.py` (更新)
- `backend/database/patient_db.py` (更新)
- `backend/services/patient_service.py` (更新)

**文档文件**:
- `Update.md` (整理 - 按日期排序，移除 bug 修复，只保留功能更新)

**功能说明**:

#### 1. 病例管理功能完善
- ✨ **创建病例功能**：
  - 新增 `CreateCaseDialog` 组件，支持创建新病例
  - 包含基本信息、病史、检查、诊疗方案等完整表单
  - 支持疾病类型、年龄、性别等字段选择
  - 表单验证和错误处理
- ✨ **编辑病例功能**：
  - 新增 `EditCaseDialog` 组件，支持编辑现有病例
  - 使用标签页组织表单（基本信息、病史、检查、诊疗方案、临床备注）
  - 自动加载现有病例数据到表单
  - 支持更新基本信息和详细信息
- 🔄 **病例详情页增强**：
  - 添加"编辑"按钮，点击后打开编辑对话框
  - 从后端 API 加载真实病例数据
  - 显示加载状态和错误处理
  - 病例编号和诊断信息动态显示
- ➕ **病例库视图增强**：
  - 添加"新建病例"按钮
  - 点击后打开创建病例对话框
  - 创建成功后自动刷新病例列表

#### 2. 患者服务功能扩展
- 🗑️ **删除时间线功能**：
  - 新增 `deleteTimeline()` 函数
  - 支持删除患者时间线阶段
  - 完整的错误处理和日志记录
- 🔧 **API 路径修复**：
  - 修复 `getPatientByEmail()` 函数的 API 路径构建问题
  - 使用更安全的路径替换方式

#### 3. 代码格式优化
- 🎨 **统一代码风格**：
  - 清理所有多余的空行
  - 统一代码格式和缩进
  - 优化导入语句组织
  - 提升代码可读性
- 📊 **代码质量提升**：
  - 多个组件文件进行了格式优化
  - 统一使用 Ant Design 组件替代 shadcn/ui
  - 改进代码结构和可维护性

#### 4. 文档整理
- 📝 **Update.md 重构**：
  - 按更新日期从新到旧排序
  - 移除所有 bug 修复记录，只保留功能更新
  - 统一文档格式和结构
  - 提升文档可读性

**技术实现**:

**前端组件**:
- 使用 Ant Design 的 Modal、Form、Input、Select 等组件
- 表单验证和错误处理
- 状态管理和数据加载
- 标签页组织复杂表单

**后端服务**:
- 患者时间线删除 API
- 病例 CRUD 操作支持
- 数据验证和错误处理

**用户体验**:
- ✅ 病例创建和编辑流程完整
- ✅ 表单验证提示清晰
- ✅ 加载状态和错误处理完善
- ✅ 操作成功后自动刷新数据
- ✅ 代码格式统一，易于维护

---

## 2025-11-18

### 学习记录功能实现

**操作内容**:
- 🌿 **创建新分支**: `fix/backend-service-and-antd-warning-20251118`
- 📦 **提交更改**: 4 个文件，516 行新增，1 行删除
- 🚀 **推送到 GitHub**: 成功推送到远程仓库

**主要更新文件**:

**后端文件**:
- `backend/database/learning_record_db.py` (新建 - 学习记录数据库操作层)
- `backend/services/learning_record_service.py` (新建 - 学习记录服务层)
- `backend/apps/learning_record_app.py` (新建 - 学习记录 API 端点)

**功能说明**:

#### 学习记录系统
- ✨ **完整的学习记录功能**：
  - `record_view()` - 记录或更新学习记录（支持新增和更新）
  - `get_user_records()` - 获取用户学习记录列表（支持分页）
  - `get_stats()` - 获取学习统计信息（总记录数、总浏览次数、总学习时长）
  - `delete_record()` - 软删除单个记录
  - `clear_all_records()` - 清除用户所有记录
- 📊 **学习统计**：
  - 记录用户对知识库文件的浏览情况
  - 统计总浏览次数和总学习时长
  - 支持按分类筛选学习记录

**技术实现**:

**数据库层** (`learning_record_db.py`):
- 遵循项目现有的数据库层规范
- 使用 `get_db_session()` 进行数据库会话管理
- 实现软删除机制（`delete_flag`）
- 支持租户隔离（`tenant_id`）
- 正确设置审计字段（`created_by`, `updated_by`）

**服务层** (`learning_record_service.py`):
- 异步函数处理（async/await）
- 统一的异常处理和日志记录

**API 层** (`learning_record_app.py`):
- RESTful API 设计
- 支持认证授权
- 统一的 JSONResponse 响应格式

**分支信息**:
- 分支名称: `fix/backend-service-and-antd-warning-20251118`
- 远程仓库: `origin/fix/backend-service-and-antd-warning-20251118`

---

## 2025-11-18

### 患者概览组件优化

**操作内容**:
- 🌿 **创建新分支**: `feature/patient-overview-optimization-20251118`
- 📦 **提交更改**: 4 个文件，215 行新增，104 行删除
- 🚀 **推送到 GitHub**: 成功推送到远程仓库

**主要更新文件**:
- `frontend/components/doctor/patients/PatientOverview.tsx` (重构优化)
- `frontend/components/doctor/patients/CreateTodoModal.tsx` (更新)
- `frontend/components/doctor/patients/PatientDetailView.tsx` (更新)
- `backend/apps/patient_app.py` (更新)

**功能说明**:

#### PatientOverview 组件优化
- ✨ **代码结构重构**：
  - 提取辅助函数到组件顶部（formatDate, formatDaysUntil, getStageIcon）
  - 使用 `useMemo` 优化计算值性能
  - 统一变量命名（timeline → timelines）
  - 优化条件渲染逻辑
- 🚀 **性能优化**：
  - 使用 `useMemo` 缓存 `urgentTodos`、`nextCheckup`、`recentTimelines`
  - 缓存统计计算（checkCount, completedCount, treatmentCount, followupCount）
  - 提取 `latestTimeline` 变量避免重复访问
- 📊 **数据展示优化**：
  - 动态显示真实数据替代硬编码
  - 显示实际就诊记录、待办事项、时间线数据
  - 优化紧急待办展示逻辑

**技术改进**:
- 使用 React `useMemo` hook 优化性能
- 提取可复用辅助函数
- 统一代码格式和缩进
- 改进代码可读性和可维护性

**分支信息**:
- 分支名称: `feature/patient-overview-optimization-20251118`
- 远程仓库: `origin/feature/patient-overview-optimization-20251118`

---

## 2025-11-17

### 患者时间线和待办事项功能完善

**操作内容**:
- 🌿 **创建新分支**: `feature/patient-api-fix-20251117`
- 📦 **提交更改**: 7 个文件，1119 行新增，301 行删除
- 🚀 **推送到 GitHub**: 成功推送到远程仓库

**主要更新文件**:

**前端文件**:
- `frontend/services/api.ts` (更新)
- `frontend/components/doctor/patients/PatientTimeline.tsx` (更新)
- `frontend/components/doctor/patients/PatientTodos.tsx` (重构 - 统一使用 Ant Design 组件)
- `frontend/components/doctor/patients/CreateTimelineModal.tsx` (新建)
- `frontend/components/doctor/patients/CreateTodoModal.tsx` (新建)
- `frontend/components/doctor/patients/EditTimelineDetailModal.tsx` (新建)

**功能说明**:

#### 1. PatientTodos 组件重构
- 🎨 **代码结构优化**：
  - 统一导入语句组织，按类型分组
  - 移除 shadcn/ui 组件依赖，统一使用 Ant Design 组件库
  - 清理多余空行，统一代码格式
- 🔧 **组件库统一**：
  - 将 Card、CardContent 从 shadcn/ui 改为 Ant Design Card 组件
  - 将 Button 从 shadcn/ui 改为 Ant Design Button 组件
  - 将 Checkbox 从 shadcn/ui 改为 Ant Design Checkbox 组件
- ✨ **代码质量提升**：
  - 提取常量 `PRIMARY_COLOR` 用于主题色管理
  - 创建 `formatDate` 辅助函数统一日期格式化逻辑
  - 创建 `getPriorityColor` 辅助函数统一优先级颜色映射

#### 2. 新增 Modal 组件
- 📝 **CreateTimelineModal**: 创建时间线阶段的弹窗组件
- 📝 **CreateTodoModal**: 创建待办事项的弹窗组件
- 📝 **EditTimelineDetailModal**: 编辑时间线详情的弹窗组件

**技术改进**:
- 使用 Ant Design 组件替代 shadcn/ui 组件
- 提取辅助函数减少代码重复
- 统一代码格式和结构

**分支信息**:
- 分支名称: `feature/patient-api-fix-20251117`
- 远程仓库: `origin/feature/patient-api-fix-20251117`

---

## 2025-11-17

### 患者门户同步功能更新

**操作内容**:
- 🌿 **创建新分支**: `feature/patient-portal-update-20251117`
- 📦 **提交更改**: 14 个文件，813 行新增，269 行删除
- 🚀 **推送到 GitHub**: 成功推送到远程仓库

**主要更新文件**:

**后端文件**:
- `backend/apps/patient_app.py` (更新)
- `backend/database/client.py` (更新)
- `backend/database/db_models.py` (更新)
- `backend/database/patient_db.py` (更新)
- `backend/services/patient_service.py` (更新)

**前端文件**:
- `frontend/components/doctor/patients/CreatePatientDialog.tsx` (更新)
- `frontend/components/patient/profile/BasicInfoTab.tsx` (更新)
- `frontend/components/patient/profile/DiagnosisHistoryTab.tsx` (更新)
- `frontend/components/patient/profile/TimelineTab.tsx` (更新)
- `frontend/services/patientService.ts` (更新)
- `frontend/types/patient.ts` (更新)

**新增文件**:
- `PATIENT_PORTAL_SYNC.md` (新建 - 患者门户同步功能文档)
- `backend/database/migrations/add_email_and_diagnosis_to_patient.sql` (新建 - 数据库迁移脚本)
- `backend/database/migrations/run_email_migration.py` (新建 - 迁移执行脚本)

**功能说明**:
- 患者门户同步功能更新，添加邮箱和诊断历史功能
- 数据库迁移：为患者表添加邮箱和诊断历史字段
- 前后端数据模型同步更新

**分支信息**:
- 分支名称: `feature/patient-portal-update-20251117`
- 远程仓库: `origin/feature/patient-portal-update-20251117`

---

## 2025-11-17

### 病例数据库迁移

**修改文件**:
- `backend/database/migrations/create_medical_case_tables.sql` (新建)
- `backend/database/migrations/run_medical_case_migration.py` (更新)

**功能说明**:
- 🗄️ **创建病例库数据库表结构**：完整实现病例管理系统的数据库迁移脚本
- 📋 **7个核心表**：
  1. `medical_case_t` - 病例基本信息表（病例编号、诊断、疾病类型、年龄、性别等）
  2. `medical_case_detail_t` - 病例详细信息表（现病史、既往史、家族史、体格检查、影像结果等）
  3. `medical_case_symptom_t` - 病例症状表（症状名称、描述、是否关键症状）
  4. `medical_case_lab_result_t` - 实验室检查结果表（检验项目、数值、单位、正常范围等）
  5. `medical_case_image_t` - 医学影像表（影像类型、描述、URL、缩略图等）
  6. `medical_case_favorite_t` - 用户收藏表（用户与病例的收藏关系）
  7. `medical_case_view_history_t` - 浏览历史表（用户浏览病例的记录）
- 🔧 **完整功能**：
  - 创建所有序列（Sequence）用于主键自增
  - 创建所有表结构，包含标准字段（create_time, update_time, created_by, updated_by, delete_flag）
  - 创建必要的索引提升查询性能
  - 创建触发器自动更新update_time字段
- 📊 **数据完整性**：
  - 支持软删除（delete_flag）
  - 租户隔离（tenant_id）
  - 审计字段（created_by, updated_by）
  - JSONB字段存储复杂数据结构（tags, medications, physical_examination等）

**技术实现**:
- 使用PostgreSQL的DO $$ ... END $$块实现幂等性迁移
- 检查表/序列/索引/触发器是否存在，避免重复创建
- 遵循项目现有的数据库迁移规范

**执行命令**:
```bash
cd /opt && source backend/.venv/bin/activate && python3 backend/database/migrations/run_medical_case_migration.py
```

---

## 2025-11-16

### 医生端知识库卡片功能

**修改文件**:

**后端**:
- `backend/database/db_models.py` (更新 - 添加 knowledge_file_card_t 表)
- `backend/database/knowledge_card_db.py` (新建 - 知识卡片 CRUD)
- `backend/database/migrations/create_knowledge_file_card_table.sql` (新建)
- `backend/database/migrations/run_knowledge_file_card_migration.py` (新建)

**前端**:
- `frontend/components/doctor/knowledge/KnowledgeBaseView.tsx` (重构 - 集成文档详情视图)
- `frontend/app/[locale]/doctor/knowledge/page.tsx` (更新 - 调整布局架构)
- `frontend/components/knowledges/components/card/CardEditDialog.tsx` (新建)
- `frontend/components/knowledges/components/document/DocumentList.tsx` (更新)
- `frontend/services/doctorKnowledgeService.ts` (新建 - 医生端知识库服务)

**功能说明**:

#### 1. 知识库文件卡片系统
- 🗄️ **新建数据库表**: `knowledge_file_card_t`，存储知识库文件的卡片信息
- 📝 **卡片属性**:
  - `card_title`: 卡片标题
  - `card_summary`: 卡片摘要
  - `category`: 分类（解剖学、病理学、诊断标准、药物信息、治疗方案）
  - `tags`: 标签数组
  - `view_count`: 浏览次数
  - `file_path`: 关联的知识库文件路径
- 🔧 **完整 CRUD API**:
  - `POST /doctor/knowledge/card/save` - 创建或更新卡片
  - `GET /doctor/knowledge/card/get?file_path=xxx` - 获取指定文件的卡片
  - `GET /doctor/knowledge/cards/list?category=xxx` - 获取所有卡片（支持分类筛选）
  - `DELETE /doctor/knowledge/card/delete?file_path=xxx` - 删除卡片
- 📊 **管理界面**: 知识库管理员可在设置页面为文件创建和编辑卡片
- 🎯 **医生端展示**: 医生端知识库界面显示卡片列表，支持分类筛选

#### 2. 知识库详情页布局重构
- 🎨 **左右分栏布局**: 左侧知识分类树（25%）+ 右侧内容区（75%）
- 📖 **文档详情集成**: 点击卡片后在右侧区域显示 Markdown 文档，左侧目录保持可见
- 🔄 **智能切换**: 右侧区域根据选择状态动态切换（搜索视图 ↔ 文档详情）
- ⬅️ **返回按钮**: 文档详情顶部显示"返回知识库"按钮，点击返回卡片列表
- 🌲 **目录树交互**: 可展开/折叠知识库，点击文件直接查看内容

**技术实现**:

**数据库层**:
- 创建 `knowledge_file_card_t` 表，包含标准 TableBase 字段
- 添加触发器自动更新 update_time
- 建立索引提升查询性能

**后端服务层**:
- `doctorKnowledgeService`: 完整的卡片 CRUD 操作
- 支持按分类筛选卡片列表

**前端组件层**:
- `KnowledgeBaseView`: 重构为单页面应用，集成文档详情视图
- 状态管理：`selectedKnowledgeId`、`fileContent`、`fileLoading`
- 条件渲染：根据选择状态切换搜索视图和文档详情
- Markdown 渲染：使用 react-markdown + remark-gfm

**用户体验**:
- ✅ 点击知识卡片后，左侧目录保持可见，方便快速切换其他文档
- ✅ 卡片显示分类标签、热门标识、浏览次数等元信息
- ✅ 支持按类别快速筛选卡片（解剖学、病理学、诊断标准等）
- ✅ Markdown 文档渲染美观，支持代码高亮、表格、公式等
- ✅ 返回按钮一键回到卡片列表视图

**数据库迁移**:
执行命令：
```bash
cd /opt && source backend/.venv/bin/activate && python3 backend/database/migrations/run_knowledge_file_card_migration.py
```

---

## 2025-11-16

### 患者管理功能更新

**操作内容**:
- 🌿 **创建新分支**: `feature/patient-management-updates-20251116`
- 📦 **提交更改**: 15 个文件，3819 行新增，1051 行删除
- 🚀 **推送到 GitHub**: 成功推送到远程仓库

**主要更新文件**:

**后端文件**:
- `backend/apps/base_app.py` (更新)
- `backend/apps/patient_app.py` (新建)
- `backend/database/db_models.py` (更新)
- `backend/database/migrations/create_patient_management_tables.sql` (新建)
- `backend/database/migrations/run_patient_migration.py` (新建)
- `backend/database/patient_db.py` (新建)
- `backend/services/patient_service.py` (新建)

**前端文件**:
- `frontend/components/doctor/patients/PatientDetailView.tsx` (更新)
- `frontend/components/doctor/patients/PatientListView.tsx` (更新)
- `frontend/components/doctor/patients/PatientOverview.tsx` (更新)
- `frontend/components/doctor/patients/PatientTimeline.tsx` (更新)
- `frontend/components/doctor/patients/PatientTodos.tsx` (更新)
- `frontend/services/patientService.ts` (新建)
- `frontend/types/patient.ts` (新建)

**功能说明**:
- 新增患者管理相关服务和数据库模型
- 更新患者详情、列表、概览和时间线组件
- 添加患者管理数据库迁移脚本

**分支信息**:
- 分支名称: `feature/patient-management-updates-20251116`
- 远程仓库: `origin/feature/patient-management-updates-20251116`

---

## 2025-11-15

### 医生端UI系统完整实现

**修改文件**:
- `frontend/app/[locale]/chat/internal/chatInterface.tsx` (更新)
- `frontend/app/[locale]/doctor/patients/page.tsx` (新建)
- `frontend/app/[locale]/doctor/cases/page.tsx` (新建)
- `frontend/app/[locale]/doctor/knowledge/page.tsx` (新建)
- `frontend/components/doctor/patients/PatientListView.tsx` (新建)
- `frontend/components/doctor/patients/PatientDetailView.tsx` (新建)
- `frontend/components/doctor/patients/PatientOverview.tsx` (新建)
- `frontend/components/doctor/patients/PatientTimeline.tsx` (新建)
- `frontend/components/doctor/patients/PatientTodos.tsx` (新建)
- `frontend/components/doctor/cases/CaseLibraryView.tsx` (新建)
- `frontend/components/doctor/cases/CaseDetailView.tsx` (新建)
- `frontend/components/doctor/knowledge/KnowledgeBaseView.tsx` (新建)
- `frontend/components/doctor/knowledge/KnowledgeDetailView.tsx` (新建)

**功能说明**:

#### 1. 患者档案系统 (`/doctor/patients`)
- **患者列表页**: 网格卡片布局，搜索筛选，快速操作
- **患者详情页**: 三个标签页
  - **患者概览**: 左右分栏（40%/60%），基本信息 + AI摘要 + 关键指标 + 快速入口 + 最近动态 + 待办提醒
  - **诊疗时间线**: 横向进度条 + 就诊记录网格（70%）+ 侧边栏（30%）+ AI分析
  - **待办事项**: AI智能建议 + 优先级分类（紧急/高/普通/已完成）

#### 2. 病例库系统 (`/doctor/cases`)
- **病例库视图**: 三标签导航（病例检索/我的收藏/最近浏览）
- **病例检索**: 自然语言搜索 + 疾病类型筛选 + 高级筛选 + AI被动推荐浮窗
- **病例详情**: 完整病例信息 + AI辅助分析 + 相关病例推荐 + 操作按钮

#### 3. 知识库系统 (`/doctor/knowledge`)
- **知识检索**: 左侧知识树导航 + 主内容区搜索和浏览
- **学习记录**: 统计卡片 + 学习热力图 + AI学习建议
- **知识地图**: 预留交互式知识图谱（开发中）

#### 4. UI/UX优化
- ✅ **移除多余滚动条**: ChatInterface容器改为 `overflow-hidden`，各组件使用 `h-full flex flex-col` 布局
- ✅ **修复侧边栏抖动**: 使用固定高度布局（h-full）+ flex-shrink-0 防止内容跳动
- ✅ **统一配色方案**: header改为灰色背景（#FAFAFA）与整体一致
- ✅ **标签布局优化**: 移至右上角，增大尺寸（h-14，px-8 py-3，text-base）
- ✅ **直接渲染组件**: 替换iframe为组件直接渲染，提升加载速度

**设计风格**:
- 参考图片2：深色胶囊标签（选中时黑底白字）
- 参考图片3：紧凑网格卡片，充分利用空间
- 配色：黑白灰基调 + 红/黄/绿点缀色
- 每个页面有独特性但保持整体一致性

**技术实现**:
- 组件化架构：列表/详情视图分离
- 状态管理：使用React hooks管理选择状态
- 响应式布局：flex + grid混合布局
- 性能优化：直接渲染避免iframe开销

---

## 2025-11-15

### 医生侧边栏内容完善

**操作内容**:
- 🌿 **创建新分支**: `feature/2025-11-12`
- 📦 **提交更改**: 30 个文件，1318 行新增，162 行删除
- 🚀 **推送到 GitHub**: 成功推送到远程仓库

**主要更新文件**:

**后端文件**:
- `backend/apps/conversation_management_app.py`
- `backend/apps/portal_agent_assignment_app.py`
- `backend/consts/model.py`
- `backend/database/agent_db.py`
- `backend/database/conversation_db.py`
- `backend/database/db_models.py`
- `backend/database/portal_agent_assignment_db.py`
- `backend/services/agent_service.py`
- `backend/services/conversation_management_service.py`
- `backend/services/portal_agent_assignment_service.py`

**前端文件**:
- `frontend/app/[locale]/admin/components/AgentAssignment.tsx`
- `frontend/app/[locale]/chat/components/chatInput.tsx`
- `frontend/app/[locale]/chat/internal/chatInterface.tsx`
- `frontend/app/[locale]/chat/streaming/chatStreamMain.tsx`
- `frontend/app/[locale]/setup/agents/components/AgentSetupOrchestrator.tsx`
- `frontend/app/[locale]/setup/agents/components/PromptManager.tsx`
- `frontend/app/[locale]/setup/agents/components/agent/AgentConfigModal.tsx`
- `frontend/const/portalChatConfig.ts`
- `frontend/hooks/chat/useConversationManagement.ts`
- `frontend/services/agentConfigService.ts`
- `frontend/services/api.ts`
- `frontend/services/conversationService.ts`
- `frontend/services/portalAgentAssignmentService.ts`
- `frontend/types/agentConfig.ts`
- `frontend/types/chat.ts`

**新增文件**:
- `backend/database/migrations/add_portal_type_to_conversation.sql` (数据库迁移脚本)
- `backend/database/migrations/run_migration.py` (迁移执行脚本)
- `portal_agent_prompts.md` (Agent 提示词文档)

---

## 2025-11-12

### 端口对话隔离功能

**修改文件（后端）**：
- `backend/database/db_models.py` - 在 ConversationRecord 表中添加 `portal_type` 字段
- `backend/database/conversation_db.py` - 修改 `create_conversation()` 和 `get_conversation_list()` 函数支持端口类型
- `backend/apps/conversation_management_app.py` - API 接口支持 `portal_type` 参数
- `backend/services/conversation_management_service.py` - Service 层传递端口类型参数
- `backend/consts/model.py` - ConversationRequest 模型添加 `portal_type` 字段

**修改文件（前端）**：
- `frontend/services/conversationService.ts` - `create()` 和 `getList()` 方法支持端口类型参数
- `frontend/hooks/chat/useConversationManagement.ts` - `fetchConversationList()` 方法支持端口类型参数
- `frontend/app/[locale]/chat/internal/chatInterface.tsx` - 创建和查询对话时传递 `variant` 参数

**功能说明**：
- 🔒 **对话隔离**：不同端口的对话记录完全隔离，互不可见
  - 医生端的对话只在医生端显示
  - 学生端的对话只在学生端显示
  - 患者端的对话只在患者端显示
  - 管理端的对话只在管理端显示
  - 通用端（general）的对话保持独立
- 📝 **自动标记**：创建对话时自动标记所属端口类型
- 🔍 **智能过滤**：查询对话列表时自动按端口类型过滤
- 🔄 **向后兼容**：现有对话默认标记为 'general' 类型

**数据库字段**：
```sql
-- conversation_record_t 表新增字段
portal_type VARCHAR(50) DEFAULT 'general'
-- 可选值: 'doctor', 'student', 'patient', 'admin', 'general'
```

**API 变更**：
- `PUT /conversation/create`：请求体新增 `portal_type` 字段（可选，默认 'general'）
- `GET /conversation/list`：新增查询参数 `portal_type`（可选，不传则返回所有对话）

**使用效果**：
- ✅ 医生端用户只能看到医生端的对话历史
- ✅ 学生端用户只能看到学生端的对话历史
- ✅ 患者端用户只能看到患者端的对话历史
- ✅ 管理端用户只能看到管理端的对话历史
- ✅ 各端对话完全独立，不会串台

---

## 2025-11-11

### 端口专属主智能体架构

**修改文件（后端）**：
- `backend/database/db_models.py` - 在 AgentInfo 表中添加 `agent_role_category` 和 `portal_type` 字段
- `backend/database/agent_db.py` - 新增 `get_portal_main_agent()` 函数
- `backend/database/portal_agent_assignment_db.py` - 重构为使用 AgentRelation 表
- `backend/apps/portal_agent_assignment_app.py` - 新增 `/get_main_agent/{portal_type}` 接口
- `backend/services/portal_agent_assignment_service.py` - 新增 `get_portal_main_agent_impl()` 函数
- `backend/services/agent_service.py` - 更新以支持新的智能体字段

**修改文件（前端）**：
- `frontend/types/agentConfig.ts` - 在 Agent 接口中添加 `agent_role_category` 和 `portal_type` 字段
- `frontend/app/[locale]/setup/agents/components/agent/AgentConfigModal.tsx` - 新增智能体角色和端口类型选择器
- `frontend/app/[locale]/setup/agents/components/AgentSetupOrchestrator.tsx` - 新增状态管理逻辑
- `frontend/app/[locale]/setup/agents/components/PromptManager.tsx` - 传递新的 props
- `frontend/app/[locale]/admin/components/AgentAssignment.tsx` - 新增主智能体验证逻辑
- `frontend/app/[locale]/chat/internal/chatInterface.tsx` - 自动加载并使用端口主智能体
- `frontend/app/[locale]/chat/streaming/chatStreamMain.tsx` - 支持隐藏智能体选择器
- `frontend/app/[locale]/chat/components/chatInput.tsx` - 条件渲染智能体选择器
- `frontend/services/agentConfigService.ts` - 更新智能体时包含新字段
- `frontend/services/portalAgentAssignmentService.ts` - 新增 `getPortalMainAgent()` 函数
- `frontend/services/api.ts` - 新增 API 端点定义
- `frontend/types/chat.ts` - 新增 `hideAgentSelector` 属性

**功能说明**：
- 🎯 **双层智能体架构**：
  - **端口主智能体**：每个端口（医生端/学生端/患者端）配置一个专属的主智能体
  - **工具智能体**：可复用的子智能体，可分配给任意主智能体使用
- 🔧 **智能体角色配置**：
  - 在智能体配置中新增"智能体角色分类"选择器："端口主智能体" vs "工具智能体"
  - 为主智能体新增"所属端口"选择器："医生端" / "学生端" / "患者端"
  - 工具智能体可以配置协作子智能体（嵌套架构）
  - 主智能体的子智能体通过"智能体分配"界面统一管理
- ✅ **分配验证机制**：
  - 智能体分配界面会检查端口是否已配置主智能体
  - 未配置主智能体时显示警告提示
  - 端口卡片显示"未配置主智能体"状态指示器
- 🤖 **自动智能体选择**：
  - 医生端/学生端/患者端自动加载并使用各自的主智能体
  - 端口专属聊天界面中隐藏智能体选择器
  - 管理员端和通用端保留手动选择功能

**用户体验**：
1. **配置主智能体**：
   - 进入智能体配置页面
   - 创建或编辑智能体
   - 选择"智能体角色分类" → "端口主智能体"
   - 选择"所属端口" → 目标端口类型
   - 配置智能体参数并保存
2. **分配工具智能体**：
   - 进入智能体分配界面
   - 选择目标端口
   - 界面显示主智能体名称或未配置警告
   - 从资源池拖拽工具智能体进行分配
   - 系统验证主智能体存在后才允许分配
3. **聊天使用**：
   - 医生端/学生端/患者端用户：主智能体自动选中，无需手动选择
   - 管理员/通用端用户：保留手动智能体选择功能
   - 主智能体可自动调用已分配的工具智能体

**核心优势**：
- ✨ 简化用户体验 - 无需手动选择智能体
- 🔐 职责分离清晰 - 管理员配置一次，用户直接使用
- 🔄 架构灵活 - 主智能体可编排多个工具智能体
- 📈 易于扩展 - 轻松添加新端口或修改智能体分配
- 🛡️ 验证可靠 - 防止配置不完整导致的错误

---

## 2025-11-11

### 智能体配置与分配功能完整实现

**修改文件**:

**后端**:
- `backend/database/db_models.py` (更新)
- `backend/consts/model.py` (更新)
- `backend/services/agent_service.py` (更新)
- `backend/database/portal_agent_assignment_db.py` (新建)
- `backend/services/portal_agent_assignment_service.py` (新建)
- `backend/apps/portal_agent_assignment_app.py` (新建)
- `backend/apps/base_app.py` (更新)

**前端**:
- `frontend/types/agentConfig.ts` (更新)
- `frontend/app/[locale]/setup/agents/config.tsx` (更新)
- `frontend/app/[locale]/setup/agents/components/AgentSetupOrchestrator.tsx` (更新)
- `frontend/app/[locale]/setup/agents/components/PromptManager.tsx` (更新)
- `frontend/app/[locale]/setup/agents/components/agent/AgentConfigModal.tsx` (更新)
- `frontend/services/agentConfigService.ts` (更新)
- `frontend/services/api.ts` (更新)
- `frontend/services/portalAgentAssignmentService.ts` (新建)
- `frontend/app/[locale]/admin/components/AgentAssignment.tsx` (更新)

**功能说明**:

#### 1. 智能体类型/种类功能
- ✨ **数据库扩展**：AgentInfo表添加`category`字段，支持智能体分类
- 🎨 **配置界面增强**：智能体配置页面添加类型选择器，支持7种预定义类型（诊断、分析、教学、咨询、管理、康复、其他）
- 🔄 **完整流程支持**：创建、编辑、保存智能体时都支持category字段
- 📊 **类型筛选**：在智能体资源池中可以按类型筛选

#### 2. 智能体端口分配系统
- 🗄️ **新建数据库表**：`ag_portal_agent_assignment_t`，存储端口与智能体的映射关系
- 🔧 **完整CRUD API**：
  - `GET /portal_agent_assignment/get_agents/{portal_type}` - 获取端口已分配智能体
  - `POST /portal_agent_assignment/assign` - 分配智能体到端口
  - `POST /portal_agent_assignment/remove` - 从端口移除智能体
  - `POST /portal_agent_assignment/set_agents` - 批量设置端口智能体
- 🎯 **三端独立配置**：医生端、学生端、患者端可分别配置不同的智能体

#### 3. 智能体分配界面优化
- 📱 **真实数据加载**：从后端API获取所有智能体和分配关系
- 🖱️ **完整拖拽支持**：
  - 从资源池拖拽到已分配区域（分配）
  - 从已分配区域拖回资源池（移除）
  - 拖拽过程中的视觉反馈（蓝色/红色虚线边框）
  - 拖拽项半透明和缩小效果
- 💾 **实时保存**：拖拽操作立即保存到后端，失败时自动回滚
- 🔍 **类型筛选弹窗**：支持按智能体类型筛选资源池
- 📊 **三列布局**：已分配智能体以三列网格显示，充分利用空间
- 🎨 **加载状态**：loading和saving状态的UI反馈

**用户体验**:
- ✅ 配置智能体时可选择类型，便于分类管理
- ✅ 智能体分配界面直观，支持拖拽和点击两种方式
- ✅ 实时保存，无需手动点击保存按钮
- ✅ 失败自动回滚，确保数据一致性
- ✅ 三端独立配置，互不干扰
- ✅ 类型筛选功能，快速找到需要的智能体

---

## 2025-11-11

### 添加智能体角色分类和端口类型字段

**需求描述**:
为智能体添加角色分类，区分"端口主智能体"和"工具智能体"，并为端口主智能体指定所属端口。

**数据库迁移**:
文件：
- `backend/database/migrations/add_agent_role_and_portal_type.sql` (SQL迁移脚本)
- `backend/database/migrations/run_role_portal_migration.py` (Python迁移执行脚本)

新增字段：
1. **agent_role_category** (VARCHAR(20))
   - 智能体角色分类
   - 可选值：`portal_main`（端口主智能体）或 `tool`（工具智能体）
   - 默认值：`tool`

2. **portal_type** (VARCHAR(20), nullable)
   - 所属端口类型
   - 可选值：`doctor`（医生端）、`student`（学生端）、`patient`（患者端）、`admin`（管理端）或 NULL
   - 仅用于 `portal_main` 类型的智能体

新增约束和索引：
- `idx_agent_role_category`: 角色分类索引
- `idx_agent_portal_type`: 端口类型索引
- `chk_portal_type_for_portal_main`: 检查约束，确保只有 portal_main 可以设置 portal_type
- `uniq_portal_main_per_tenant`: 唯一约束，每个租户的每个端口只能有一个主智能体

**前端修改**:
1. `/opt/frontend/app/[locale]/setup/agents/components/agent/AgentConfigModal.tsx`
   - 添加"智能体角色分类"选择器（必填）
   - 添加"所属端口"选择器（仅当角色为portal_main时显示，必填）
   - 添加说明文本，解释两种角色的区别

**技术说明**:
- 端口主智能体：作为各端（医生/学生/患者/管理）的主要智能体，通过智能体分配界面管理子智能体
- 工具智能体：可被主智能体调用的工具，支持配置协作智能体（多层嵌套）
- 通过数据库约束确保每个端口只能有一个主智能体
- 默认所有现有智能体为"工具智能体"，保持向后兼容

迁移执行命令：
```bash
cd /opt && source backend/.venv/bin/activate && python3 backend/database/migrations/run_role_portal_migration.py
```

---

## 2025-11-09

### 模型管理页面布局优化与分端配置功能

**修改文件**:
- `frontend/app/[locale]/setup/models/config.tsx` (重构)
- `frontend/app/[locale]/setup/models/components/modelConfig.tsx` (更新)
- `frontend/services/configService.ts` (更新)
- `backend/apps/config_sync_app.py` (更新)
- `backend/services/config_sync_service.py` (更新)

**功能说明**:
- 🎨 **移除左侧应用设置**：去掉原来的双栏布局中的应用设置面板
- 📐 **模型配置全屏显示**：模型管理界面占据整个可用空间，高度自适应视口，消除所有空白边距
- 🔧 **真实的分端配置功能**：完整实现了为不同端口配置独立模型的功能
  - 支持为"所有端"、"医生端"、"学生端"、"患者端"分别配置模型
  - 切换端口时自动加载对应配置
  - 保存时自动关联到选择的端口
  - 支持配置回退：特定端口未配置时自动使用"所有端"的配置

**技术实现**:

**前端**:
- 移除Row/Col双栏布局，改为全屏flex容器 (`w-full h-full`)
- 优化布局层级，移除多余padding和margin
- 在顶部添加端口选择器，支持4个选项
- 监听`selectedPortal`状态变化，自动重新加载配置
- 保存时传递`portal`参数到后端

**后端**:
- API层添加`portal`查询参数支持 (默认值: "all")
- Service层实现portal-specific配置key生成：`{portal}_{config_key}`
- 配置加载逻辑支持回退：优先读取特定端口配置，若为空则回退到"all"配置

**布局改进**:
- ❌ 移除前：左侧应用设置 + 右侧模型管理（各占50%宽度，四周有空白）
- ✅ 优化后：模型管理占100%宽度和高度，无多余空白
- 🎯 端口选择器位于顶部，与操作按钮在同一行

**用户体验**:
- ✅ 更大的配置区域，卡片展示更清晰
- ✅ 无浪费的空白空间，内容最大化
- ✅ 真实的分端配置：为医生端、学生端、患者端配置不同的AI模型
- ✅ 智能回退：特定端口未配置时自动使用通用配置
- ✅ 切换端口即时生效，配置自动保存

---

## 2025-11-09

### 管理员端侧边栏导航优化

**修改文件**:
- `frontend/const/portalChatConfig.ts` (更新)
- `frontend/app/[locale]/chat/components/chatLeftSidebar.tsx` (更新)
- `frontend/app/[locale]/chat/internal/chatInterface.tsx` (更新)

**功能说明**:
- ✨ **新增工具配置导航项**：在管理员端侧边栏添加"工具配置"按钮，使用Settings图标
- 🎯 **导航项文字可点击**：当侧边栏展开时，导航项的文字部分也可以点击跳转，提升用户体验
- 🔄 **整个导航项可交互**：将导航项从div+button结构改为完整的button，图标和文字都在同一个可点击区域内

**技术实现**:
- 在admin配置的navItems中添加新的工具配置项：`{ id: "tools", label: "工具配置", icon: Settings }`
- 重构侧边栏导航项结构：将嵌套的div和button改为单一button元素
- 在chatInterface中添加tools视图的处理逻辑，显示"即将推出"占位内容

**用户体验**:
- ✅ 展开状态下，点击图标或文字都能跳转到对应功能
- ✅ 导航项顺序：对话 → 智能体配置 → 模型管理 → 知识库管理 → 工具配置 → 系统设置
- ✅ 保持原有的hover效果和选中状态样式

---

## 2025-11-08

### 聊天侧边栏动画优化与布局对齐修复

**修改文件**:
- `frontend/app/[locale]/chat/components/chatLeftSidebar.tsx` (更新)

**功能说明**:
- 🎯 **完美对齐的展开/收起动画**：
  - 折叠和展开状态下，所有按钮保持在同一垂直位置
  - 文字内容从按钮右侧平滑淡入，无位置跳动
  - 图标位置固定不动，仅内容区域宽度变化
- 🎨 **丝滑的过渡效果**：
  - 侧边栏宽度使用 300ms ease-in-out 缓动
  - 文字内容带有渐进式淡入延迟（75ms 起，每项递增 25ms）
  - 所有交互元素 200ms 平滑过渡
- ✨ **布局一致性保障**：
  - 折叠状态：左内边距 16px (pl-4)，按钮从此基准开始
  - 展开状态：相同的左内边距，文字在按钮右侧滑入
  - 按钮尺寸严格统一（展开按钮 48px，导航按钮 44px）
- 🎯 **悬停效果增强**:
  - 展开状态按钮轻微缩放（1.02x）配合阴影变化
  - 折叠状态按钮较大缩放（1.05x）提供明确反馈
  - 设置按钮悬停时显示边框和阴影
- 💫 **微交互动画**:
  - 搜索输入框悬停时边框颜色平滑过渡
  - 所有图标带有 transform 过渡防止跳动
  - 文字内容使用 opacity 过渡配合 overflow 裁切

**技术实现**:
- 统一左侧基准对齐：折叠和展开状态均使用 `pl-4` (16px)
- 文字区域添加 `overflow-hidden` + `opacity` 动画实现淡入效果
- 使用 `transitionDelay` 为每个导航项创建渐进式动画
- 按钮容器固定尺寸（h-12 w-12 或 h-11 w-11）配合 `flex-shrink-0`
- 展开按钮从 40px 增大到 48px 与折叠状态完全对齐

**用户体验**:
- ✅ 按钮位置完全不跳动，保持视觉连续性
- ✅ 文字从按钮右侧自然滑出，符合用户预期
- ✅ 动画流畅无卡顿，具有专业级品质
- ✅ 展开/收起状态切换丝滑如黄油
- ✅ 所有元素对齐精确，无视觉故障

---

## 2025-11-08

### 医生端聊天界面改造与多端复用能力

**修改文件**:
- `frontend/const/portalChatConfig.ts` (新建)
- `frontend/app/[locale]/chat/components/chatLeftSidebar.tsx`
- `frontend/app/[locale]/chat/components/chatHeader.tsx`
- `frontend/app/[locale]/chat/components/chatInput.tsx`
- `frontend/app/[locale]/chat/streaming/chatStreamMain.tsx`
- `frontend/app/[locale]/chat/internal/chatInterface.tsx`
- `frontend/app/[locale]/doctor/page.tsx`
- `frontend/types/chat.ts`
- `doc/doctor-chat-summary-2025-11-08.md` (新建)

**功能说明**:
- 左侧导航重构
- 右侧主区域新增
- 快捷提问按钮可一键填充输入框，便于医生快速发起常见请求
- 医生端页面直接复用聊天界面，实现从首页进入医生端即落地新聊天体验

**技术实现**:
- 新增 `portalChatConfig` 配置表，集中管理不同端的品牌色、导航项、快捷按钮、输入提示等元信息
- `ChatInterface`、`ChatSidebar`、`ChatInput`、`ChatStreamMain` 等核心组件支持 `variant`/`portalConfig` 参数，方便其他端口开关主题
- 输入框和导航的样式细节全部采用 Tailwind 自定义颜色，确保与提供的设计稿（米白背景 + 橙红主色）一致

**复用策略**:
- `portalChatConfig` 已预留 doctor/general 配置，其余端口只需补齐配置并在路由中传入 `variant` 即可接入
- `ChatInterface` 仍保留原有对话、上传、流式等逻辑，只对布局与 UI 层做改造，最大化复用既有能力

---

## 2025-11-07

### 首页注册功能集成

**修改文件**: 
- `frontend/app/[locale]/page.tsx` (更新)

**功能说明**:
- **一体化注册表单**：在登录弹窗中添加注册功能，无需跳转页面
- **登录/注册切换**：点击"注册新账号"切换到注册表单，点击"返回登录"切换回登录
- **密码确认**：注册模式下显示"确认密码"字段，确保密码输入正确
- **表单验证**：
  - 检查邮箱、密码、确认密码是否填写完整
  - 验证两次输入的密码是否一致
  - 密码长度至少6位
- **动态UI**：
  - 标题动态切换（"登录" / "注册"）
  - 按钮文本动态显示（"登录中..." / "注册中..."）
  - 提示文案动态变化（"还没有账号？" / "已有账号？"）
- **注册成功自动跳转**：注册成功后自动登录并跳转到对应端口
- **完整错误处理**：密码不一致、密码过短、邮箱已存在等错误提示

**用户体验**:
1. 点击"进入医生端/学生端/患者端"
2. 弹出登录表单
3. 点击"注册新账号"切换到注册模式
4. 填写邮箱、密码、确认密码
5. 点击"注册"按钮
6. 注册成功后自动跳转到对应端口

**技术实现**:
- 使用 `showRegisterForm` 状态控制表单模式
- 条件渲染"确认密码"字段和"记住我"选项
- 集成 `useAuth` 的 `register` 函数
- 完善的前端表单验证

---

## 2025-11-07

### 首页登录功能集成与管理员端直达

**修改文件**: 
- `frontend/app/[locale]/page.tsx` (更新)
- `frontend/types/auth.ts` (更新)

**功能说明**:
- 🔐 **真实登录功能**：医生、学生、患者三端使用真实的认证系统登录
- 🚀 **管理员直达**：管理员端无需登录，点击按钮直接进入配置页面 (`/setup`)
- 🔄 **统一账号**：一个账号可以登录医生、学生、患者三个端口
- ✅ **登录成功跳转**：登录成功后自动跳转到对应的端口页面
- ⏳ **加载状态**：登录按钮显示加载状态（"登录中..."）
- 🛡️ **错误处理**：完善的登录错误提示和异常处理
- 🎨 **禁用状态**：登录过程中禁用所有表单按钮，防止重复提交
- 📝 **注册引导**：点击"注册新账号"跳转到设置页面完成注册

**技术实现**:
- 集成 `useAuth` hook 进行真实认证
- 使用 `useRouter` 实现页面跳转
- 通过 `PORTAL_ROUTES` 映射端口路由
- Ant Design 的 `message` 组件提供用户反馈
- TypeScript 类型安全的错误处理

**用户体验**:
- 医生端/学生端/患者端：弹出登录表单 → 输入邮箱密码 → 登录成功 → 跳转对应端口
- 管理员端：点击按钮 → 直接进入配置页面
- 账号通用性：同一个邮箱可以访问医生端、学生端和患者端

---

## 2025-11-07

### 多端路由架构重构

**修改文件**: 
- `frontend/app/[locale]/doctor/page.tsx` (新建)
- `frontend/app/[locale]/student/page.tsx` (新建)
- `frontend/app/[locale]/patient/page.tsx` (新建)
- `frontend/app/[locale]/admin/page.tsx` (新建)
- `frontend/hooks/usePortalAuth.ts` (新建)
- `frontend/types/portal.ts` (新建)
- `frontend/components/doctor/`, `frontend/components/student/`, `frontend/components/patient/`, `frontend/components/admin/`, `frontend/components/common/` (新建文件夹)
- `frontend/PORTAL_ARCHITECTURE.md` (新建)

**功能说明**:
- ✨ 实现了四端路由分离架构（医生端、学生端、患者端、管理员端）
- 🔐 创建了统一的端口认证守卫 hook (`usePortalAuth`)，自动拦截未登录访问
- 🏗️ 建立了按端口分类的组件文件夹结构，支持组件共享和专用组件分离
- 🛣️ 定义了清晰的路由映射和类型系统
- 🎨 为每个端配置了独特的主题色彩（医生端：深灰、学生端：深蓝黑、患者端：蓝、管理员端：紫）
- 📱 所有页面支持国际化 (i18n)
- ⚡ 集成了加载状态处理和认证重定向

**技术架构**:
- 采用 Next.js App Router 路由分割模式
- 统一使用 `usePortalAuth` hook 进行路由守卫
- TypeScript 类型安全保证
- 遵循前端分层规范（组件层、Hook层、类型层）

**访问路径**: 
- 医生端: `http://localhost:3000/doctor`
- 学生端: `http://localhost:3000/student`
- 患者端: `http://localhost:3000/patient`
- 管理员端: `http://localhost:3000/admin`

**下一步优化**:
- 需要实现基于角色的访问控制 (RBAC)
- 完善每个端的功能模块
- 添加端口专用的导航组件

---

## 2025-11-07

### 将四端选择落地页设置为默认首页

**修改文件**: `frontend/app/[locale]/page.tsx`

**功能说明**:
- ✨ 全屏单页设计，支持横向滚动切换四个端口页面
- 🏥 四个独立端口：病理医生端、医学生端、患者端、管理员端
- ⌨️ 支持键盘左右方向键导航
- 🎨 现代简洁风格，使用等宽字体大标题
- 🔐 点击按钮展开登录表单，带有流畅的弹性动画
- 📱 响应式设计，适配桌面端
- 🎯 导航箭头和页面指示器
- 💫 丝滑的过渡动画效果

**技术特点**:
- 使用 Framer Motion 实现流畅动画
- 无渐变背景，纯白简洁设计
- 登录表单支持邮箱/密码输入、记住我、忘记密码
- 包含注册按钮，位于登录表单底部
- 关闭动画自动收缩回原位

**访问方式**: 
- 打开 `http://localhost:3000` 即可直接看到四端选择落地页
