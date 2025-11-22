# scripts/04_generate_patient_qa.py
import os, sys, json
from typing import List, Dict, Any

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import INTERMEDIATE_DIR, MIN_QA_PER_CHUNK_PATIENT, MAX_QA_PER_CHUNK_PATIENT
from utils.llm_client import LLMClient
from utils.logging_utils import setup_logger

logger = setup_logger("04_patient_qa")

SYSTEM_PROMPT = (
    "You are a compassionate infectious disease doctor. "
    "You explain HIV/AIDS-related pathology to PATIENTS in clear, simple language. "
    "You never give treatment decisions, only explanations and general education."
)

USER_PROMPT_TEMPLATE = """
You are given an excerpt from a pathology textbook about HIV/AIDS.

Generate between {min_qa} and {max_qa} Q&A pairs for PATIENTS (general public).
These Q&A will be used in a patient-facing chatbot.

Focus on:
- common patient questions about HIV/AIDS and its complications
- simple explanations of what is happening in the body
- why certain infections or complications happen in AIDS
- basic meaning of key medical terms in the text

Requirements:
1. Questions and answers must be based on the given text, but you must rephrase in SIMPLE language.
2. Avoid medical jargon when possible, or briefly explain it.
3. Answers should be empathetic and reassuring. Do NOT give specific treatment instructions or dosages.
4. For each Q&A, output:
   - question: in natural, patient-style language
   - answer: clear, concise, friendly explanation
   - source_note: short note citing which part of the text you used (1-2 sentences)

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
    "source_note": "Based on the discussion of opportunistic infections in this chapter."
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

    out_path = os.path.join(INTERMEDIATE_DIR, "qa_patient_raw.jsonl")
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

            logger.info(f"[Patient QA] Generating for chunk {chunk_id}")

            user_prompt = USER_PROMPT_TEMPLATE.format(
                min_qa=MIN_QA_PER_CHUNK_PATIENT,
                max_qa=MAX_QA_PER_CHUNK_PATIENT,
                chapter=chapter,
                text=text,
            )

            try:
                model_output = client.chat(SYSTEM_PROMPT, user_prompt)
                qa_list = robust_json_parse(model_output)

                for qa in qa_list:
                    record = {
                        "audience": "patient",
                        "doc_id": chunk["doc_id"],
                        "chunk_id": chunk_id,
                        "chapter": chapter,
                        "page_range": chunk.get("page_range", []),
                        "question": qa.get("question", "").strip(),
                        "answer": qa.get("answer", "").strip(),
                        "source_note": qa.get("source_note", "").strip(),
                    }
                    fout.write(json.dumps(record, ensure_ascii=False) + "\n")

            except Exception as e:
                logger.error(f"Patient QA failed for chunk {chunk_id}: {e}")
                continue

    fout.close()
    logger.info(f"Saved patient QA to {out_path}")
