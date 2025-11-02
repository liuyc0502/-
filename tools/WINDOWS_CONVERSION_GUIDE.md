# WebPath HTML 转换指南 (Windows)

## 📋 准备工作

### 1. 确认文件位置

你的 HTML 文件位置：
```
C:\Users\lyc05\PycharmProjects\PythonProject\webpath_data\html\webpath.med.utah.edu
```

### 2. 下载转换工具

从 GitHub 仓库下载以下文件到你的项目目录：
```
C:\Users\lyc05\PycharmProjects\PythonProject\
├── webpath_html_to_md.py          # 转换脚本
└── convert_webpath.bat             # Windows 批处理脚本
```

或者使用 git：
```bash
cd C:\Users\lyc05\PycharmProjects\PythonProject
git clone <your-repo-url>
cd <repo-name>/tools
copy webpath_html_to_md.py C:\Users\lyc05\PycharmProjects\PythonProject\
copy convert_webpath.bat C:\Users\lyc05\PycharmProjects\PythonProject\
```

---

## 🚀 快速转换（自动模式）

### 方法 1：双击运行

1. 确保 `webpath_html_to_md.py` 和 `convert_webpath.bat` 在同一目录
2. 双击 `convert_webpath.bat`
3. 等待转换完成
4. 在 `webpath_md_output\` 文件夹中查看结果

### 方法 2：命令行运行

打开 PowerShell 或 CMD：

```bash
cd C:\Users\lyc05\PycharmProjects\PythonProject

# 运行批量转换
python webpath_html_to_md.py --batch webpath_data\html\webpath.med.utah.edu\ webpath_md_output\
```

---

## 📝 手动转换（单文件）

如果只想转换单个文件：

```bash
python webpath_html_to_md.py webpath_data\html\webpath.med.utah.edu\CV016.html output\CV016.md
```

---

## 🔍 验证转换结果

转换完成后，检查生成的 .md 文件：

1. **打开任意 .md 文件**
   ```
   webpath_md_output\CV016.md
   ```

2. **验证 YAML 元数据**
   ```yaml
   ---
   pathology_case_id: "cv016"
   pathology_metadata:
     image_url: "https://webpath.med.utah.edu/jpeg5/CV016.jpg"
     annotations:
       - term: "yellow lipid plaques"
         description: "..."
         coordinates:
           x: 120
           y: 140
           width: 60
           height: 40
   ---
   ```

3. **验证图片 URL 可访问**
   - 复制 `image_url` 到浏览器
   - 确认图片可以正常加载

---

## 📤 导入到 Nexent 知识库

### 步骤 1：准备文件

转换完成后，你会得到类似结构：
```
webpath_md_output\
├── atherosclerosis.md
├── cv016.md
├── cv017.md
├── cv018.md
└── ...
```

### 步骤 2：上传到 Nexent

1. 访问 Nexent 前端：`http://localhost:3000`
2. 进入 **知识库管理** 页面
3. 点击 **创建新知识库**
   - 名称：`WebPath Pathology`
   - 描述：`Interactive pathology cases from WebPath`
4. 点击 **上传文档**
5. 选择 `webpath_md_output` 文件夹中的所有 .md 文件
6. 等待处理完成

### 步骤 3：验证导入

1. 在知识库中搜索：`atherosclerosis`
2. 检查返回结果是否包含病理描述
3. 验证元数据是否正确解析

---

## 🛠️ 故障排查

### 问题 1：Python 命令未找到

**解决方案：**
```bash
# 检查 Python 安装
python --version

# 如果未安装，下载并安装 Python 3.8+
# https://www.python.org/downloads/
```

### 问题 2：路径找不到

**解决方案：**

编辑 `convert_webpath.bat`，修改路径：

```batch
set INPUT_DIR=C:\Users\lyc05\PycharmProjects\PythonProject\webpath_data\html\webpath.med.utah.edu
set OUTPUT_DIR=C:\Users\lyc05\PycharmProjects\PythonProject\webpath_md_output
```

### 问题 3：转换失败

**解决方案：**

1. 检查 HTML 文件编码
   ```bash
   python webpath_html_to_md.py test.html test.md
   ```

2. 查看错误日志
   ```bash
   python webpath_html_to_md.py --batch input\ output\ > conversion.log 2>&1
   ```

3. 检查 HTML 文件格式是否符合 WebPath 标准

---

## 📊 预期结果

### 转换统计

假设你有 100 个 HTML 文件，转换后：

```
Found 100 HTML files to convert
INFO: Converting: CV001.html → CV001.md
INFO: ✓ Created: webpath_md_output\CV001.md
INFO: Converting: CV002.html → CV002.md
INFO: ✓ Created: webpath_md_output\CV002.md
...
INFO: Converting: CV100.html → CV100.md
INFO: ✓ Created: webpath_md_output\CV100.md

Conversion complete: 100/100 files succeeded
```

### 文件大小

- 原始 HTML：~5-20 KB 每个文件
- 转换后 .md：~3-10 KB 每个文件（更简洁）

---

## 🎯 下一步

转换完成后：

1. ✅ **验证转换结果**
2. ✅ **上传到 Nexent 知识库**
3. ⏳ **实施交互式病理查看器**（前端组件）
4. ⏳ **测试完整的智能体对话功能**

---

## 📞 需要帮助？

如果遇到问题：

1. 检查 HTML 文件是否来自 WebPath 官方网站
2. 确认文件结构符合预期
3. 提供错误日志以便诊断

**示例错误报告：**
```
文件：CV016.html
错误：图片 URL 未提取
日志：[粘贴错误信息]
```
