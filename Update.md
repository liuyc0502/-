# 更新日志

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

