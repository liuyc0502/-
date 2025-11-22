# scripts/03_generate_doctor_qa.py
import os, sys, json
from typing import List, Dict, Any

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import INTERMEDIATE_DIR, MIN_QA_PER_CHUNK_DOCTOR, MAX_QA_PER_CHUNK_DOCTOR
from utils.llm_client import LLMClient
from utils.logging_utils import setup_logger

logger = setup_logger("03_doctor_qa")

SYSTEM_PROMPT = (
    "You are a pathology educator specializing in HIV/AIDS. "
    "You generate high-quality professional Q&A pairs for doctors and pathology trainees. "
    "All questions and answers must be strictly grounded in the given textbook excerpt."
)

USER_PROMPT_TEMPLATE = """
You are given an excerpt from a pathology textbook about HIV/AIDS.

Generate between {min_qa} and {max_qa} high-quality short-answer questions for DOCTORS / PATHOLOGY TRAINEES.

Focus on:
- mechanisms and pathogenesis (how HIV causes damage)
- histologic / morphologic features (microscopic changes)
- key pathological findings in AIDS and opportunistic infections
- virology / replication cycle when relevant
- immune deficiency mechanisms and their consequences

Requirements:
1. Every question MUST be answerable using ONLY the given text. Do NOT use outside knowledge.
2. Questions should be precise and clinically meaningful.
3. For each question, provide:
   - question
   - answer
   - supporting_quote: a direct quote from the text that supports the answer
   - difficulty: "easy" | "medium" | "hard"
   - type: one of ["mechanism", "histology", "pathology", "virology", "immunology", "other"]

Excerpt:
--------------------
Chapter: {chapter}
Text:
{text}
--------------------

Output ONLY a JSON array, like:
[
  {{
    "question": "...",
    "answer": "...",
    "supporting_quote": "...",
    "difficulty": "medium",
    "type": "histology"
  }},
  ...
]
"""

def robust_json_parse(content: str) -> List[Dict[str, Any]]:
    content = content.strip()
    try:
        data = json.loads(content)
        if isinstance(data, list):
            return data
    except Exception:
        pass

    start = content.find("[")
    end = content.rfind("]")
    if start != -1 and end != -1 and end > start:
        try:
            data = json.loads(content[start : end + 1])
            if isinstance(data, list):
                return data
        except Exception:
            pass

    raise ValueError(f"Cannot parse JSON from content:\n{content[:400]}...")

if __name__ == "__main__":
    client = LLMClient()
    chunks_path = os.path.join(INTERMEDIATE_DIR, "chunks.jsonl")
    if not os.path.exists(chunks_path):
        raise FileNotFoundError(f"Chunks file not found: {chunks_path}")

    out_path = os.path.join(INTERMEDIATE_DIR, "qa_doctor_raw.jsonl")
    fout = open(out_path, "w", encoding="utf-8")

    with open(chunks_path, encoding="utf-8") as f:
        for line_num, line in enumerate(f, start=1):
            line = line.strip()
            if not line:
                continue
            chunk = json.loads(line)
            chunk_id = chunk["chunk_id"]
            chapter = chunk.get("chapter", "UNKNOWN")
            text = chunk["text"]

            logger.info(f"[Doctor QA] Generating for chunk {chunk_id}")

            user_prompt = USER_PROMPT_TEMPLATE.format(
                min_qa=MIN_QA_PER_CHUNK_DOCTOR,
                max_qa=MAX_QA_PER_CHUNK_DOCTOR,
                chapter=chapter,
                text=text,
            )

            try:
                model_output = client.chat(SYSTEM_PROMPT, user_prompt)
                qa_list = robust_json_parse(model_output)

                for qa in qa_list:
                    record = {
                        "audience": "doctor",
                        "doc_id": chunk["doc_id"],
                        "chunk_id": chunk_id,
                        "chapter": chapter,
                        "page_range": chunk.get("page_range", []),
                        "question": qa.get("question", "").strip(),
                        "answer": qa.get("answer", "").strip(),
                        "supporting_quote": qa.get("supporting_quote", "").strip(),
                        "difficulty": qa.get("difficulty", "medium"),
                        "type": qa.get("type", "other"),
                    }
                    fout.write(json.dumps(record, ensure_ascii=False) + "\n")

            except Exception as e:
                logger.error(f"Doctor QA failed for chunk {chunk_id}: {e}")
                continue

    fout.close()
    logger.info(f"Saved doctor QA to {out_path}")
