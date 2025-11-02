# WebPath 合并转换指南 (按类别分组)

## 🎯 核心特性

### **新方案 vs 旧方案对比**

| 特性 | 旧方案 (单文件) | **新方案 (合并)** ✨ |
|------|----------------|-------------------|
| 文档数量 | 3962 个 .md 文件 | ~50-100 个 .md 文件（按前缀分类） |
| 知识库组织 | 每个 HTML = 1 文档 | 每个类别 = 1 文档 |
| 图片标注支持 | ✓ 单图片标注 | ✓ **多图片标注** |
| 管理难度 | 困难 | 简单 |
| 检索效率 | 低 | 高 |

### **文件分组示例**

```
CV001.html, CV002.html, ..., CV150.html (150 files)
    ↓ 合并为
CV_cardiovascular.md (1 file, 150 images with annotations)

ATH001.html, ATH002.html, ..., ATH080.html (80 files)
    ↓ 合并为
ATH_atherosclerosis.md (1 file, 80 images with annotations)

RENAL001.html, ..., RENAL120.html (120 files)
    ↓ 合并为
RENAL_kidney.md (1 file, 120 images with annotations)
```

---

## 📋 前提条件

### 1. 确认文件位置

你的 HTML 文件路径：
```
C:\Users\lyc05\PycharmProjects\PythonProject\webpath_data\html\webpath.med.utah.edu\
├── CV001.html
├── CV002.html
├── ATH001.html
├── RENAL001.html
└── ... (共 3962 个文件)
```

### 2. 下载脚本

从 GitHub 仓库下载：
- `webpath_merge_by_category.py` (核心脚本)
- `convert_webpath_merged.bat` (Windows 批处理)

放到项目目录：
```
C:\Users\lyc05\PycharmProjects\PythonProject\
```

---

## 🚀 使用方法

### **方法 1：自动转换（推荐）**

双击运行：`convert_webpath_merged.bat`

脚本会自动：
1. 扫描所有 HTML 文件
2. 按前缀分类（CV, ATH, RENAL, 等）
3. 每个类别合并为一个 .md 文档
4. 生成转换摘要

---

### **方法 2：命令行转换**

```bash
cd C:\Users\lyc05\PycharmProjects\PythonProject

# 转换所有类别
python webpath_merge_by_category.py webpath_data\html\webpath.med.utah.edu\ webpath_knowledge_merged\
```

**预计时间：** ~2-5 分钟（3962 个文件）

---

### **方法 3：单独转换某一类**

如果只想转换特定前缀的文件（例如只转换心血管类）：

```bash
# 只转换 CV 类（心血管）
python webpath_merge_by_category.py --prefix CV webpath_data\html\webpath.med.utah.edu\ webpath_knowledge_merged\

# 只转换 ATH 类（动脉硬化）
python webpath_merge_by_category.py --prefix ATH webpath_data\html\webpath.med.utah.edu\ webpath_knowledge_merged\

# 只转换 RENAL 类（肾脏）
python webpath_merge_by_category.py --prefix RENAL webpath_data\html\webpath.med.utah.edu\ webpath_knowledge_merged\
```

---

## 📊 预期输出

### **输出目录结构**

```
webpath_knowledge_merged\
├── _CONVERSION_SUMMARY.md          # 转换摘要
├── CV_cardiovascular.md            # 心血管病理 (所有CV*.html合并)
├── ATH_atherosclerosis.md          # 动脉硬化 (所有ATH*.html合并)
├── RENAL_kidney.md                 # 肾脏病理 (所有RENAL*.html合并)
├── LUNG_pulmonary.md               # 肺部病理
├── GI_gastrointestinal.md          # 消化系统
├── HEPAT_hepatic.md                # 肝脏病理
├── NEURO_neurological.md           # 神经系统
└── ... (其他类别)
```

### **转换摘要示例**

打开 `_CONVERSION_SUMMARY.md` 查看：

```markdown
# WebPath Conversion Summary

**Total Categories:** 35
**Total Cases:** 3962

## Categories

- **CV** - Cardiovascular: 150 cases → `CV_cardiovascular.md`
- **ATH** - Atherosclerosis: 80 cases → `ATH_atherosclerosis.md`
- **RENAL** - Kidney: 120 cases → `RENAL_kidney.md`
- **LUNG** - Pulmonary: 95 cases → `LUNG_pulmonary.md`
- ...
```

---

## 📝 生成文档的结构

### **YAML 元数据（支持多图片）**

```yaml
---
pathology_case_id: "cv_collection"
pathology_category: "Cardiovascular"
pathology_prefix: "CV"
total_cases: 150
pathology_metadata:
  images:
    - image_id: "cv_001"
      source_file: "CV001.html"
      image_url: "https://webpath.med.utah.edu/jpeg5/CV001.jpg"
      case_title: "Normal Coronary Artery"
      annotations: []

    - image_id: "cv_002"
      source_file: "CV016.html"
      image_url: "https://webpath.med.utah.edu/jpeg5/CV016.jpg"
      case_title: "Mild Atherosclerosis"
      annotations:
        - term: "yellow lipid plaques"
          description: "Scattered lipid deposits"
          coordinates: {x: 120, y: 140, width: 60, height: 40}

    # ... 共 150 个图片
---
```

### **Markdown 内容**

```markdown
# Cardiovascular Pathology Collection

> **Category:** CV
> **Total Cases:** 150
> **Knowledge Base:** WebPath Medical Education

---

## Case 1: Normal Coronary Artery

**Image ID:** `cv_001`
**Source File:** `CV001.html`

![Normal Coronary Artery](cv_001)

### Description
This is a normal coronary artery...

---

## Case 2: Mild Atherosclerosis

**Image ID:** `cv_002`
**Source File:** `CV016.html`

![Mild Atherosclerosis](cv_002)

### Description
This is mild coronary atherosclerosis...

### Key Features
- **yellow lipid plaques**: Scattered lipid deposits

---

(... 共 150 个 cases)
```

---

## 🔍 验证转换结果

### **步骤 1：检查文件数量**

```bash
# 查看生成的类别文件
dir webpath_knowledge_merged\*.md

# 应该看到约 30-50 个 .md 文件（而不是 3962 个）
```

### **步骤 2：查看转换摘要**

打开 `webpath_knowledge_merged\_CONVERSION_SUMMARY.md` 检查：
- 总类别数
- 总病例数（应该 = 3962）
- 每个类别的文件数

### **步骤 3：抽查具体文档**

随机打开一个文档（例如 `CV_cardiovascular.md`），检查：
- ✅ YAML 元数据完整
- ✅ 图片 URL 可访问
- ✅ 标注坐标存在（如果原HTML有）
- ✅ 描述内容完整

---

## 📤 导入到 Nexent 知识库

### **推荐方案：每个类别 = 一个知识库**

1. **创建多个知识库**
   - 知识库 1: "Cardiovascular Pathology" → 上传 `CV_cardiovascular.md`
   - 知识库 2: "Atherosclerosis" → 上传 `ATH_atherosclerosis.md`
   - 知识库 3: "Kidney Pathology" → 上传 `RENAL_kidney.md`
   - ...

2. **或者：全部合并到一个知识库**
   - 知识库: "WebPath Complete Collection"
   - 上传所有生成的 .md 文件（约 30-50 个）

### **上传步骤**

1. 访问 Nexent: `http://localhost:3000`
2. 进入**知识库管理**
3. 创建新知识库："WebPath Cardiovascular"
4. 上传 `CV_cardiovascular.md`
5. 等待处理完成
6. 重复其他类别

---

## 🎨 前端交互效果

### **用户对话示例**

**用户：** "显示动脉粥样硬化的进展过程"

**智能体回答：**
```
根据知识库，我找到了动脉粥样硬化的不同阶段：

1. 早期阶段 (CV016)
   [显示图片 1]
   - 可以点击 "yellow lipid plaques" 查看标注

2. 中期阶段 (CV017)
   [显示图片 2]
   - 可以点击 "fibrous plaque"
   - 可以点击 "calcification"

3. 晚期阶段 (CV018)
   [显示图片 3]
   - 可以点击 "occlusive thrombus"
```

**交互：**
- 用户点击 "yellow lipid plaques" → 图片 1 上显示红色箭头指向坐标 (120, 140)
- 用户点击 "calcification" → 图片 2 上显示箭头指向坐标 (150, 220)

---

## 🛠️ 故障排查

### **问题 1：找不到输入目录**

**错误：**
```
ERROR: Input directory not found: webpath_data\html\webpath.med.utah.edu
```

**解决方案：**

编辑 `convert_webpath_merged.bat`，修改路径为绝对路径：
```batch
set INPUT_DIR=C:\Users\lyc05\PycharmProjects\PythonProject\webpath_data\html\webpath.med.utah.edu
```

---

### **问题 2：转换速度太慢**

**正常情况：**
- 3962 个文件预计需要 2-5 分钟
- 平均每秒处理 10-20 个文件

**如果超过 10 分钟：**
- 检查 HTML 文件是否有编码问题
- 尝试先转换单个类别测试：
  ```bash
  python webpath_merge_by_category.py --prefix CV input\ output\
  ```

---

### **问题 3：某些类别没有生成**

**可能原因：**
- 文件名前缀不符合规则
- HTML 文件损坏

**检查方法：**
```bash
# 查看所有文件名前缀
dir /b webpath_data\html\webpath.med.utah.edu\*.html | findstr /r "^[A-Z]*[0-9]"
```

---

## 🎯 下一步

转换完成后：

1. ✅ **验证转换结果**（检查摘要和抽查文档）
2. ✅ **上传到 Nexent 知识库**
3. ⏳ **实施前端交互功能**（多图片标注支持）
4. ⏳ **测试智能体对话**

---

## 📞 需要帮助？

### **常见前缀对照表**

| 前缀 | 含义 | 示例 |
|------|------|------|
| CV | Cardiovascular (心血管) | CV001.html |
| ATH | Atherosclerosis (动脉硬化) | ATH042.html |
| RENAL | Kidney (肾脏) | RENAL123.html |
| LUNG | Pulmonary (肺部) | LUNG045.html |
| GI | Gastrointestinal (消化系统) | GI067.html |
| HEPAT | Hepatic (肝脏) | HEPAT012.html |
| NEURO | Neurological (神经系统) | NEURO089.html |
| BONE | Musculoskeletal (骨骼) | BONE034.html |

如果遇到未识别的前缀，脚本会自动归类为该前缀名称。

---

## 🌟 高级用法

### **批量处理多个前缀**

创建 PowerShell 脚本：

```powershell
# batch_convert.ps1
$prefixes = @("CV", "ATH", "RENAL", "LUNG", "GI", "HEPAT")

foreach ($prefix in $prefixes) {
    Write-Host "Converting $prefix..."
    python webpath_merge_by_category.py --prefix $prefix `
        webpath_data\html\webpath.med.utah.edu\ `
        webpath_knowledge_merged\
}

Write-Host "All conversions complete!"
```

运行：
```bash
powershell -ExecutionPolicy Bypass -File batch_convert.ps1
```
