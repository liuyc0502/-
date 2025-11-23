
import os, sys, json, re, difflib
from typing import List, Dict, Any
from tqdm import tqdm

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import INTERMEDIATE_DIR, MIN_QA_PER_CHUNK_PATIENT, MAX_QA_PER_CHUNK_PATIENT
from utils.llm_client import LLMClient
from utils.logging_utils import setup_logger

logger = setup_logger("04_patient_qa_bilingual")

# 双语患者版 System Prompt
SYSTEM_PROMPT = """You are a compassionate bilingual infectious disease physician who excels at explaining complex medical concepts to patients in both English and Chinese.

Your communication style:
- Warm and reassuring, never alarming / 温暖且让人安心,绝不恐吓
- Clear and simple, avoiding jargon / 清晰简单,避免术语
- Empathetic and respectful / 有同理心且尊重
- Factual and evidence-based / 基于事实和证据
- Never provide specific treatment recommendations or dosages / 从不提供具体治疗建议或剂量

Your role is to educate and inform in BOTH languages, not to diagnose or prescribe.
你的角色是用双语教育和告知,而非诊断或开处方。"""

USER_PROMPT_TEMPLATE = """Based on the following medical textbook excerpt about HIV/AIDS, create {min_qa} to {max_qa} bilingual Q&A pairs for PATIENTS (general public).

These will be used in a patient education chatbot that serves both English and Chinese speakers.

🎯 TARGET AUDIENCE / 目标受众:
- Patients diagnosed with HIV/AIDS / HIV/AIDS患者
- Family members seeking to understand / 寻求了解的家属
- General public learning about HIV/AIDS / 学习HIV/AIDS知识的普通民众
- Education level: high school graduate / 教育水平:高中毕业

❓ QUESTION STYLES TO EMULATE / 问题风格示例:

English:
- "Why do people with AIDS get so many infections?"
- "What happens to my immune system when I have HIV?"
- "Can you explain what CD4 cells are in simple terms?"

Chinese:
- "为什么艾滋病患者容易感染各种疾病?"
- "HIV感染后我的免疫系统会发生什么变化?"
- "能不能用简单的话解释一下CD4细胞是什么?"

📝 ANSWER GUIDELINES / 答案指南:
✓ Use everyday language (explain medical terms when needed)
  使用日常语言(必要时解释医学术语)
✓ Keep answers brief (3-5 sentences in each language)
  保持答案简短(每种语言3-5句话)
✓ Be encouraging and normalize the condition when appropriate
  适当时给予鼓励并将疾病正常化
✓ Focus on understanding "what" and "why", not treatment details
  聚焦理解"是什么"和"为什么",而非治疗细节
✓ Avoid percentages, statistics, or technical measurements
  避免百分比、统计数据或技术测量
✓ Never provide specific medication recommendations
  绝不提供具体药物建议
  
  
All explanations MUST come only from the provided textbook excerpt.
Do NOT include any information that is not explicitly stated in the excerpt.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TEXTBOOK EXCERPT / 教材原文:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Chapter: {chapter}
Page Range: {page_range}

{text}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


📋 OUTPUT FORMAT (JSON array only):
[
  {{
    "question_en": "Why do people with HIV get sick more easily?",
    "question_zh": "为什么HIV感染者更容易生病?",
    "answer_en": "HIV weakens your immune system by... [3-5 sentences in simple English]",
    "answer_zh": "HIV通过...削弱您的免疫系统 [3-5句简单中文]",
    "key_terms_explained": {{
      "en": [
        "immune system: your body's defense against infections",
        "CD4 cells: special white blood cells that coordinate immune response"
      ],
      "zh": [
        "免疫系统:您身体抵抗感染的防御系统",
        "CD4细胞:协调免疫反应的特殊白细胞"
      ]
    }},
    "type": "pathogenesis"
  }}
]

ALLOWED TYPES (same as doctor QA):
- "pathogenesis" - disease mechanisms / 发病机制
- "virology" - viral biology / 病毒学
- "immunology" - immune dysfunction / 免疫学
- "epidemiology" - transmission, prevalence / 流行病学
- "histopathology" - microscopic features / 组织形态学
- "general_pathology" - general pathology / 一般病理学
- "oncology" - tumors, malignancies / 肿瘤病理学
- "molecular_pathology" - molecular mechanisms / 分子病理学
- "clinical_correlation" - symptoms explained / 临床关联
- "diagnosis" - diagnostic approach / 诊断方法
- "differential_diagnosis" - distinguishing / 鉴别诊断
- "laboratory" - lab tests, biomarkers / 实验室检查
- "complications" - opportunistic infections / 并发症
- "prognosis" - outcome prediction / 预后
- "other" - use only if none of the above fits / 其他

⚠️ IMPORTANT REMINDERS / 重要提醒:
- Translate medical jargon into everyday language IN BOTH languages
  将医学术语翻译成两种语言的日常用语
- Don't assume the reader knows medical terminology
  不要假设读者了解医学术语
- Maintain a supportive, non-judgmental tone in both languages
  在两种语言中保持支持性、非评判的语气
- Chinese should be natural and idiomatic, not word-for-word translation
  中文应自然地道,而非逐字翻译

Generate the bilingual Q&A pairs now:"""


def validate_patient_bilingual_qa(qa: Dict[str, Any], chunk_text: str) -> tuple[bool, str]:
    """验证双语患者QA对的质量（anchor 版，不直接校验引用）"""
    required_fields = [
        "question_en", "question_zh",
        "answer_en", "answer_zh",
        "type",
    ]

    # 检查必需字段
    for field in required_fields:
        if field not in qa or not qa.get(field):
            return False, f"Missing field: {field}"

    q_en = qa["question_en"].strip()
    q_zh = qa["question_zh"].strip()
    a_en = qa["answer_en"].strip()
    a_zh = qa["answer_zh"].strip()

    # 检查英文问题
    if len(q_en) < 10:
        return False, "English question too short"

    # 检查中文问题
    if len(q_zh) < 5:
        return False, "Chinese question too short"
    if not any('\u4e00' <= c <= '\u9fff' for c in q_zh):
        return False, "Chinese question has no Chinese characters"

    # 患者问题不应太技术化
    technical_terms = [
        "histopathology", "morphology", "pathogenesis",
        "immunohistochemistry", "histologic", "组织病理", "形态学"
    ]
    if any(term in q_en.lower() for term in technical_terms[:5]):
        return False, "English question too technical for patients"
    if any(term in q_zh for term in technical_terms[5:]):
        return False, "Chinese question too technical for patients"

    # 检查英文答案长度
    if len(a_en) < 30:
        return False, "English answer too short"
    if len(a_en) > 1000:
        return False, "English answer too long"

    # 检查中文答案长度
    if len(a_zh) < 20:
        return False, "Chinese answer too short"
    if len(a_zh) > 1000:
        return False, "Chinese answer too long"
    if not any('\u4e00' <= c <= '\u9fff' for c in a_zh):
        return False, "Chinese answer has no Chinese characters"

    # 检查是否包含禁止内容（不要给治疗/诊断指令）
    forbidden_phrases_en = [
        "take medication", "prescribed", "dosage", "mg/kg",
        "you should consult", "you must", "diagnosis"
    ]
    forbidden_phrases_zh = [
        "服用药物", "处方", "剂量", "您应该", "您必须", "诊断"
    ]

    for phrase in forbidden_phrases_en:
        if phrase in a_en.lower():
            return False, f"English answer contains forbidden phrase: '{phrase}'"

    for phrase in forbidden_phrases_zh:
        if phrase in a_zh:
            return False, f"Chinese answer contains forbidden phrase: '{phrase}'"


    # type 校验（与 03 保持一致的枚举）
    valid_types = [
        "pathogenesis", "virology", "immunology", "epidemiology",
        "histopathology", "general_pathology", "oncology", "molecular_pathology",
        "clinical_correlation", "diagnosis", "differential_diagnosis",
        "laboratory", "complications", "prognosis",
        "other",
    ]
    if qa["type"] not in valid_types:
        return False, f"Invalid type: {qa['type']}"

    return True, "OK"




def assess_readability(text_en: str, text_zh: str) -> Dict[str, Any]:
    """评估双语内容的可读性"""
    # 英文可读性
    words_en = text_en.split()
    sentences_en = max(1, text_en.count('.') + text_en.count('!') + text_en.count('?'))
    avg_words_en = len(words_en) / sentences_en

    # 中文可读性(简单估算)
    sentences_zh = max(1, text_zh.count('。') + text_zh.count('!') + text_zh.count('?'))
    chars_zh = len([c for c in text_zh if '\u4e00' <= c <= '\u9fff'])
    avg_chars_zh = chars_zh / sentences_zh

    return {
        "en_avg_words_per_sentence": round(avg_words_en, 1),
        "zh_avg_chars_per_sentence": round(avg_chars_zh, 1),
        "en_readability": "good" if avg_words_en < 20 else "needs_improvement",
        "zh_readability": "good" if 10 <= avg_chars_zh <= 30 else "needs_improvement"
    }


def robust_json_parse(content: str) -> List[Dict[str, Any]]:
    """健壮的JSON解析"""
    content = content.strip()

    if content.startswith("```"):
        lines = content.split("\n")
        content = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])
        content = content.strip()
        if content.startswith("json"):
            content = content[4:].strip()

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
            data = json.loads(content[start: end + 1])
            if isinstance(data, list):
                return data
        except Exception:
            pass

    raise ValueError(f"Cannot parse JSON (first 500 chars):\n{content[:500]}...")


if __name__ == "__main__":
    client = LLMClient()
    chunks_path = os.path.join(INTERMEDIATE_DIR, "chunks.jsonl")
    if not os.path.exists(chunks_path):
        raise FileNotFoundError(f"Chunks file not found: {chunks_path}")

    with open(chunks_path, 'r', encoding="utf-8") as f:
        total_chunks = sum(1 for line in f if line.strip())

    out_path = os.path.join(INTERMEDIATE_DIR, "qa_patient_bilingual.jsonl")
    stats = {
        "total_chunks": 0,
        "successful_chunks": 0,
        "failed_chunks": 0,
        "total_qa_generated": 0,
        "total_qa_valid": 0,
        "total_qa_invalid": 0,
        "readability_issues_en": 0,
        "readability_issues_zh": 0,
        "validation_failures": {},
    }

    with open(out_path, "w", encoding="utf-8", buffering=1) as fout:
        with open(chunks_path, encoding="utf-8") as f:
            pbar = tqdm(
                f,
                total=total_chunks,
                desc="🏥 Patient QA",
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

                logger.info(f"[Bilingual Patient QA] Processing chunk {chunk_id}")

                page_str = f"Pages {page_range[0]}-{page_range[1]}" if page_range else "Unknown"

                user_prompt = USER_PROMPT_TEMPLATE.format(
                    min_qa=MIN_QA_PER_CHUNK_PATIENT,
                    max_qa=MAX_QA_PER_CHUNK_PATIENT,
                    chapter=chapter,
                    page_range=page_str,
                    text=text,
                )

                try:
                    model_output = client.chat(SYSTEM_PROMPT, user_prompt, temperature=0.5)
                    qa_list = robust_json_parse(model_output)

                    valid_qa_count = 0
                    for idx, qa in enumerate(qa_list, 1):
                        stats["total_qa_generated"] += 1
                        is_valid, reason = validate_patient_bilingual_qa(qa, text)

                        if is_valid:




                            readability = assess_readability(qa["answer_en"], qa["answer_zh"])
                            if readability["en_readability"] == "needs_improvement":
                                stats["readability_issues_en"] += 1
                            if readability["zh_readability"] == "needs_improvement":
                                stats["readability_issues_zh"] += 1

                            record = {
                                "audience": "patient",
                                "language": "bilingual",
                                "doc_id": chunk["doc_id"],
                                "chunk_id": chunk_id,
                                "chapter": chapter,
                                "page_range": page_range,

                                # 英文内容
                                "question_en": qa["question_en"].strip(),
                                "answer_en": qa["answer_en"].strip(),

                                # 中文内容
                                "question_zh": qa["question_zh"].strip(),
                                "answer_zh": qa["answer_zh"].strip(),


                                # 术语与类型
                                "key_terms_explained": qa.get("key_terms_explained", {}),
                                "type": qa["type"],

                                # 可读性
                                "readability_metrics": readability,
                            }
                            fout.write(json.dumps(record, ensure_ascii=False) + "\n")
                            fout.flush()
                            valid_qa_count += 1
                            stats["total_qa_valid"] += 1
                        else:
                            logger.warning(f"Invalid QA #{idx} in chunk {chunk_id}: {reason}")
                            stats["total_qa_invalid"] += 1
                            stats["validation_failures"][reason] = stats["validation_failures"].get(reason, 0) + 1

                    logger.info(f"✓ Generated {valid_qa_count}/{len(qa_list)} valid bilingual patient QA pairs")
                    stats["successful_chunks"] += 1

                    pbar.set_postfix(valid=stats['total_qa_valid'], invalid=stats['total_qa_invalid'])

                    if stats["successful_chunks"] % 10 == 0:
                        logger.info(f"💾 Progress auto-saved: {stats['total_qa_valid']} valid QA pairs so far")

                except Exception as e:
                    logger.error(f"Bilingual patient QA failed for chunk {chunk_id}: {e}")
                    stats["failed_chunks"] += 1
                    continue

            pbar.close()

    logger.info("\n" + "=" * 70)
    logger.info("Bilingual Patient QA Generation Complete")
    logger.info("=" * 70)
    logger.info(f"Total chunks: {stats['total_chunks']}")
    logger.info(f"  ✓ Successful: {stats['successful_chunks']}")
    logger.info(f"  ✗ Failed: {stats['failed_chunks']}")
    logger.info(f"\nQA Statistics:")
    logger.info(f"  Total: {stats['total_qa_generated']}")
    logger.info(f"  ✓ Valid: {stats['total_qa_valid']}")
    logger.info(f"  ✗ Invalid: {stats['total_qa_invalid']}")
    logger.info(f"  EN readability issues: {stats['readability_issues_en']}")
    logger.info(f"  ZH readability issues: {stats['readability_issues_zh']}")

    if stats['validation_failures']:
        logger.info(f"\nTop Validation Failures:")
        sorted_failures = sorted(stats['validation_failures'].items(), key=lambda x: x[1], reverse=True)
        for reason, count in sorted_failures[:5]:
            logger.info(f"  - {reason}: {count}")

    logger.info(f"\n✓ Output: {out_path}")
