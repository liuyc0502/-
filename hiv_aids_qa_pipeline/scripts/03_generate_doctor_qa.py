import os, sys, json
from typing import List, Dict, Any
import re
import difflib
from tqdm import tqdm

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import INTERMEDIATE_DIR, MIN_QA_PER_CHUNK_DOCTOR, MAX_QA_PER_CHUNK_DOCTOR
from utils.llm_client import LLMClient
from utils.logging_utils import setup_logger

logger = setup_logger("03_doctor_qa_bilingual")

# 双语版 System Prompt
SYSTEM_PROMPT = """You are a bilingual pathology educator with expertise in HIV/AIDS pathology.

Your task is to generate high-quality Q&A pairs in BOTH English and Chinese for:
- Medical doctors / 临床医生
- Pathology residents / 病理科住院医师
- Advanced medical students / 高年级医学生

Requirements:
1. Generate questions and answers in BOTH languages
2. Chinese should use standard medical terminology (人卫版教材标准)
3. English and Chinese versions should convey the same meaning
4. All content must be strictly grounded in the provided textbook excerpt
5. Focus on clinically relevant, board-exam style questions"""

USER_PROMPT_TEMPLATE = """Based on the following pathology textbook excerpt about HIV/AIDS, generate {min_qa} to {max_qa} bilingual Q&A pairs for medical professionals.

📚 FOCUS AREAS (Priority Order):
1. Pathogenesis & Disease Mechanisms / 发病机制与病理过程
   - How HIV causes cellular damage / HIV如何导致细胞损伤
   - Progression from HIV to AIDS / 从HIV感染到AIDS的进展
   - Immune system dysfunction / 免疫系统功能障碍

2. Histopathology & Morphology / 组织病理学与形态学
   - Microscopic tissue changes / 显微镜下组织改变
   - Cellular alterations / 细胞形态学变化
   - Diagnostic pathological features / 诊断性病理特征

3. Clinical-Pathological Correlation / 临床病理关联
   - How pathology explains clinical symptoms / 病理如何解释临床症状
   - Patterns of opportunistic infections / 机会性感染的规律
   - Organ-specific manifestations / 器官特异性表现

4. Virology (when relevant) / 病毒学(相关时)
   - Viral replication mechanisms / 病毒复制机制
   - Cell tropism and receptor binding / 细胞嗜性和受体结合
   - Viral load implications / 病毒载量的意义

⚠️ STRICT REQUIREMENTS / 严格要求:
✓ Every answer MUST be derivable from the excerpt below
  每个答案必须能从下方原文找到依据
✓ Questions should be specific, not vague
  问题要具体明确,不要笼统
✓ Avoid yes/no questions; prefer "describe", "explain", "what", "how"
  避免是非题,多用"描述"、"解释"、"什么"、"如何"
✓ Chinese medical terms should follow standard textbooks (人卫版)
  中文医学术语应遵循标准教材
✓ English and Chinese should be equivalent in meaning
  中英文含义应当对等

📄 TEXTBOOK EXCERPT / 教材原文:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Chapter: {chapter}
Page Range: {page_range}

{text}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


📋 OUTPUT FORMAT (JSON array only, no additional text):
[
  {{
    "question_en": "Describe the mechanism by which HIV causes immunodeficiency...",
    "question_zh": "描述HIV导致免疫缺陷的机制...",
    "answer_en": "HIV causes immunodeficiency by... [2-4 sentences]",
    "answer_zh": "HIV通过以下机制导致免疫缺陷... [2-4句话]",
    "key_terms": {{
      "en": ["CD4+ T cell", "immunodeficiency", "viral replication"],
      "zh": ["CD4+ T细胞", "免疫缺陷", "病毒复制"]
    }},
    "difficulty": "medium",
    "type": "pathogenesis",
    "reasoning_en": "This question tests understanding of...",
    "reasoning_zh": "此题考查对...的理解"
  }}
]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 ALLOWED TYPES / 允许的类型 (EXACT spelling required)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

You MUST use EXACTLY one of these values for "type":
必须使用以下值之一作为"type":


DISEASE-SPECIFIC / 疾病特异性:
✓ "pathogenesis" - disease mechanisms / 发病机制
✓ "virology" - viral biology / 病毒学
✓ "immunology" - immune dysfunction / 免疫学
✓ "epidemiology" - transmission, prevalence / 流行病学

PATHOLOGY CORE / 病理学核心:
✓ "histopathology" - microscopic features / 组织形态学
✓ "general_pathology" - inflammation, necrosis / 一般病理学
✓ "oncology" - tumors, malignancies / 肿瘤病理学
✓ "molecular_pathology" - molecular mechanisms / 分子病理学

CLINICAL APPLICATION / 临床应用:
✓ "clinical_correlation" - symptoms explained / 临床关联
✓ "diagnosis" - diagnostic approach / 诊断方法
✓ "differential_diagnosis" - distinguishing / 鉴别诊断
✓ "laboratory" - lab tests, biomarkers / 实验室检查
✓ "complications" - opportunistic infections / 并发症
✓ "prognosis" - outcome prediction / 预后

✓ "other" - only if none fit / 其他

❌ DO NOT use: "prevention", "treatment", "clinical_features", "transmission"
   These will be REJECTED

Use exact spelling (lowercase, underscores where shown)
使用精确拼写(小写,如图所示使用下划线)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DIFFICULTY LEVELS (choose one):
- "easy" - basic facts, definitions / 基础事实、定义
- "medium" - understanding mechanisms / 理解机制
- "hard" - complex integration, clinical reasoning / 复杂整合、临床推理

Generate the bilingual Q&A pairs now:"""



def validate_bilingual_qa(qa: Dict[str, Any], chunk_text: str) -> tuple[bool, str]:
    """验证双语QA对的质量 - 改进版 (正确版本)"""
    # 必需字段检查
    required_fields = [
        "question_en", "question_zh",
        "answer_en", "answer_zh",
         "key_terms",
        "difficulty", "type"
    ]

    for field in required_fields:
        if field not in qa or not qa[field]:
            return False, f"Missing or empty field: {field}"

    # 问题检查
    q_en = qa["question_en"].strip()
    if len(q_en) < 15:
        return False, "English question too short"

    q_zh = qa["question_zh"].strip()
    if len(q_zh) < 10:
        return False, "Chinese question too short"
    if not any('\u4e00' <= c <= '\u9fff' for c in q_zh):
        return False, "Chinese question contains no Chinese characters"

    # 答案检查
    a_en = qa["answer_en"].strip()
    if len(a_en) < 30:
        return False, "English answer too short"
    if len(a_en) > 800:
        return False, "English answer too long"

    a_zh = qa["answer_zh"].strip()
    if len(a_zh) < 20:
        return False, "Chinese answer too short"
    if len(a_zh) > 800:
        return False, "Chinese answer too long"
    if not any('\u4e00' <= c <= '\u9fff' for c in a_zh):
        return False, "Chinese answer contains no Chinese characters"



    # key_terms检查
    if "key_terms" not in qa or not isinstance(qa["key_terms"], dict):
        return False, "key_terms must be a dict"
    if "en" not in qa["key_terms"] or "zh" not in qa["key_terms"]:
        return False, "key_terms must have 'en' and 'zh' keys"

    en_terms = qa["key_terms"]["en"]
    zh_terms = qa["key_terms"]["zh"]
    if not isinstance(en_terms, list) or not isinstance(zh_terms, list):
        return False, "key_terms['en'] and key_terms['zh'] must be lists"

    if len(en_terms) != len(zh_terms):
        return False, f"Mismatched term count: {len(en_terms)} EN vs {len(zh_terms)} ZH"

    if len(en_terms) < 2:
        return False, "At least 2 key terms required"

    # difficulty检查
    if qa["difficulty"] not in ["easy", "medium", "hard"]:
        return False, f"Invalid difficulty: {qa['difficulty']}"

    # type检查
    valid_types = [
         # 疾病特异性
         "pathogenesis", "virology", "immunology", "epidemiology",
         # 病理学核心
         "histopathology", "general_pathology", "oncology", "molecular_pathology",
         # 临床应用
         "clinical_correlation", "diagnosis", "differential_diagnosis",
         "laboratory", "complications", "prognosis",
         # 兜底
         "other"
    ]
    if qa["type"] not in valid_types:
        return False, f"Invalid type: {qa['type']}"

    return True, "OK"



def robust_json_parse(content: str) -> List[Dict[str, Any]]:
    """健壮的JSON解析"""
    content = content.strip()

    # 移除markdown代码块
    if content.startswith("```"):
        lines = content.split("\n")
        if lines[-1].strip() == "```":
            content = "\n".join(lines[1:-1])
        else:
            content = "\n".join(lines[1:])
        content = content.strip()

        # 移除可能的 ```json 标记
        if content.startswith("json"):
            content = content[4:].strip()

    # 尝试直接解析
    try:
        data = json.loads(content)
        if isinstance(data, list):
            return data
    except Exception:
        pass

    # 尝试提取JSON数组
    start = content.find("[")
    end = content.rfind("]")
    if start != -1 and end != -1 and end > start:
        try:
            data = json.loads(content[start: end + 1])
            if isinstance(data, list):
                return data
        except Exception as e:
            logger.warning(f"Failed to parse extracted JSON: {e}")

    raise ValueError(f"Cannot parse JSON from content (first 500 chars):\n{content[:500]}...")


if __name__ == "__main__":
    client = LLMClient()
    chunks_path = os.path.join(INTERMEDIATE_DIR, "chunks.jsonl")
    if not os.path.exists(chunks_path):
        raise FileNotFoundError(f"Chunks file not found: {chunks_path}")

    with open(chunks_path, 'r', encoding='utf-8') as f:
        total_chunks = sum(1 for line in f if line.strip())

    out_path = os.path.join(INTERMEDIATE_DIR, "qa_doctor_bilingual.jsonl")
    stats = {
        "total_chunks": 0,
        "successful_chunks": 0,
        "failed_chunks": 0,
        "total_qa_generated": 0,
        "total_qa_valid": 0,
        "total_qa_invalid": 0,
        "validation_failures": {},  # 记录失败原因
        "type_counts": {},
    }

    with open(out_path, "w", encoding="utf-8",buffering=1) as fout:
        with open(chunks_path, encoding="utf-8") as f:
            pbar = tqdm(
                f,
                total=total_chunks,
                desc="🏥 Doctor QA",
                unit="chunk",
                ncols=120,
                colour='cyan'
            )

            for line in pbar:
                line = line.strip()
                if not line:
                    continue

                chunk = json.loads(line)
                chunk_id = chunk["chunk_id"]
                chapter = chunk.get("chapter", "UNKNOWN")
                text = chunk["text"]
                page_range = chunk.get("page_range", [])
                stats["total_chunks"] += 1

                logger.info(f"[Bilingual QA] Processing chunk {chunk_id} (Chapter: {chapter})")

                # 格式化page_range
                page_str = f"Pages {page_range[0]}-{page_range[1]}" if page_range else "Unknown"

                user_prompt = USER_PROMPT_TEMPLATE.format(
                    min_qa=MIN_QA_PER_CHUNK_DOCTOR,
                    max_qa=MAX_QA_PER_CHUNK_DOCTOR,
                    chapter=chapter,
                    page_range=page_str,
                    text=text,
                )

                try:
                    # 使用稍高的temperature以获得更自然的双语表达
                    model_output = client.chat(SYSTEM_PROMPT, user_prompt, temperature=0.4)
                    qa_list = robust_json_parse(model_output)

                    logger.info(f"Parsed {len(qa_list)} QA pairs from response")

                    # 验证每个QA对
                    valid_qa_count = 0
                    for idx, qa in enumerate(qa_list, 1):
                        stats["total_qa_generated"] += 1
                        is_valid, reason = validate_bilingual_qa(qa, text)

                        if is_valid:
                            record = {
                                "audience": "doctor",
                                "language": "bilingual",
                                "doc_id": chunk["doc_id"],
                                "chunk_id": chunk_id,
                                "chapter": chapter,
                                "page_range": page_range,

                                # 英文内容
                                "question_en": qa["question_en"].strip(),
                                "answer_en": qa["answer_en"].strip(),
                                "reasoning_en": qa.get("reasoning_en", "").strip(),

                                # 中文内容
                                "question_zh": qa["question_zh"].strip(),
                                "answer_zh": qa["answer_zh"].strip(),
                                "reasoning_zh": qa.get("reasoning_zh", "").strip(),

                                # 共享信息
                                "key_terms": qa["key_terms"],
                                "difficulty": qa["difficulty"],
                                "type": qa["type"],
                            }
                            fout.write(json.dumps(record, ensure_ascii=False) + "\n")
                            fout.flush()
                            valid_qa_count += 1
                            stats["total_qa_valid"] += 1

                            qa_type = qa["type"]
                            if qa_type not in stats["type_counts"]:
                              stats["type_counts"][qa_type] = 0

                            stats["type_counts"][qa_type] += 1

                        else:
                            logger.warning(f"Invalid QA #{idx} in chunk {chunk_id}: {reason}")
                            stats["total_qa_invalid"] += 1

                            # 统计失败原因
                            if reason not in stats["validation_failures"]:
                                stats["validation_failures"][reason] = 0
                            stats["validation_failures"][reason] += 1

                    logger.info(
                        f"✓ Generated {valid_qa_count}/{len(qa_list)} valid bilingual QA pairs for chunk {chunk_id}")
                    stats["successful_chunks"] += 1

                    # 每处理10个chunk显示一次保存提示
                    if stats["successful_chunks"] % 10 == 0:
                        logger.info(f"💾 Progress auto-saved: {stats['total_qa_valid']} valid QA pairs so far")

                    pbar.set_postfix(valid=stats['total_qa_valid'], invalid=stats['total_qa_invalid'])

                except json.JSONDecodeError as e:
                    logger.error(f"JSON parsing failed for chunk {chunk_id}: {e}")
                    stats["failed_chunks"] += 1
                    continue

                except Exception as e:
                    logger.error(f"Bilingual QA generation failed for chunk {chunk_id}: {e}")
                    stats["failed_chunks"] += 1
                    continue

            pbar.close()

    # 打印详细统计信息
    logger.info("\n" + "=" * 70)
    logger.info("Bilingual Doctor QA Generation Complete")
    logger.info("=" * 70)
    logger.info(f"Total chunks processed: {stats['total_chunks']}")
    logger.info(f"  ✓ Successful: {stats['successful_chunks']}")
    logger.info(f"  ✗ Failed: {stats['failed_chunks']}")
    logger.info(f"\nQA Statistics:")
    logger.info(f"  Total generated: {stats['total_qa_generated']}")
    logger.info(f"  ✓ Valid: {stats['total_qa_valid']}")
    logger.info(f"  ✗ Invalid: {stats['total_qa_invalid']}")

    if stats['total_qa_generated'] > 0:
        validation_rate = stats['total_qa_valid'] / stats['total_qa_generated'] * 100
        logger.info(f"  Validation rate: {validation_rate:.1f}%")

    if stats['type_counts']:
        logger.info(f"\nQuestion Type Distribution:")
        for qtype, count in sorted(stats['type_counts'].items(), key=lambda x: x[1], reverse=True):
            percentage = (count / stats['total_qa_valid']) * 100
            logger.info(f"  {qtype}: {count} ({percentage:.1f}%)")

    # 输出失败原因统计
    if stats['validation_failures']:
        logger.info(f"\nValidation Failure Reasons:")
        sorted_failures = sorted(stats['validation_failures'].items(), key=lambda x: x[1], reverse=True)
        for reason, count in sorted_failures[:5]:  # 只显示前5个
            logger.info(f"  - {reason}: {count} times")

    logger.info(f"\n✓ Output saved to: {out_path}")