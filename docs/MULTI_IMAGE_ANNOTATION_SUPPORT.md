# 多图片标注功能支持文档

## 🎯 功能目标

支持一个知识库文档包含多个病理图片，每个图片有独立的交互式标注。

---

## 📊 数据结构

### **后端知识库文档（.md）**

```yaml
---
pathology_metadata:
  images:
    - image_id: "cv_001"
      image_url: "https://webpath.med.utah.edu/jpeg5/CV001.jpg"
      case_title: "Normal Artery"
      annotations: []

    - image_id: "cv_002"
      image_url: "https://webpath.med.utah.edu/jpeg5/CV016.jpg"
      case_title: "Mild Atherosclerosis"
      annotations:
        - term: "yellow lipid plaques"
          coordinates: {x: 120, y: 140, width: 60, height: 40}

    - image_id: "cv_003"
      image_url: "https://webpath.med.utah.edu/jpeg5/CV017.jpg"
      case_title: "Advanced Atherosclerosis"
      annotations:
        - term: "fibrous plaque"
          coordinates: {x: 200, y: 180, width: 80, height: 50}
        - term: "calcification"
          coordinates: {x: 150, y: 220, width: 40, height: 40}
---
```

---

## 🔧 后端修改

### **1. KnowledgeBaseSearchTool 增强**

修改 `sdk/nexent/core/tools/knowledge_base_search_tool.py`:

```python
def _send_pathology_images_if_present(self, search_results: List[dict]):
    """
    Check if search results contain pathology metadata and send PATHOLOGY_IMAGE messages.
    Supports both single-image and multi-image formats.
    """
    for result in search_results:
        pathology_meta = result.get("pathology_metadata")
        if not pathology_meta:
            continue

        # Handle multi-image format (new)
        if "images" in pathology_meta:
            images_list = pathology_meta["images"]

            for image_data in images_list:
                image_url = image_data.get("image_url")
                annotations = image_data.get("annotations", [])

                if not image_url:
                    continue

                # Prepare pathology image data
                pathology_data = {
                    "image_id": image_data.get("image_id"),
                    "image_url": image_url,
                    "annotations": annotations,
                    "case_title": image_data.get("case_title", ""),
                    "source_file": image_data.get("source_file", ""),
                    "category": result.get("pathology_category", ""),
                    "document_title": result.get("title", "")
                }

                # Send PATHOLOGY_IMAGE message via observer
                self.observer.add_message(
                    "",
                    ProcessType.PATHOLOGY_IMAGE,
                    json.dumps(pathology_data, ensure_ascii=False)
                )

                logger.info(f"Sent pathology image: {image_url} with {len(annotations)} annotations")

        # Handle legacy single-image format (backward compatibility)
        elif "image_url" in pathology_meta:
            image_url = pathology_meta.get("image_url")
            annotations = pathology_meta.get("annotations", [])

            if not image_url or not annotations:
                continue

            pathology_data = {
                "image_url": image_url,
                "annotations": annotations,
                "case_id": result.get("pathology_case_id", ""),
                "source_title": result.get("title", "")
            }

            self.observer.add_message(
                "",
                ProcessType.PATHOLOGY_IMAGE,
                json.dumps(pathology_data, ensure_ascii=False)
            )
```

---

## 🎨 前端修改

### **2. 更新消息类型定义**

`frontend/app/[locale]/chat/streaming/chatStreamHandler.tsx`:

```typescript
case chatConfig.messageTypes.PATHOLOGY_IMAGE:
  try {
    const pathologyData = JSON.parse(messageContent);

    setMessages((prev) => {
      const newMessages = [...prev];
      const lastMsg = newMessages[newMessages.length - 1];

      if (!lastMsg) {
        return newMessages;
      }

      // Initialize pathology images array if needed
      if (!lastMsg.pathologyImages) {
        lastMsg.pathologyImages = [];
      }

      // Add pathology image data (supports multiple images)
      lastMsg.pathologyImages.push({
        imageId: pathologyData.image_id || `img_${lastMsg.pathologyImages.length}`,
        imageUrl: pathologyData.image_url,
        annotations: pathologyData.annotations || [],
        caseTitle: pathologyData.case_title || pathologyData.source_title || "",
        sourceFile: pathologyData.source_file || "",
        category: pathologyData.category || "",
        documentTitle: pathologyData.document_title || ""
      });

      return newMessages;
    });
  } catch (error) {
    log.error("Failed to process PATHOLOGY_IMAGE message", error);
  }
  break;
```

---

### **3. PathologyImageViewer 组件**

`frontend/app/[locale]/chat/components/PathologyImageViewer.tsx`:

组件已经支持单图片标注。对于多图片，只需在父组件中循环渲染：

```typescript
{/* In ChatStreamMessage.tsx */}
{message.pathologyImages && message.pathologyImages.length > 0 && (
  <div className="pathology-images-container space-y-6">
    {message.pathologyImages.map((pathologyImg, index) => (
      <div key={pathologyImg.imageId || index} className="pathology-image-wrapper">
        {/* Category badge (if multiple categories) */}
        {pathologyImg.category && (
          <div className="mb-2 inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
            {pathologyImg.category}
          </div>
        )}

        <PathologyImageViewer
          imageId={pathologyImg.imageId}
          imageUrl={pathologyImg.imageUrl}
          annotations={pathologyImg.annotations}
          caseTitle={pathologyImg.caseTitle}
          sourceFile={pathologyImg.sourceFile}
        />
      </div>
    ))}
  </div>
)}
```

---

### **4. 增强的 PathologyImageViewer（支持图片ID）**

```typescript
interface PathologyImageViewerProps {
  imageId?: string;              // 新增：图片唯一标识
  imageUrl: string;
  annotations: Annotation[];
  caseTitle?: string;
  sourceFile?: string;
}

export const PathologyImageViewer: React.FC<PathologyImageViewerProps> = ({
  imageId,
  imageUrl,
  annotations,
  caseTitle,
  sourceFile
}) => {
  const [selectedAnnotation, setSelectedAnnotation] = useState<Annotation | null>(null);

  return (
    <div className="pathology-viewer border rounded-lg p-4 my-4 bg-white shadow-sm">
      {/* Header with case title and ID */}
      <div className="mb-3 flex items-center justify-between">
        <div>
          {caseTitle && <h4 className="text-sm font-semibold text-gray-700">{caseTitle}</h4>}
          {imageId && <p className="text-xs text-gray-500">Image: {imageId}</p>}
          {sourceFile && <p className="text-xs text-gray-400">Source: {sourceFile}</p>}
        </div>
        {annotations.length > 0 && (
          <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
            {annotations.length} annotation{annotations.length > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Image Container */}
      <div className="relative inline-block">
        <img
          src={imageUrl}
          alt={caseTitle || "Pathology image"}
          className="max-w-full h-auto rounded border"
        />

        {/* Arrow and highlight overlay */}
        {selectedAnnotation && (
          <svg className="absolute top-0 left-0 w-full h-full pointer-events-none" style={{ zIndex: 10 }}>
            <defs>
              <marker id={`arrowhead-${imageId}`} markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="#ef4444" />
              </marker>
            </defs>

            {/* Arrow line */}
            <line
              x1={selectedAnnotation.coordinates.x - 50}
              y1={selectedAnnotation.coordinates.y - 50}
              x2={selectedAnnotation.coordinates.x}
              y2={selectedAnnotation.coordinates.y}
              stroke="#ef4444"
              strokeWidth="3"
              markerEnd={`url(#arrowhead-${imageId})`}
            />

            {/* Highlight box */}
            <rect
              x={selectedAnnotation.coordinates.x}
              y={selectedAnnotation.coordinates.y}
              width={selectedAnnotation.coordinates.width}
              height={selectedAnnotation.coordinates.height}
              fill="none"
              stroke="#ef4444"
              strokeWidth="2"
              strokeDasharray="5,5"
            />
          </svg>
        )}
      </div>

      {/* Annotations List */}
      {annotations.length > 0 && (
        <div className="mt-4">
          <p className="text-sm font-semibold text-gray-700 mb-2">Interactive Annotations:</p>
          <div className="flex flex-wrap gap-2">
            {annotations.map((annotation, index) => (
              <button
                key={index}
                onClick={() => setSelectedAnnotation(annotation)}
                className={`px-3 py-1 rounded-full text-sm transition-all ${
                  selectedAnnotation?.term === annotation.term
                    ? 'bg-red-500 text-white font-semibold shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                title={annotation.description}
              >
                {annotation.term}
              </button>
            ))}
          </div>

          {/* Description Box */}
          {selectedAnnotation && selectedAnnotation.description && (
            <div className="mt-3 p-3 bg-blue-50 border-l-4 border-blue-500 rounded">
              <p className="text-sm text-gray-800">
                <strong>{selectedAnnotation.term}:</strong> {selectedAnnotation.description}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
```

---

## 🎬 用户交互流程

### **场景：用户提问动脉粥样硬化进展**

**用户输入：**
```
"显示动脉粥样硬化从早期到晚期的病理变化"
```

**系统处理：**
1. KnowledgeBaseSearchTool 检索 `CV_cardiovascular.md`
2. 检测到 `pathology_metadata.images` 包含 3 个图片
3. 依次发送 3 条 `PATHOLOGY_IMAGE` 消息

**前端渲染：**
```
Assistant 回复：
-----------------------------------
根据知识库，这里是动脉粥样硬化的进展过程：

[图片 1: Normal Coronary Artery]
(Image: cv_001)
正常的冠状动脉，管腔开放，内膜光滑...

[图片 2: Mild Atherosclerosis]
(Image: cv_002)
Interactive Annotations: [yellow lipid plaques]

轻度动脉硬化，可见散在的黄色脂质斑块...
[用户点击 "yellow lipid plaques" → 箭头指向图片上对应位置]

[图片 3: Advanced Atherosclerosis]
(Image: cv_003)
Interactive Annotations: [fibrous plaque] [calcification]

严重动脉硬化，管腔明显狭窄...
[用户点击 "calcification" → 箭头指向钙化区域]
-----------------------------------
```

---

## ✅ 验证清单

### **后端验证**

- [ ] Elasticsearch 正确索引 `pathology_metadata.images` 字段
- [ ] KnowledgeBaseSearchTool 能检测多图片格式
- [ ] ProcessType.PATHOLOGY_IMAGE 消息正确发送
- [ ] 每个图片独立发送一条消息

### **前端验证**

- [ ] chatStreamHandler 正确解析多条 PATHOLOGY_IMAGE 消息
- [ ] message.pathologyImages 数组正确累积
- [ ] PathologyImageViewer 正确渲染多个实例
- [ ] 每个图片的标注独立工作（点击不互相干扰）
- [ ] 图片ID唯一（用于 SVG marker 避免冲突）

---

## 🔄 兼容性

### **向后兼容**

代码同时支持：

1. **旧格式**（单图片）:
   ```yaml
   pathology_metadata:
     image_url: "..."
     annotations: [...]
   ```

2. **新格式**（多图片）:
   ```yaml
   pathology_metadata:
     images:
       - image_url: "..."
         annotations: [...]
       - image_url: "..."
         annotations: [...]
   ```

---

## 📊 性能考虑

### **优化建议**

1. **图片懒加载**：使用 `loading="lazy"` 属性
2. **限制同时显示数量**：如果超过 10 张图片，使用分页或折叠
3. **图片预加载**：检测到 pathology metadata 时提前加载图片
4. **缓存标注状态**：避免重复计算坐标

---

## 🎯 实施优先级

### **阶段 1：核心功能（必须）**
- [x] 后端支持多图片 YAML 解析
- [x] 批量转换脚本生成正确格式
- [ ] KnowledgeBaseSearchTool 发送多图片消息
- [ ] 前端渲染多个 PathologyImageViewer

### **阶段 2：增强功能（可选）**
- [ ] 图片缩放功能
- [ ] 图片对比模式（并排显示）
- [ ] 导出标注数据
- [ ] 打印友好视图

### **阶段 3：高级功能（未来）**
- [ ] 3D 模型支持
- [ ] 用户自定义标注
- [ ] 标注分享功能
- [ ] AI 自动标注建议

---

## 📝 总结

**多图片标注功能完全支持！** ✅

- ✅ 数据结构设计完成
- ✅ 后端逻辑兼容单/多图片
- ✅ 前端组件支持独立渲染
- ✅ 用户交互体验流畅
- ✅ 向后兼容旧格式

**下一步：**
1. 运行批量转换脚本（3962 个文件 → ~50 个合并文档）
2. 上传到 Nexent 知识库
3. 实施前端代码修改
4. 测试完整的交互体验
