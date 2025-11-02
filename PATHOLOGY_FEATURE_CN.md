# 病理图片标注功能

## 概述

该功能使 Nexent 平台的智能体能够在聊天对话中显示带有交互式解剖标注的医学病理图片。当用户询问病理特征或解剖结构时，智能体可以自动检索并显示相关图片，用户可以点击解剖术语来高亮显示特定区域。

## 功能特性

### 1. 交互式病理查看器
- **图片展示**：显示来自知识库的高质量病理图片
- **可点击标注**：点击解剖术语查看指向相应结构的箭头
- **缩放控制**：放大/缩小以查看细节（50% 至 300%）
- **响应式设计**：适配所有屏幕尺寸
- **可折叠界面**：展开/收起查看器以节省空间

### 2. 智能搜索
- **自然语言查询**：可以问"显示足部解剖结构"或"骨病理学看起来是什么样的"
- **关键词匹配**：搜索病例标题、类别和解剖术语
- **结果排序**：优先返回最相关的病例
- **多病例支持**：可在一次响应中显示多个匹配病例

### 3. 丰富的标注
- **解剖术语**：每个病例识别 20+ 个结构
- **坐标定位**：每个结构的精确边界框
- **详细描述**：每个解剖特征的详细说明
- **视觉高亮**：选中术语时显示红色边框和箭头覆盖层

## 架构设计

### 前端组件

**PathologyImageViewer** (`/frontend/components/ui/PathologyImageViewer.tsx`)
- 用于显示病理图片的 React 组件
- 管理缩放、平移和标注选择
- 渲染带描述的交互式术语列表

**消息类型** (`/frontend/const/chatConfig.ts`)
- 新增 `PATHOLOGY_IMAGE` 消息类型
- 在聊天流处理器中处理

**流处理器** (`/frontend/app/[locale]/chat/streaming/chatStreamHandler.tsx`)
- 解析 `pathology_image` SSE 消息
- 将病理数据存储在消息状态中

**消息渲染器** (`/frontend/app/[locale]/chat/streaming/chatStreamMessage.tsx`)
- 渲染 PathologyImageViewer 组件
- 每条消息显示多个病理图片

### 后端组件

**PathologySearchTool** (`/sdk/nexent/core/tools/pathology_search_tool.py`)
- 搜索病理知识库
- 解析 Markdown 文件的 YAML 前置数据
- 返回结构化病理数据
- 通过 observer 发送 `PATHOLOGY_IMAGE` 消息

**ProcessType** (`/sdk/nexent/core/utils/observer.py`)
- 新增 `PATHOLOGY_IMAGE` 处理类型
- 支持病理数据的 SSE 流式传输

**工具注册** (`/sdk/nexent/core/tools/__init__.py`)
- PathologySearchTool 已导出并可供智能体使用

## 数据格式

### Markdown 文件结构

病理病例以 Markdown 文件存储，包含 YAML 前置数据：

```markdown
---
pathology_case_id: unique_case_id
pathology_category: 类别名称
pathology_metadata:
  total_cases: 1
  images:
  - image_id: unique_image_id
    image_url: https://example.com/image.jpg
    case_title: 病例标题
    annotations:
    - term: 解剖结构名称
      coordinates:
        x: 100
        y: 200
        width: 60
        height: 40
      description: 详细描述
---

# 病理内容

描述病例的 Markdown 内容...
```

### 标注数据

每个标注包括：
- `term`：解剖结构名称
- `coordinates`：边界框（x, y, width, height 单位为像素）
- `description`：教育性描述

## 使用方法

### 1. 添加病理病例

在 `/pathology_knowledge/` 目录创建 Markdown 文件：

```bash
pathology_knowledge/
  ├── bone_pathology.md
  ├── heart_pathology.md
  └── lung_pathology.md
```

### 2. 配置工具

创建智能体时，添加 PathologySearchTool：

```python
from nexent.core.tools import PathologySearchTool

pathology_tool = PathologySearchTool(
    pathology_dir="/path/to/pathology_knowledge",
    top_k=3,  # 返回前 3 个匹配结果
    observer=message_observer
)
```

### 3. 查询示例

用户可以询问：
- "显示正常足部解剖结构"
- "骨病理学看起来是什么样的？"
- "显示冠状动脉解剖结构"
- "我需要看心脏病理示例"

### 4. 智能体响应

智能体将：
1. 使用 PathologySearchTool 搜索知识库
2. 向前端流式传输 pathology_image 消息
3. 显示交互式 PathologyImageViewer 组件
4. 允许用户点击术语查看高亮区域

## 配置

### 环境变量

添加到 `/backend/consts/const.py`：

```python
PATHOLOGY_KNOWLEDGE_DIR = os.getenv("PATHOLOGY_KNOWLEDGE_DIR", "/home/user/-/pathology_knowledge")
```

### 智能体设置

配置智能体使用病理搜索工具：

1. 导航到智能体设置页面
2. 将"病理搜索"工具添加到智能体
3. 配置病理目录路径
4. 保存智能体配置

## 文件位置

### 前端
- `/frontend/components/ui/PathologyImageViewer.tsx` - 查看器组件
- `/frontend/const/chatConfig.ts` - 消息类型定义
- `/frontend/types/chat.ts` - TypeScript 类型
- `/frontend/app/[locale]/chat/streaming/chatStreamHandler.tsx` - 流处理器
- `/frontend/app/[locale]/chat/streaming/chatStreamMessage.tsx` - 消息渲染器

### 后端
- `/sdk/nexent/core/tools/pathology_search_tool.py` - 搜索工具
- `/sdk/nexent/core/tools/__init__.py` - 工具导出
- `/sdk/nexent/core/utils/observer.py` - 处理类型
- `/pathology_knowledge/` - 知识库目录

## 示例数据

在以下位置提供了骨病理示例病例：
- `/pathology_knowledge/bone_pathology.md`

该示例演示了：
- 带有 23 个标注结构的足部解剖
- 正确的 YAML 前置数据格式
- 标注的坐标映射
- 每个术语的丰富描述

## 未来增强

潜在改进：
1. **多语言支持**：翻译术语和描述
2. **绘图工具**：允许用户添加自己的标注
3. **3D 可视化**：支持 3D 病理模型
4. **视频支持**：动画展示病理过程
5. **对比视图**：正常与病理的并排对比
6. **导出功能**：下载标注图片
7. **搜索过滤器**：按器官系统、成像方式等过滤
8. **用户标注**：在图片上保存个人笔记

## 测试

测试功能的步骤：

1. 启动后端服务器
2. 启动前端开发服务器
3. 创建新对话
4. 询问："显示足部解剖结构"
5. 验证病理图片出现并带有可点击标注
6. 点击不同的解剖术语
7. 验证箭头和高亮正确显示
8. 测试缩放控制
9. 测试展开/收起功能

## 故障排除

**图片无法加载：**
- 检查图片 URL 是否可访问
- 验证 CORS 设置允许图片获取
- 检查浏览器控制台的错误信息

**标注无法点击：**
- 验证 YAML 前置数据中的坐标数据
- 检查浏览器控制台的 JavaScript 错误
- 确保图片在点击前已加载

**搜索无结果：**
- 检查 pathology_knowledge 目录路径
- 验证 Markdown 文件具有正确的 YAML 前置数据
- 尝试更宽泛的搜索词（例如"解剖"而不是具体术语）

## 贡献

添加新病理病例的步骤：

1. 创建带有 YAML 前置数据的 Markdown 文件
2. 添加高质量图片 URL
3. 为标注定义精确坐标
4. 为每个术语编写清晰的描述
5. 添加相关关键词
6. 在聊天界面中测试
7. 提交拉取请求

## 数据来源说明

本功能使用的示例数据来自 WebPath（https://webpath.med.utah.edu/），这是一个用于医学教育的在线病理学资源。在实际生产环境中使用时，请：

1. **遵守版权**：确保您有权使用医学图像
2. **标注来源**：在病例描述中标明图片来源
3. **教育用途**：该功能主要用于医学教育和学习
4. **隐私保护**：不要使用包含患者身份信息的图片

## 数据格式最佳实践

### 坐标标注建议

为了获得最佳的标注效果：

1. **精确定位**：使用图像编辑工具确定准确的像素坐标
2. **适当大小**：边界框应完全包含目标结构，留有适当边距
3. **避免重叠**：尽量减少标注框之间的重叠
4. **一致性**：在所有病例中保持相似的边界框大小

### 描述编写指南

1. **简洁明了**：每个描述控制在 1-2 句话
2. **专业术语**：使用标准医学术语
3. **教育性**：包含结构的功能或临床意义
4. **多语言**：可以为中英文分别编写描述

### 图片选择标准

1. **高分辨率**：至少 800x600 像素
2. **清晰度**：结构清晰可辨
3. **代表性**：展示典型的解剖或病理特征
4. **标准化**：使用标准成像方式和染色方法

## 扩展示例

### 添加心脏病理病例

```yaml
---
pathology_case_id: heart_pathology_001
pathology_category: 心血管病理
pathology_metadata:
  total_cases: 1
  images:
  - image_id: heart_normal_anatomy
    image_url: https://example.com/heart.jpg
    case_title: 正常冠状动脉解剖
    annotations:
    - term: 左冠状动脉主干
      coordinates:
        x: 150
        y: 200
        width: 80
        height: 50
      description: 左冠状动脉主干从主动脉根部发出，分支为左前降支和左回旋支
    - term: 右冠状动脉
      coordinates:
        x: 300
        y: 220
        width: 70
        height: 45
      description: 右冠状动脉供应右心室和房室结的血液
---

# 心脏病理 - 正常冠状动脉

本病例展示正常的冠状动脉解剖结构，是理解冠心病的基础。
```

### 集成到智能体工作流

```python
# 在智能体配置中添加病理搜索工具
from nexent.core.tools import PathologySearchTool

# 初始化工具
pathology_tool = PathologySearchTool(
    pathology_dir="/home/user/-/pathology_knowledge",
    top_k=5,  # 返回最多 5 个相关病例
    observer=observer
)

# 添加到智能体工具列表
agent_tools = [
    pathology_tool,
    # 其他工具...
]
```

## 性能优化建议

1. **图片缓存**：前端缓存已加载的图片
2. **懒加载**：仅在可见时加载图片
3. **索引优化**：为大型知识库建立搜索索引
4. **CDN 分发**：使用 CDN 加速图片加载
5. **压缩优化**：使用适当的图片压缩格式

## 安全考虑

1. **URL 验证**：验证图片 URL 来自可信来源
2. **内容审核**：确保医学内容的准确性
3. **访问控制**：限制敏感病理数据的访问
4. **数据加密**：传输时加密敏感图片数据

## 许可证

该功能是 Nexent 平台的一部分，遵循项目的许可条款。

---

**作者**：Nexent AI Team
**版本**：1.0.0
**最后更新**：2025-11-02
**联系方式**：support@nexent.ai
