# config.py
import os
import os.path as osp

# === 路径配置 ===
BASE_DIR = osp.dirname(osp.abspath(__file__))

DATA_DIR = osp.join(BASE_DIR, "data")
RAW_PDF_DIR = osp.join(DATA_DIR, "raw_pdf")
INTERMEDIATE_DIR = osp.join(DATA_DIR, "intermediate")
OUTPUT_DIR = osp.join(DATA_DIR, "output")

os.makedirs(RAW_PDF_DIR, exist_ok=True)
os.makedirs(INTERMEDIATE_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)

# PDF 文件名 & 文档 ID
PDF_FILENAME = "AIDS2025.pdf"
DOC_ID = "AIDS2025"

# === chunk 配置 ===
MIN_TOKENS_PER_CHUNK = 120
MAX_TOKENS_PER_CHUNK = 600

# === LLM 配置（只用 DeepSeek） ===
DEEPSEEK_BASE_URL = "https://api.deepseek.com"
MODEL_NAME = "deepseek-chat"              # 就用你现在写的
API_KEY = os.getenv("DEEPSEEK_API_KEY")       # 环境变量里放 key

if not API_KEY:
    raise RuntimeError("请先在环境变量中设置 DEEPSEEK_API_KEY")

# === QA 生成配置 ===
MAX_QA_PER_CHUNK_DOCTOR = 5
MIN_QA_PER_CHUNK_DOCTOR = 3

MAX_QA_PER_CHUNK_PATIENT = 4
MIN_QA_PER_CHUNK_PATIENT = 2
MIN_ANSWER_LENGTH_DOCTOR = 50
MIN_ANSWER_LENGTH_PATIENT = 30

# 最大答案长度(字符数)
MAX_ANSWER_LENGTH_DOCTOR = 800
MAX_ANSWER_LENGTH_PATIENT = 600
# === 日志级别 ===
LOG_LEVEL = "INFO"
