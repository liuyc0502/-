# utils/text_cleaner.py
import re
from typing import List, Tuple, Dict, Any, Optional
from .logging_utils import setup_logger

logger = setup_logger("text_cleaner")

# 章节标题模式
CHAPTER_PATTERN = re.compile(r"^CHAPTER\s+\d+\s*-\s*.+$", re.I)

# 目录关键词
TOC_KEYWORDS = [
    "TABLE OF CONTENTS",
    "TABLES 1 - 10",
]


def is_toc_page(text: str) -> bool:
    """判断是否为目录页或表格页"""
    upper = text.upper()
    if any(k in upper for k in TOC_KEYWORDS):
        return True
    # 检查是否有大量的点号连接(目录特征)
    dots_count = text.count(".....")
    return dots_count > 5


def is_page_number_line(line: str) -> bool:
    """判断是否为单独的页码行"""
    stripped = line.strip()
    return stripped.isdigit() and len(stripped) <= 4


def is_chapter_title(line: str) -> bool:
    """判断是否为章节标题"""
    return CHAPTER_PATTERN.match(line.strip()) is not None


def fix_hyphenation(text: str) -> str:
    """修复跨行连字符"""
    return re.sub(r'(\w+)-\s*\n\s*(\w+)', r'\1\2', text)


def remove_reference_numbers(text: str, aggressive: bool = False) -> str:
    """移除参考文献编号"""
    if aggressive:
        text = re.sub(r'\[\d+(?:[-,]\d+)*\]', '', text)
    else:
        # 保守模式: 只移除句尾的
        text = re.sub(r'\[\d+(?:[-,]\d+)*\](?=[.,;:\s]|$)', '', text)
    return text


def extract_with_font_info(pdf_path: str, use_pdfplumber: bool = True) -> List[Dict[str, Any]]:
    """
    使用pdfplumber提取PDF,保留字体信息
    返回每页的结构化信息
    """
    if not use_pdfplumber:
        logger.warning("Font-based extraction requires pdfplumber")
        return []

    try:
        import pdfplumber
    except ImportError:
        logger.error("pdfplumber not installed, cannot extract font info")
        return []

    pages_data = []

    with pdfplumber.open(pdf_path) as pdf:
        total = len(pdf.pages)
        logger.info(f"Extracting {total} pages with font information...")

        for page_num, page in enumerate(pdf.pages):
            try:
                # 提取所有字符及其格式
                chars = page.chars

                # 按行分组字符
                lines_info = []
                current_line = []
                current_y = None
                tolerance = 2  # Y坐标容差

                for char in chars:
                    y = char.get('top', 0)

                    # 判断是否新行
                    if current_y is None or abs(y - current_y) > tolerance:
                        if current_line:
                            lines_info.append(analyze_line(current_line))
                        current_line = [char]
                        current_y = y
                    else:
                        current_line.append(char)

                # 最后一行
                if current_line:
                    lines_info.append(analyze_line(current_line))

                pages_data.append({
                    "page_num": page_num,
                    "lines": lines_info,
                })

                if (page_num + 1) % 50 == 0:
                    logger.info(f"Processed {page_num + 1}/{total} pages")

            except Exception as e:
                logger.error(f"Error processing page {page_num}: {e}")
                pages_data.append({
                    "page_num": page_num,
                    "lines": [],
                })

        logger.info(f"Extraction complete: {len(pages_data)} pages")

    return pages_data


def analyze_line(chars: List[Dict]) -> Dict[str, Any]:
    """分析一行字符的格式特征"""
    if not chars:
        return {
            "text": "",
            "is_bold": False,
            "font_size": 0,
            "font_name": "",
        }

    text = "".join(c.get('text', '') for c in chars)

    # 统计字体信息
    bold_count = 0
    size_sum = 0
    font_names = []

    for char in chars:
        fontname = char.get('fontname', '')
        if 'Bold' in fontname:
            bold_count += 1
        size_sum += char.get('size', 0)
        if fontname:
            font_names.append(fontname)

    total = len(chars)
    is_bold = bold_count > total * 0.8  # 80%以上是粗体
    avg_size = size_sum / total if total > 0 else 12
    common_font = max(set(font_names), key=font_names.count) if font_names else ""

    return {
        "text": text.strip(),
        "is_bold": is_bold,
        "font_size": round(avg_size, 1),
        "font_name": common_font,
    }


def classify_line(line_info: Dict[str, Any]) -> str:
    """
    根据字体信息分类行
    返回: 'chapter', 'section', 'page_number', 'text', 'empty'
    """
    text = line_info["text"]
    is_bold = line_info["is_bold"]
    size = line_info["font_size"]

    if not text:
        return "empty"

    # 页码: 单独数字
    if is_page_number_line(text):
        return "page_number"

    # 章节标题: 粗体 + 14号字
    if is_bold and size >= 13.5 and is_chapter_title(text):
        return "chapter"

    # 小节标题: 粗体 + 12号字 + 全大写 + 不太短也不太长
    if is_bold and 11.5 <= size <= 12.5:
        if text.isupper() and 5 <= len(text) <= 150:
            # 排除单独的数字(页码)
            if not text.isdigit():
                # 排除明显不是标题的内容
                if not any(x in text.lower() for x in ['http', 'www', 'table', 'figure']):
                    return "section"

    # 其余为正文
    return "text"


def clean_pages_with_fonts(pages_data: List[Dict[str, Any]], remove_refs: bool = True) -> Tuple[List[str], List[Dict]]:
    """
    基于字体信息清洗页面
    返回: (清洗后的页面文本列表, 章节信息列表)
    """
    cleaned_pages = []
    chapter_info = []
    skip_stats = {"toc": 0, "empty": 0, "kept": 0}

    for page_data in pages_data:
        page_num = page_data["page_num"]
        lines = page_data["lines"]

        # 构建页面文本用于TOC检测
        page_text = "\n".join(line["text"] for line in lines)

        # 跳过目录页
        if is_toc_page(page_text):
            logger.info(f"Skip TOC/table page {page_num}")
            skip_stats["toc"] += 1
            continue

        # 处理每一行
        cleaned_lines = []
        for line_info in lines:
            line_type = classify_line(line_info)
            text = line_info["text"]

            if line_type == "empty":
                # 保留一个空行
                if not cleaned_lines or cleaned_lines[-1] != "":
                    cleaned_lines.append("")

            elif line_type == "page_number":
                # 跳过页码
                continue

            elif line_type == "chapter":
                # 章节标题
                chapter_info.append({
                    "page": page_num,
                    "type": "CHAPTER",
                    "text": text,
                })
                cleaned_lines.append("")
                cleaned_lines.append(text)
                cleaned_lines.append("")

            elif line_type == "section":
                # 小节标题
                chapter_info.append({
                    "page": page_num,
                    "type": "SECTION",
                    "text": text,
                })
                cleaned_lines.append("")
                cleaned_lines.append(text)
                cleaned_lines.append("")

            else:  # "text"
                cleaned_lines.append(text)

        # 合并多余空行
        final_lines = []
        prev_empty = False
        for line in cleaned_lines:
            is_empty = not line.strip()
            if is_empty:
                if not prev_empty:
                    final_lines.append("")
                prev_empty = True
            else:
                final_lines.append(line)
                prev_empty = False

        page_text = "\n".join(final_lines).strip()

        if page_text:
            # 可选: 移除参考文献编号
            if remove_refs:
                page_text = remove_reference_numbers(page_text, aggressive=False)

            cleaned_pages.append(page_text)
            skip_stats["kept"] += 1
        else:
            skip_stats["empty"] += 1

    logger.info(
        f"Cleaning complete: kept {skip_stats['kept']} pages, "
        f"skipped {skip_stats['toc']} TOC, {skip_stats['empty']} empty"
    )
    logger.info(
        f"Detected {len([c for c in chapter_info if c['type'] == 'CHAPTER'])} chapters, "
        f"{len([c for c in chapter_info if c['type'] == 'SECTION'])} sections"
    )

    return cleaned_pages, chapter_info


# 在clean_pages_with_fonts结束后添加
def validate_cleaning_quality(cleaned_pages, chapter_info):
    """检查清洗质量"""
    issues = []

    # 检查是否有章节
    if not any(c['type'] == 'CHAPTER' for c in chapter_info):
        issues.append("⚠️ No chapters detected!")

    # 检查是否有过短的页面
    short_pages = [i for i, p in enumerate(cleaned_pages) if len(p) < 100]
    if len(short_pages) > len(cleaned_pages) * 0.3:
        issues.append(f"⚠️ {len(short_pages)} pages are very short")

    # 检查是否有明显的清洗失败(保留了页码)
    pages_with_numbers = []
    for i, page in enumerate(cleaned_pages):
        lines = page.split('\n')
        number_lines = [l for l in lines if l.strip().isdigit() and len(l.strip()) <= 4]
        if len(number_lines) > 2:
            pages_with_numbers.append(i)

    if pages_with_numbers:
        issues.append(f"⚠️ {len(pages_with_numbers)} pages may have page numbers")

    return issues























