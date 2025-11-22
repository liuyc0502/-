# scripts/02_make_chunks.py
import os, json, sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import INTERMEDIATE_DIR
from utils.chunker import split_pages_to_paragraphs, make_chunks
from utils.logging_utils import setup_logger

logger = setup_logger("02_make_chunks")

if __name__ == "__main__":
    in_path = os.path.join(INTERMEDIATE_DIR, "pages_clean.json")
    if not os.path.exists(in_path):
        raise FileNotFoundError(f"Cleaned pages not found: {in_path}")

    pages = json.load(open(in_path, encoding="utf-8"))
    paragraphs = split_pages_to_paragraphs(pages)
    chunks = make_chunks(paragraphs)

    out_path = os.path.join(INTERMEDIATE_DIR, "chunks.jsonl")
    with open(out_path, "w", encoding="utf-8") as f:
        for ch in chunks:
            f.write(json.dumps(ch, ensure_ascii=False) + "\n")

    logger.info(f"Saved {len(chunks)} chunks to {out_path}")
