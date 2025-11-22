# utils/pdf_utils.py
from typing import List
from PyPDF2 import PdfReader
from .logging_utils import setup_logger

logger = setup_logger("pdf_utils")

def extract_pages(pdf_path: str) -> List[str]:
    """从 PDF 抽取每页文本"""
    reader = PdfReader(pdf_path)
    pages = []
    for i, page in enumerate(reader.pages):
        try:
            text = page.extract_text() or ""
        except Exception as e:
            logger.error(f"Error extracting page {i}: {e}")
            text = ""
        pages.append(text)
    logger.info(f"Extracted {len(pages)} pages from {pdf_path}")
    return pages
