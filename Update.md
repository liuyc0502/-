



## 2025-11-07

### 首页注册功能集成

**修改文件**: 
- `frontend/app/[locale]/page.tsx` (更新)

**功能说明**:
- ✍️ **一体化注册表单**：在登录弹窗中添加注册功能，无需跳转页面
- 🔄 **登录/注册切换**：点击"注册新账号"切换到注册表单，点击"返回登录"切换回登录
- 🔐 **密码确认**：注册模式下显示"确认密码"字段，确保密码输入正确
- ✅ **表单验证**：
  - 检查邮箱、密码、确认密码是否填写完整
  - 验证两次输入的密码是否一致
  - 密码长度至少6位
- 🎨 **动态UI**：
  - 标题动态切换（"登录" / "注册"）
  - 按钮文本动态显示（"登录中..." / "注册中..."）
  - 提示文案动态变化（"还没有账号？" / "已有账号？"）
- 🚀 **注册成功自动跳转**：注册成功后自动登录并跳转到对应端口
- 🛡️ **完整错误处理**：密码不一致、密码过短、邮箱已存在等错误提示

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

## 2025-11-09

**修改文件**:
- `frontend/app/[locale]/setup/knowledges/config.tsx`
- `frontend/const/portalChatConfig.ts`

**改动内容**:
- 调整知识库配置页容器结构，改用 `flex` 布局并移除标题区域，使左右列高度自适应。
- 从管理员侧栏导航中移除“智能体配置”入口，保持导航项与实际功能一致。

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

### 新增功能

#### 将四端选择落地页设置为默认首页

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
- 快捷提问按钮可一键填充输入框，便于医生快速发起常见请求。
- 医生端页面直接复用聊天界面，实现从首页进入医生端即落地新聊天体验。

**技术实现**:
- 新增 `portalChatConfig` 配置表，集中管理不同端的品牌色、导航项、快捷按钮、输入提示等元信息。
- `ChatInterface`、`ChatSidebar`、`ChatInput`、`ChatStreamMain` 等核心组件支持 `variant`/`portalConfig` 参数，方便其他端口开关主题。
- 输入框和导航的样式细节全部采用 Tailwind 自定义颜色，确保与提供的设计稿（米白背景 + 橙红主色）一致。
- `doc/doctor-chat-summary-2025-11-08.md` 记录当日投产内容，方便后续查阅。

**复用策略**:
- `portalChatConfig` 已预留 doctor/general 配置，其余端口只需补齐配置并在路由中传入 `variant` 即可接入。
- `ChatInterface` 仍保留原有对话、上传、流式等逻辑，只对布局与 UI 层做改造，最大化复用既有能力。

---

## 2025-11-08

### 聊天侧边栏动画优化与布局对齐修复

**修改文件**:
- [frontend/app/[locale]/chat/components/chatLeftSidebar.tsx](/opt/frontend/app/[locale]/chat/components/chatLeftSidebar.tsx) (更新)

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

**关键修复**:
- **展开按钮尺寸**：从 h-10 w-10 调整为 h-12 w-12 与折叠状态对齐
- **左侧对齐基准**：统一使用 pl-4 确保按钮位置一致
- **文字淡入动画**：使用 opacity + overflow 替代位置变化
- **导航项布局**：h-11 w-11 容器包裹图标，文字独立渐进淡入

---


## 2025-11-09

### 管理员端侧边栏导航优化

**修改文件**:
- [frontend/const/portalChatConfig.ts](/opt/frontend/const/portalChatConfig.ts) (更新)
- [frontend/app/[locale]/chat/components/chatLeftSidebar.tsx](/opt/frontend/app/[locale]/chat/components/chatLeftSidebar.tsx) (更新)
- [frontend/app/[locale]/chat/internal/chatInterface.tsx](/opt/frontend/app/[locale]/chat/internal/chatInterface.tsx) (更新)

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

## 2025-11-09

### 模型管理页面布局优化与分端配置功能

**修改文件**:
- [frontend/app/[locale]/setup/models/config.tsx](/opt/frontend/app/[locale]/setup/models/config.tsx) (重构)
- [frontend/app/[locale]/setup/models/components/modelConfig.tsx](/opt/frontend/app/[locale]/setup/models/components/modelConfig.tsx) (更新)
- [frontend/services/configService.ts](/opt/frontend/services/configService.ts) (更新)
- [backend/apps/config_sync_app.py](/opt/backend/apps/config_sync_app.py) (更新)
- [backend/services/config_sync_service.py](/opt/backend/services/config_sync_service.py) (更新)

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
- 数据存储格式：
  ```
  all_MODEL_LLM_ID      # 所有端共享的大语言模型
  doctor_MODEL_LLM_ID   # 医生端专用大语言模型
  student_MODEL_LLM_ID  # 学生端专用大语言模型
  patient_MODEL_LLM_ID  # 患者端专用大语言模型
  ```

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

# 更新日志

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

**技术实现**:

**数据库层**:
- 软删除机制：所有操作使用`delete_flag`
- 租户隔离：所有表包含`tenant_id`字段
- 审计支持：`created_by`、`updated_by`自动记录

**服务层**:
- 异步处理：所有service层函数使用async/await
- 错误处理：统一的异常处理和日志记录
- 数据转换：Python snake_case与前端camelCase的转换

**API层**:
- RESTful设计：遵循资源导向的URL设计
- 统一响应：JSONResponse with status code
- 认证授权：使用Header中的authorization token

**前端层**:
- TypeScript类型安全：完整的类型定义
- 状态管理：React hooks管理组件状态
- 错误处理：API调用失败时的回滚机制
- 用户反馈：message提示成功/失败状态

**用户体验**:
- ✅ 配置智能体时可选择类型，便于分类管理
- ✅ 智能体分配界面直观，支持拖拽和点击两种方式
- ✅ 实时保存，无需手动点击保存按钮
- ✅ 失败自动回滚，确保数据一致性
- ✅ 三端独立配置，互不干扰
- ✅ 类型筛选功能，快速找到需要的智能体

**数据流**:
1. 创建/编辑智能体 → 选择类型 → 保存到数据库
2. 智能体分配界面加载 → 获取所有智能体 + 各端分配关系
3. 拖拽/点击操作 → 更新本地状态 → 调用API保存 → 成功/失败反馈

**数据库迁移**:
✅ **已成功执行迁移** (2025-11-11)

迁移文件：
- `backend/database/migrations/add_agent_category_and_portal_assignment_v2.sql` (修正版，使用nexent schema)
- `backend/database/migrations/run_migration_v2.py` (Python迁移执行脚本)

迁移内容验证：
- ✓ 添加了 `category` 字段到 `nexent.ag_tenant_agent_t` 表
- ✓ 创建了 `nexent.ag_portal_agent_assignment_t` 表
- ✓ 创建了必要的索引（idx_portal_agent_assignment_portal, idx_portal_agent_assignment_agent）
- ✓ 创建了更新时间戳的触发器

手动执行迁移命令：
```bash
cd /opt && source backend/.venv/bin/activate && python3 backend/database/migrations/run_migration_v2.py
```

**Bug修复**:
- 修复AgentAssignment组件中Spin组件的使用警告，添加`spinning`属性和包裹内容
- 修复数据库迁移脚本的schema名称（从ag_schema改为nexent）
- 优化迁移脚本以正确处理DO $$ ... END $$ 块

---

## 2025-11-11 - 添加智能体角色分类和端口类型字段

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
   - 可选值：`doctor`（医生端）、`student`（学生端）、`patient`（患者端）或 NULL
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
- 端口主智能体：作为各端（医生/学生/患者）的主要智能体，通过智能体分配界面管理子智能体
- 工具智能体：可被主智能体调用的工具，支持配置协作智能体（多层嵌套）
- 通过数据库约束确保每个端口只能有一个主智能体
- 默认所有现有智能体为"工具智能体"，保持向后兼容

迁移执行命令：
```bash
cd /opt && source backend/.venv/bin/activate && python3 backend/database/migrations/run_role_portal_migration.py
```

迁移验证：
- ✓ 添加了 `agent_role_category` 字段（默认值：'tool'）
- ✓ 添加了 `portal_type` 字段（nullable）
- ✓ 创建了索引（idx_agent_role_category, idx_agent_portal_type, uniq_portal_main_per_tenant）
- ✓ 创建了约束（chk_portal_type_for_portal_main）

**后端代码修复**:
修复500错误，更新后端代码以支持新字段：

1. `backend/database/db_models.py`
   - 修正字段名：`agent_category` → `agent_role_category`

2. `backend/consts/model.py`
   - 在 `AgentInfoRequest` 中添加 `agent_role_category` 和 `portal_type` 字段

3. `backend/services/agent_service.py`
   - 在 `list_all_agent_info_impl` 中返回新字段

4. `backend/database/agent_db.py`
   - 修正 `get_portal_main_agent` 查询：使用 `agent_role_category` 而非 `agent_category`

**问题原因**:
- 数据库字段名是 `agent_role_category`
- 但部分代码使用了 `agent_category`
- 导致查询失败，返回500错误

**修复效果**:
- ✅ agent 列表 API 正常返回
- ✅ 获取主智能体 API 正常工作
- ✅ 智能体分配 API 正常工作
- ✅ 前后端数据结构一致

#### 添加管理端支持 (2025-11-12 06:00)

**修改文件**:
- `/opt/frontend/app/[locale]/setup/agents/components/agent/AgentConfigModal.tsx`
- `/opt/frontend/app/[locale]/admin/components/AgentAssignment.tsx`
- `/opt/frontend/services/portalAgentAssignmentService.ts`
- `/opt/backend/database/migrations/update_portal_type_constraint.sql`
- `/opt/backend/database/migrations/run_portal_constraint_update.py`

**新增功能**:
1. 智能体配置界面新增"管理端"选项
2. 智能体分配界面新增"管理端"Tab
3. 数据库约束更新支持'admin'作为有效的portal_type

**修改内容**:

**前端**:
1. `AgentConfigModal.tsx`: 端口选择下拉框添加"管理端"选项
2. `AgentAssignment.tsx`: 
   - 导入Settings图标
   - portalConfig添加admin配置
   - assignedAgents和portalMainAgents状态添加admin
   - loadData添加加载admin数据的Promise
3. `portalAgentAssignmentService.ts`: PortalType类型添加"admin"

**数据库**:
1. 更新约束允许portal_type为'admin':
```sql
CHECK (
  (agent_role_category = 'portal_main' AND portal_type IN ('doctor', 'student', 'patient', 'admin'))
  OR (agent_role_category = 'tool' AND portal_type IS NULL)
)
```

**使用效果**:
- ✅ 可以创建管理端的主智能体
- ✅ 可以在智能体分配界面管理管理端的子智能体
- ✅ 符合数据库约束，数据一致性得到保证

#### 聊天记录端口字段迁移 (2025-11-12 06:30)

**修改文件**:
- `/opt/backend/database/migrations/add_portal_type_to_conversation.sql`
- `/opt/backend/database/migrations/run_migration.py`

**新增功能**:
为 `conversation_record_t` 表添加 `portal_type` 字段，实现对话按端口隔离

**数据库修改**:
1. 新增字段：
   - `portal_type` (VARCHAR(50), DEFAULT 'general')
   - 可选值：'doctor', 'student', 'patient', 'admin', 'general'

2. 新增索引：
   - `idx_conversation_portal_type` - 提升按端口查询对话的性能

3. 数据迁移：
   - 现有对话自动标记为 'general'

**后端支持**（已实现）:
- ✅ ORM模型已包含 `portal_type` 字段
- ✅ `create_conversation()` 支持 `portal_type` 参数
- ✅ `get_conversation_list()` 支持按 `portal_type` 筛选
- ✅ API `/conversation/create` 接收 `portal_type` 参数
- ✅ API `/conversation/list?portal_type=xxx` 支持按端口查询

**应用场景**:
```python
# 创建医生端对话
conversation = create_conversation("患者咨询", user_id, portal_type='doctor')

# 查询学生端对话列表
conversations = get_conversation_list(user_id, portal_type='student')
```

**前端集成提示**:
前端需要在创建对话时传递当前端口类型：
```typescript
// 根据当前端口创建对话
const response = await fetch('/conversation/create', {
  method: 'POST',
  body: JSON.stringify({
    title: '新对话',
    portal_type: currentPortal  // 'doctor', 'student', 'patient', 'admin'
  })
});
```

---

## 2025-11-11

### 端口专属主智能体架构

**修改文件（后端）**：
- `backend/database/db_models.py` - 在 AgentInfo 表中添加 `agent_category` 和 `portal_type` 字段
- `backend/database/agent_db.py` - 新增 `get_portal_main_agent()` 函数
- `backend/database/portal_agent_assignment_db.py` - 重构为使用 AgentRelation 表
- `backend/apps/portal_agent_assignment_app.py` - 新增 `/get_main_agent/{portal_type}` 接口
- `backend/services/portal_agent_assignment_service.py` - 新增 `get_portal_main_agent_impl()` 函数
- `backend/services/agent_service.py` - 更新以支持新的智能体字段

**修改文件（前端）**：
- `frontend/types/agentConfig.ts` - 在 Agent 接口中添加 `agent_category` 和 `portal_type` 字段
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
- 📊 **数据库架构**：
  - 使用现有的 `AgentRelation` 表维护父子关系
  - `agent_category`：'portal_main' 或 'tool'（默认值：'tool'）
  - `portal_type`：'doctor'、'student'、'patient' 或 null
  - 保持与现有智能体的向后兼容性

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

**技术实现**：
- 后端：在 `ag_tenant_agent_t` 表中新增字段及相应索引
- 前端：基于 `agent_category` 条件渲染 UI
- API：RESTful 接口 `/portal_agent_assignment/get_main_agent/{portal_type}`
- 聊天：通过 `useEffect` hook 在端口加载时自动获取主智能体
- 验证：UI、API、数据库三层数据一致性检查

**核心优势**：
- ✨ 简化用户体验 - 无需手动选择智能体
- 🔐 职责分离清晰 - 管理员配置一次，用户直接使用
- 🔄 架构灵活 - 主智能体可编排多个工具智能体
- 📈 易于扩展 - 轻松添加新端口或修改智能体分配
- 🛡️ 验证可靠 - 防止配置不完整导致的错误

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

**技术实现**：
- 后端：通过 SQLAlchemy 在 ConversationRecord 表添加 portal_type 字段并建立索引
- 数据层：create_conversation 和 get_conversation_list 函数增加 portal_type 参数
- API 层：从请求中获取 portal_type 并传递到数据层
- 前端：根据当前页面的 variant 自动传递对应的 portal_type

**使用效果**：
- ✅ 医生端用户只能看到医生端的对话历史
- ✅ 学生端用户只能看到学生端的对话历史
- ✅ 患者端用户只能看到患者端的对话历史
- ✅ 管理端用户只能看到管理端的对话历史
- ✅ 各端对话完全独立，不会串台

**注意事项**：
- 已创建的对话会自动标记为 'general' 类型
- 如需迁移现有对话到特定端口，需运行数据库更新脚本
- 建议定期清理不同端口的过期对话

---