# utils/chunker.py
import re
from typing import List, Dict, Any
from .logging_utils import setup_logger
from config import DOC_ID, MIN_TOKENS_PER_CHUNK, MAX_TOKENS_PER_CHUNK

logger = setup_logger("chunker")

try:
    import tiktoken
    enc = tiktoken.get_encoding("cl100k_base")
    def count_tokens(text: str) -> int:
        return len(enc.encode(text))
except Exception:
    def count_tokens(text: str) -> int:
        # 简单估算：按单词数
        return max(1, len(text.split()))

CHAPTER_RE = re.compile(r"^(CHAPTER\s+\d+.*)$", re.I)

def split_pages_to_paragraphs(pages: List[str]) -> List[Dict[str, Any]]:
    """
    将 pages 切成带章节信息的 paragraph 列表
    每个元素：
    {
      "chapter": str,
      "paragraph": str,
      "page_index": int
    }
    """
    current_chapter = "UNKNOWN"
    paragraphs: List[Dict[str, Any]] = []

    for idx, page in enumerate(pages):
        lines = page.split("\n")

        # 尝试在前几行识别 CHAPTER 标题
        for line in lines[:5]:
            m = CHAPTER_RE.match(line.strip())
            if m:
                current_chapter = m.group(1).strip()
                logger.info(f"Detected chapter at page {idx}: {current_chapter}")
                break

        # 按空行分段
        buf: List[str] = []
        for line in lines:
            if line.strip():
                buf.append(line.strip())
            else:
                if buf:
                    para = " ".join(buf).strip()
                    if para:
                        paragraphs.append({
                            "chapter": current_chapter,
                            "paragraph": para,
                            "page_index": idx
                        })
                    buf = []
        if buf:
            para = " ".join(buf).strip()
            if para:
                paragraphs.append({
                    "chapter": current_chapter,
                    "paragraph": para,
                    "page_index": idx
                })

    logger.info(f"Split into {len(paragraphs)} paragraphs")
    return paragraphs

def make_chunks(paragraphs: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """将 paragraphs 合并成 chunk，控制 token 数在区间内"""
    chunks: List[Dict[str, Any]] = []
    cur_text: List[str] = []
    cur_chapter = None
    cur_pages: List[int] = []

    def flush():
        nonlocal cur_text, cur_chapter, cur_pages
        if not cur_text:
            return
        text = "\n\n".join(cur_text).strip()
        if not text:
            return
        chunk_id = f"{DOC_ID}_chunk_{len(chunks)+1}"
        chunk = {
            "doc_id": DOC_ID,
            "chunk_id": chunk_id,
            "chapter": cur_chapter or "UNKNOWN",
            "page_range": [min(cur_pages), max(cur_pages)] if cur_pages else [],
            "text": text,
            "token_count": count_tokens(text),
            "keywords": []  # 可以后面再补
        }
        chunks.append(chunk)
        cur_text = []
        cur_pages = []

    for para in paragraphs:
        chap = para["chapter"]
        p_text = para["paragraph"]
        p_page = para["page_index"]

        if cur_chapter is None:
            cur_chapter = chap

        if chap != cur_chapter:
            # 章节变了，先 flush 再开始新章节
            flush()
            cur_chapter = chap

        test_text = ("\n\n".join(cur_text + [p_text])).strip()
        tks = count_tokens(test_text)

        if tks > MAX_TOKENS_PER_CHUNK:
            # 当前 chunk 已经够大了，先 flush，这段作为新起点
            flush()
            cur_chapter = chap
            cur_text = [p_text]
            cur_pages = [p_page]
        else:
            cur_text.append(p_text)
            cur_pages.append(p_page)

    flush()
    logger.info(f"Made {len(chunks)} chunks")
    return chunks
