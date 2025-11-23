# utils/llm_client.py
from typing import Optional
import time
from openai import OpenAI, APIError, RateLimitError, APITimeoutError
from .logging_utils import setup_logger
from config import DEEPSEEK_BASE_URL, MODEL_NAME, API_KEY

logger = setup_logger("llm_client")


class LLMClient:
    def __init__(self, model_name: Optional[str] = None, max_retries: int = 3):
        if not API_KEY:
            raise RuntimeError("DEEPSEEK_API_KEY 未设置")
        self.client = OpenAI(
            api_key=API_KEY,
            base_url=DEEPSEEK_BASE_URL,
            timeout=90.0,  # 90秒超时(双语生成需要更多时间)
        )
        self.model = model_name or MODEL_NAME
        self.max_retries = max_retries
        logger.info(f"LLM client initialized with model={self.model}")

    def chat(self, system: str, user: str, temperature: float = 0.3) -> str:
        """带重试机制的对话接口"""
        for attempt in range(self.max_retries):
            try:
                resp = self.client.chat.completions.create(
                    model=self.model,
                    messages=[
                        {"role": "system", "content": system},
                        {"role": "user", "content": user},
                    ],
                    temperature=temperature,
                    max_tokens=4000,  # 双语输出需要更多tokens
                )
                content = resp.choices[0].message.content
                if content:
                    return content.strip()
                else:
                    raise ValueError("Empty response from API")

            except RateLimitError as e:
                wait_time = (2 ** attempt) * 2  # 指数退避: 2s, 4s, 8s
                logger.warning(f"⚠️ Rate limit hit, waiting {wait_time}s... (attempt {attempt + 1}/{self.max_retries})")
                if attempt < self.max_retries - 1:
                    time.sleep(wait_time)
                else:
                    logger.error("❌ Max retries exceeded due to rate limit")
                    raise

            except APITimeoutError as e:
                wait_time = 5
                logger.warning(f"⚠️ API timeout (attempt {attempt + 1}/{self.max_retries}): {e}")
                if attempt < self.max_retries - 1:
                    logger.info(f"Retrying in {wait_time}s...")
                    time.sleep(wait_time)
                else:
                    logger.error("❌ Max retries exceeded due to timeout")
                    raise

            except APIError as e:
                logger.error(f"⚠️ API error (attempt {attempt + 1}/{self.max_retries}): {e}")
                if attempt < self.max_retries - 1:
                    time.sleep(2)
                else:
                    logger.error("❌ Max retries exceeded due to API error")
                    raise

            except Exception as e:
                logger.error(f"❌ Unexpected error: {type(e).__name__}: {e}")
                raise

        raise RuntimeError("Max retries exceeded")