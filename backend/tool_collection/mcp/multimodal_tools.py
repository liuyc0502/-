"""
Multimodal Interaction Tools - MCP Format
Tools for voice, image, and multi-modal interactions
"""
import logging
from typing import Optional, List, Dict, Any

from fastmcp import FastMCP

logger = logging.getLogger(__name__)

multimodal_tools = FastMCP("multimodal")


@multimodal_tools.tool(
    name="voice_pathology_qa",
    description="Process voice input for pathology Q&A. Converts speech to text, processes the question, and can return voice response."
)
async def voice_pathology_qa(
    audio_url: str,
    image_url: Optional[str] = None,
    return_voice: bool = True,
    language: str = "zh-CN"
) -> Dict[str, Any]:
    """
    Process voice input for pathology Q&A.

    Args:
        audio_url: URL of the audio input
        image_url: Optional pathology image for context
        return_voice: Whether to return voice response
        language: Language code

    Returns:
        Processed question and answer
    """
    try:
        result = {
            "audio_url": audio_url,
            "image_url": image_url,
            "language": language,
            "return_voice": return_voice,
            "processing_steps": [
                {
                    "step": 1,
                    "action": "speech_to_text",
                    "description": "Convert audio to text using STT model"
                },
                {
                    "step": 2,
                    "action": "process_question",
                    "description": "Analyze the question with optional image context"
                },
                {
                    "step": 3,
                    "action": "generate_response",
                    "description": "Generate pathology-focused response"
                }
            ],
            "status": "ready_for_processing",
            "expected_output": {
                "transcribed_text": "转录的文本",
                "processed_question": "处理后的问题",
                "answer": "答案",
                "audio_response_url": "语音回答URL（如需要）",
                "referenced_image_regions": "参考的图像区域"
            }
        }

        if return_voice:
            result["processing_steps"].append({
                "step": 4,
                "action": "text_to_speech",
                "description": "Convert response to speech using TTS model"
            })

        logger.info("Prepared voice pathology Q&A processing")
        return result

    except Exception as e:
        logger.error(f"Error in voice pathology Q&A: {str(e)}")
        return {"error": str(e)}


@multimodal_tools.tool(
    name="generate_voice_report",
    description="Convert a pathology analysis or report to voice audio. Useful for accessibility or hands-free report review."
)
async def generate_voice_report(
    report_content: Dict,
    voice_style: str = "professional",
    include_sections: Optional[List[str]] = None,
    speed: float = 1.0
) -> Dict[str, Any]:
    """
    Generate voice version of a pathology report.

    Args:
        report_content: Report content to convert
        voice_style: Voice style (professional/friendly/concise)
        include_sections: Specific sections to include
        speed: Speech speed multiplier

    Returns:
        Voice report audio URL
    """
    try:
        # Prepare report text for TTS
        sections_to_read = include_sections or ["diagnosis", "findings", "recommendations"]

        report_text_parts = []

        if "diagnosis" in sections_to_read:
            report_text_parts.append(f"诊断结果：{report_content.get('diagnosis', '未提供')}")

        if "findings" in sections_to_read:
            findings = report_content.get('findings', [])
            if findings:
                report_text_parts.append("主要发现：" + "。".join(findings))

        if "recommendations" in sections_to_read:
            recs = report_content.get('recommendations', [])
            if recs:
                report_text_parts.append("建议：" + "。".join(recs))

        full_text = "。".join(report_text_parts)

        style_prompts = {
            "professional": "使用专业、正式的语调朗读",
            "friendly": "使用友好、易懂的语调朗读",
            "concise": "简洁快速地朗读关键信息"
        }

        result = {
            "report_content": report_content,
            "voice_style": voice_style,
            "include_sections": sections_to_read,
            "speed": speed,
            "text_to_read": full_text,
            "style_instruction": style_prompts.get(voice_style, style_prompts["professional"]),
            "status": "ready_for_tts",
            "expected_output": {
                "audio_url": "生成的音频URL",
                "duration_seconds": "音频时长",
                "text_read": full_text
            }
        }

        logger.info("Prepared voice report generation")
        return result

    except Exception as e:
        logger.error(f"Error generating voice report: {str(e)}")
        return {"error": str(e)}


@multimodal_tools.tool(
    name="multimodal_case_presentation",
    description="Create a comprehensive multi-modal case presentation combining images, text, and optional voice narration."
)
async def multimodal_case_presentation(
    case_id: Optional[int] = None,
    patient_id: Optional[int] = None,
    images: Optional[List[str]] = None,
    include_voice_narration: bool = False,
    presentation_style: str = "teaching"
) -> Dict[str, Any]:
    """
    Create multi-modal case presentation.

    Args:
        case_id: Medical case ID
        patient_id: Patient ID
        images: List of image URLs to include
        include_voice_narration: Whether to add voice narration
        presentation_style: Style (teaching/clinical/summary)

    Returns:
        Multi-modal presentation structure
    """
    try:
        presentation_templates = {
            "teaching": {
                "sections": [
                    {"title": "病例介绍", "content_type": "text"},
                    {"title": "临床表现", "content_type": "text"},
                    {"title": "影像学检查", "content_type": "image_gallery"},
                    {"title": "病理分析", "content_type": "image_with_annotation"},
                    {"title": "诊断思路", "content_type": "text"},
                    {"title": "治疗方案", "content_type": "text"},
                    {"title": "讨论要点", "content_type": "text"}
                ],
                "style": "详细、教学导向，包含鉴别诊断讨论"
            },
            "clinical": {
                "sections": [
                    {"title": "主诉及病史", "content_type": "text"},
                    {"title": "检查结果", "content_type": "mixed"},
                    {"title": "诊断", "content_type": "text"},
                    {"title": "治疗计划", "content_type": "text"}
                ],
                "style": "简洁、临床导向，重点突出"
            },
            "summary": {
                "sections": [
                    {"title": "病例摘要", "content_type": "text"},
                    {"title": "关键图像", "content_type": "image_gallery"},
                    {"title": "结论", "content_type": "text"}
                ],
                "style": "精炼、概括性强"
            }
        }

        template = presentation_templates.get(presentation_style, presentation_templates["teaching"])

        result = {
            "case_id": case_id,
            "patient_id": patient_id,
            "images": images or [],
            "include_voice_narration": include_voice_narration,
            "presentation_style": presentation_style,
            "template": template,
            "status": "ready_for_generation",
            "expected_output": {
                "presentation": {
                    "title": "病例展示标题",
                    "sections": template["sections"],
                    "images_with_annotations": "带标注的图像列表",
                    "voice_narration_urls": "各部分的语音讲解URL" if include_voice_narration else None
                },
                "export_formats": ["html", "pdf", "pptx"]
            }
        }

        logger.info(f"Prepared multimodal case presentation in {presentation_style} style")
        return result

    except Exception as e:
        logger.error(f"Error creating multimodal presentation: {str(e)}")
        return {"error": str(e)}


@multimodal_tools.tool(
    name="real_time_image_analysis",
    description="Provide real-time analysis of microscope or camera feed. Useful for live microscopy sessions."
)
async def real_time_image_analysis(
    stream_url: str,
    analysis_mode: str = "continuous",
    focus_on: Optional[List[str]] = None,
    alert_on_abnormality: bool = True
) -> Dict[str, Any]:
    """
    Set up real-time image analysis.

    Args:
        stream_url: URL of the video/image stream
        analysis_mode: Mode (continuous/on_demand/periodic)
        focus_on: Specific features to focus on
        alert_on_abnormality: Whether to alert on detected abnormalities

    Returns:
        Real-time analysis configuration
    """
    try:
        analysis_config = {
            "stream_url": stream_url,
            "analysis_mode": analysis_mode,
            "focus_on": focus_on or ["cell_abnormalities", "tissue_structure", "mitotic_figures"],
            "alert_on_abnormality": alert_on_abnormality,
            "processing_config": {
                "frame_rate": "1 fps for continuous, on-demand for others",
                "model": "VLM for pathology analysis",
                "alert_threshold": 0.8
            },
            "status": "ready_to_start",
            "expected_output": {
                "analysis_stream": {
                    "current_frame_analysis": "当前帧分析结果",
                    "detected_features": "检测到的特征列表",
                    "abnormality_alerts": "异常警报",
                    "cumulative_findings": "累积发现"
                },
                "controls": {
                    "pause": "暂停分析",
                    "resume": "恢复分析",
                    "capture": "捕获当前帧",
                    "annotate": "添加标注"
                }
            }
        }

        logger.info(f"Prepared real-time analysis for stream: {stream_url[:50]}...")
        return analysis_config

    except Exception as e:
        logger.error(f"Error setting up real-time analysis: {str(e)}")
        return {"error": str(e)}


@multimodal_tools.tool(
    name="image_to_text_description",
    description="Generate detailed text description of a pathology image. Useful for documentation, accessibility, or report generation."
)
async def image_to_text_description(
    image_url: str,
    description_type: str = "clinical",
    detail_level: str = "standard",
    language: str = "zh"
) -> Dict[str, Any]:
    """
    Generate text description of pathology image.

    Args:
        image_url: URL of the image
        description_type: Type (clinical/educational/patient_friendly)
        detail_level: Level of detail (brief/standard/comprehensive)
        language: Output language

    Returns:
        Text description of the image
    """
    try:
        description_prompts = {
            "clinical": "请以临床病理报告的格式描述这张图像，包括所有临床相关的形态学特征。",
            "educational": "请以教学材料的风格描述这张图像，解释每个可见结构及其意义。",
            "patient_friendly": "请用通俗易懂的语言描述这张图像，避免过多专业术语，帮助患者理解。"
        }

        detail_instructions = {
            "brief": "请提供简明扼要的描述，控制在100字以内。",
            "standard": "请提供标准详细程度的描述，涵盖主要特征。",
            "comprehensive": "请提供全面详尽的描述，包括所有可观察到的特征和可能的临床意义。"
        }

        prompt = description_prompts.get(description_type, description_prompts["clinical"])
        prompt += "\n" + detail_instructions.get(detail_level, detail_instructions["standard"])

        result = {
            "image_url": image_url,
            "description_type": description_type,
            "detail_level": detail_level,
            "language": language,
            "description_prompt": prompt,
            "status": "ready_for_description",
            "expected_output": {
                "description": "生成的文字描述",
                "key_findings": ["关键发现1", "关键发现2"],
                "word_count": "字数",
                "terminology_used": ["使用的专业术语"]
            }
        }

        logger.info(f"Prepared image-to-text description ({description_type}, {detail_level})")
        return result

    except Exception as e:
        logger.error(f"Error generating image description: {str(e)}")
        return {"error": str(e)}


@multimodal_tools.tool(
    name="similar_image_search",
    description="Search for visually similar pathology images in the database. Useful for finding comparable cases or reference images."
)
async def similar_image_search(
    query_image_url: str,
    search_scope: str = "all",
    similarity_threshold: float = 0.7,
    limit: int = 10
) -> Dict[str, Any]:
    """
    Search for similar pathology images.

    Args:
        query_image_url: URL of the query image
        search_scope: Scope of search (all/cases/patients/knowledge)
        similarity_threshold: Minimum similarity score (0-1)
        limit: Maximum number of results

    Returns:
        List of similar images with similarity scores
    """
    try:
        result = {
            "query_image_url": query_image_url,
            "search_scope": search_scope,
            "similarity_threshold": similarity_threshold,
            "limit": limit,
            "search_method": "CLIP embedding + vector similarity",
            "status": "ready_for_search",
            "processing_steps": [
                "1. Extract CLIP embedding from query image",
                "2. Search vector database for similar embeddings",
                "3. Filter by similarity threshold",
                "4. Retrieve image metadata and case information"
            ],
            "expected_output": {
                "similar_images": [
                    {
                        "image_url": "相似图像URL",
                        "similarity_score": 0.85,
                        "source_type": "case/patient/knowledge",
                        "source_id": "来源ID",
                        "diagnosis": "相关诊断",
                        "description": "图像描述"
                    }
                ],
                "total_found": 0,
                "search_time_ms": 0
            }
        }

        logger.info(f"Prepared similar image search in scope: {search_scope}")
        return result

    except Exception as e:
        logger.error(f"Error in similar image search: {str(e)}")
        return {"error": str(e)}
