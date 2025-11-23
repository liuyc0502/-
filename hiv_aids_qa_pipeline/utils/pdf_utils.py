from typing import List
import pdfplumber  # 更强大的PDF提取库
from .logging_utils import setup_logger

logger = setup_logger("pdf_utils")

def extract_pages(pdf_path: str) -> List[str]:
    """从 PDF 抽取每页文本,使用pdfplumber提高质量"""
    pages = []
    try:
        with pdfplumber.open(pdf_path) as pdf:
            for i, page in enumerate(pdf.pages):
                try:
                    text = page.extract_text() or ""
                    pages.append(text)
                except Exception as e:
                    logger.error(f"Error extracting page {i}: {e}")
                    pages.append("")
        logger.info(f"Extracted {len(pages)} pages from {pdf_path}")
    except Exception as e:
        logger.error(f"Failed to open PDF {pdf_path}: {e}")
        raise
    return pages