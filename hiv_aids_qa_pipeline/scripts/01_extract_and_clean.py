# scripts/01_extract_and_clean.py
import os
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from config import RAW_PDF_DIR, PDF_FILENAME, INTERMEDIATE_DIR
from utils.text_cleaner import extract_with_font_info, clean_pages_with_fonts
from utils.logging_utils import setup_logger

logger = setup_logger("01_extract_and_clean")


def main():
    """主函数:使用字体信息提取和清洗PDF"""

    pdf_path = Path(RAW_PDF_DIR) / PDF_FILENAME
    if not pdf_path.exists():
        logger.error(f"PDF file not found: {pdf_path}")
        logger.error(f"Please place {PDF_FILENAME} in {RAW_PDF_DIR}")
        sys.exit(1)

    logger.info("=" * 60)
    logger.info("Step 1: Extract and Clean PDF (with font information)")
    logger.info("=" * 60)
    logger.info(f"Processing: {pdf_path}")

    # 检查pdfplumber
    try:
        import pdfplumber
        logger.info("✓ pdfplumber available - will use font-based extraction")
    except ImportError:
        logger.error("✗ pdfplumber not installed")
        logger.error("Install with: pip install pdfplumber")
        logger.error("Font-based section detection requires pdfplumber")
        sys.exit(1)

    # 提取PDF,保留字体信息
    logger.info("\nExtracting pages with font information...")
    pages_data = extract_with_font_info(str(pdf_path), use_pdfplumber=True)

    if not pages_data:
        logger.error("Failed to extract pages")
        sys.exit(1)

    logger.info(f"Extracted {len(pages_data)} pages")

    # 保存原始提取结果(用于调试)
    raw_output_path = Path(INTERMEDIATE_DIR) / "pages_with_fonts.json"
    logger.info(f"\nSaving raw extraction to {raw_output_path}")
    with open(raw_output_path, "w", encoding="utf-8") as f:
        json.dump(pages_data, f, ensure_ascii=False, indent=2)

    # 清洗页面
    logger.info("\nCleaning pages using font information...")
    cleaned_pages, chapter_info = clean_pages_with_fonts(pages_data, remove_refs=True)

    # 保存清洗后的页面
    clean_output_path = Path(INTERMEDIATE_DIR) / "pages_clean.json"
    logger.info(f"Saving cleaned pages to {clean_output_path}")
    with open(clean_output_path, "w", encoding="utf-8") as f:
        json.dump(cleaned_pages, f, ensure_ascii=False, indent=2)

    # 保存章节信息
    chapter_info_path = Path(INTERMEDIATE_DIR) / "chapter_info.json"
    logger.info(f"Saving chapter info to {chapter_info_path}")
    with open(chapter_info_path, "w", encoding="utf-8") as f:
        json.dump(chapter_info, f, ensure_ascii=False, indent=2)

    # 统计信息
    logger.info("\n" + "=" * 60)
    logger.info("Extraction and Cleaning Complete")
    logger.info("=" * 60)
    logger.info(f"Total raw pages: {len(pages_data)}")
    logger.info(f"Total cleaned pages: {len(cleaned_pages)}")

    chapters = [c for c in chapter_info if c['type'] == 'CHAPTER']
    sections = [c for c in chapter_info if c['type'] == 'SECTION']
    logger.info(f"Chapters detected: {len(chapters)}")
    logger.info(f"Sections detected: {len(sections)}")

    # 显示章节列表
    if chapters:
        logger.info("\nDetected Chapters:")
        for ch in chapters:
            logger.info(f"  Page {ch['page']:3d}: {ch['text']}")

    # 显示前10个小节
    if sections:
        logger.info(f"\nDetected Sections (showing first 10 of {len(sections)}):")
        for sec in sections[:10]:
            logger.info(f"  Page {sec['page']:3d}: {sec['text']}")

    logger.info(f"\n✓ All output files saved to: {INTERMEDIATE_DIR}")


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        logger.error(f"Script failed: {e}", exc_info=True)
        sys.exit(1)