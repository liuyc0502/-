# scripts/01_extract_and_clean.py
import os, json, sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import RAW_PDF_DIR, PDF_FILENAME, INTERMEDIATE_DIR
from utils.pdf_utils import extract_pages
from utils.text_cleaner import clean_pages
from utils.logging_utils import setup_logger

logger = setup_logger("01_extract_and_clean")

if __name__ == "__main__":
    pdf_path = os.path.join(RAW_PDF_DIR, PDF_FILENAME)
    if not os.path.exists(pdf_path):
        raise FileNotFoundError(f"PDF not found: {pdf_path}")

    logger.info(f"Reading PDF: {pdf_path}")
    pages = extract_pages(pdf_path)
    cleaned_pages = clean_pages(pages)

    out_path = os.path.join(INTERMEDIATE_DIR, "pages_clean.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(cleaned_pages, f, ensure_ascii=False, indent=2)

    logger.info(f"Saved cleaned pages to {out_path}")
