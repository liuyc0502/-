# utils/llm_client.py
from typing import Optional
from openai import OpenAI
from .logging_utils import setup_logger
from config import DEEPSEEK_BASE_URL, MODEL_NAME, API_KEY

logger = setup_logger("llm_client")

class LLMClient:
    def __init__(self, model_name: Optional[str] = None):
        if not API_KEY:
            raise RuntimeError("DEEPSEEK_API_KEY 未设置")
        self.client = OpenAI(
            api_key=API_KEY,
            base_url=DEEPSEEK_BASE_URL,
        )
        self.model = model_name or MODEL_NAME
        logger.info(f"LLM client initialized with model={self.model}")

    def chat(self, system: str, user: str) -> str:
        resp = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            temperature=0.3,
        )
        return resp.choices[0].message.content.strip()
