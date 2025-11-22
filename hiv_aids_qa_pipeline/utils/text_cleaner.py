# utils/text_cleaner.py
import re
from typing import List
from .logging_utils import setup_logger

logger = setup_logger("text_cleaner")

HEADER_PATTERNS = [
    r"PATHOLOGY OF HIV/AIDS",  # 如果书抬头固定，可以加更多
]

TOC_KEYWORDS = [
    "TABLE OF CONTENTS",
]

def is_toc_page(text: str) -> bool:
    upper = text.upper()
    return any(k in upper for k in TOC_KEYWORDS)

def remove_headers_and_footers(text: str) -> str:
    for pat in HEADER_PATTERNS:
        text = re.sub(pat, "", text, flags=re.I)
    return text

def clean_page(text: str) -> str:
    """清洗单页文本：去 header/页码/多余空行，修复断行"""
    if not text:
        return ""

    # 删除孤立数字行（页码）
    text = re.sub(r"^\s*\d+\s*$", "", text, flags=re.M)

    # 去掉 header/footer
    text = remove_headers_and_footers(text)

    lines = [l.rstrip() for l in text.split("\n")]

    merged_lines: List[str] = []
    for line in lines:
        line = line.strip()

        # 空行保留一个，后面用于分段
        if not line:
            if not merged_lines or merged_lines[-1] != "":
                merged_lines.append("")
            continue

        if not merged_lines:
            merged_lines.append(line)
            continue

        prev = merged_lines[-1]

        # 如果上一行以字母/数字结尾，且不是明显句号结束，就认为是断行
        if prev and prev[-1].isalnum():
            merged_lines[-1] = prev + " " + line
        else:
            merged_lines.append(line)

    # 再清一次多余空行
    cleaned = []
    blank = 0
    for l in merged_lines:
        if l.strip():
            cleaned.append(l)
            blank = 0
        else:
            blank += 1
            if blank <= 1:
                cleaned.append("")
    return "\n".join(cleaned)

def clean_pages(pages: List[str]) -> List[str]:
    cleaned = []
    for i, p in enumerate(pages):
        if is_toc_page(p):
            logger.info(f"Skip TOC-like page {i}")
            continue
        cp = clean_page(p)
        if cp.strip():
            cleaned.append(cp)
    logger.info(f"After cleaning, kept {len(cleaned)} pages")
    return cleaned
