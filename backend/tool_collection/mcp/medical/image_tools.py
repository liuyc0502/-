"""
Medical Image Analysis MCP Tools

Tools for analyzing medical images using vision language models.
"""

import json
import logging
from typing import Optional
from fastmcp import FastMCP

logger = logging.getLogger(__name__)


def register_image_tools(mcp: FastMCP):
    """Register all medical image analysis tools to the MCP service."""

    @mcp.tool(
        name="medical_image_analyzer",
        description="Analyze medical images (X-ray, CT, MRI, pathology) using vision model."
    )
    async def medical_image_analyzer(
        image_url: str,
        image_type: str = "general",
        analysis_focus: Optional[str] = None
    ) -> str:
        """Analyze medical images using VLM."""
        try:
            from nexent.core.models.openai_vlm import OpenAIVLModel
            from utils.config_utils import tenant_config_manager, get_model_name_from_config
            from utils.auth_utils import get_default_tenant_id
            from nexent.core.utils.observer import MessageObserver

            tenant_id = get_default_tenant_id()
            vlm_config = tenant_config_manager.get_model_config(key="VLM_ID", tenant_id=tenant_id)

            if not vlm_config or not vlm_config.get("base_url"):
                return json.dumps({
                    "success": False,
                    "error": "VLM model not configured. Please configure a vision language model first."
                })

            prompts = {
                "general": "请详细分析这张医学图像，描述所有可见的特征和异常。",
                "xray": "分析这张X光片，描述骨骼结构、异常阴影、病变或骨折。",
                "ct": "分析这张CT图像，描述组织结构、异常密度、病变或肿块。",
                "mri": "分析这张MRI图像，描述软组织结构和异常信号。",
                "pathology": "分析这张病理切片，描述细胞形态和组织结构。",
                "wound": "评估这张伤口图像，描述大小、颜色、愈合阶段。",
                "skin": "分析这张皮肤图像，描述皮损特征。"
            }

            system_prompt = prompts.get(image_type, prompts["general"])
            if analysis_focus:
                system_prompt += f"\n请特别关注：{analysis_focus}"

            observer = MessageObserver()
            vlm = OpenAIVLModel(
                observer=observer,
                model_id=get_model_name_from_config(vlm_config),
                api_base=vlm_config.get("base_url"),
                api_key=vlm_config.get("api_key"),
                max_tokens=1024
            )

            result = vlm.analyze_image(image_url, system_prompt, stream=False)

            return json.dumps({
                "success": True,
                "image_type": image_type,
                "analysis": result.content if hasattr(result, 'content') else str(result),
                "note": "此分析由AI生成，需由专业医生验证。"
            }, ensure_ascii=False)
        except Exception as e:
            logger.error(f"medical_image_analyzer failed: {str(e)}")
            return json.dumps({"success": False, "error": str(e)}, ensure_ascii=False)

    @mcp.tool(
        name="image_comparison",
        description="Compare two medical images to identify changes over time."
    )
    async def image_comparison(
        image_url_before: str,
        image_url_after: str,
        comparison_focus: Optional[str] = None
    ) -> str:
        """Compare two medical images."""
        try:
            from nexent.core.models.openai_vlm import OpenAIVLModel
            from utils.config_utils import tenant_config_manager, get_model_name_from_config
            from utils.auth_utils import get_default_tenant_id
            from nexent.core.utils.observer import MessageObserver

            tenant_id = get_default_tenant_id()
            vlm_config = tenant_config_manager.get_model_config(key="VLM_ID", tenant_id=tenant_id)

            if not vlm_config or not vlm_config.get("base_url"):
                return json.dumps({"success": False, "error": "VLM model not configured"})

            system_prompt = "详细分析这张医学图像的关键特征。"
            if comparison_focus:
                system_prompt += f" 特别关注：{comparison_focus}"

            observer = MessageObserver()
            vlm = OpenAIVLModel(
                observer=observer,
                model_id=get_model_name_from_config(vlm_config),
                api_base=vlm_config.get("base_url"),
                api_key=vlm_config.get("api_key"),
                max_tokens=1024
            )

            result_before = vlm.analyze_image(image_url_before, system_prompt + " 这是治疗前的图像。", stream=False)
            result_after = vlm.analyze_image(image_url_after, system_prompt + " 这是治疗后的图像。", stream=False)

            return json.dumps({
                "success": True,
                "before_analysis": result_before.content if hasattr(result_before, 'content') else str(result_before),
                "after_analysis": result_after.content if hasattr(result_after, 'content') else str(result_after),
                "note": "请对比两份分析结果，由专业医生进行综合评估。"
            }, ensure_ascii=False)
        except Exception as e:
            logger.error(f"image_comparison failed: {str(e)}")
            return json.dumps({"success": False, "error": str(e)}, ensure_ascii=False)
