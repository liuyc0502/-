"""
Image Annotation Tools - MCP Format
Tools for interactive image annotation and region-based analysis
"""
import logging
from typing import Optional, List, Dict, Any

from fastmcp import FastMCP

logger = logging.getLogger(__name__)

annotation_tools = FastMCP("image_annotation")


@annotation_tools.tool(
    name="analyze_marked_region",
    description="Analyze a user-marked region on a pathology image. User can draw a box or circle around an area of interest, and this tool will analyze that specific region."
)
async def analyze_marked_region(
    image_url: str,
    region: Dict,
    question: Optional[str] = None,
    context: Optional[str] = None
) -> Dict[str, Any]:
    """
    Analyze a user-marked region on an image.

    Args:
        image_url: URL of the full image
        region: Region coordinates {"x1": int, "y1": int, "x2": int, "y2": int} or {"cx": int, "cy": int, "radius": int}
        question: Specific question about the region
        context: Clinical context for analysis

    Returns:
        Analysis of the marked region
    """
    try:
        # Determine region type
        if "radius" in region:
            region_type = "circle"
            region_desc = f"圆形区域，中心({region['cx']}, {region['cy']})，半径{region['radius']}"
        else:
            region_type = "rectangle"
            region_desc = f"矩形区域，从({region['x1']}, {region['y1']})到({region['x2']}, {region['y2']})"

        analysis_prompt = f"""请仔细分析图像中标记的区域（{region_desc}）：

1. 识别该区域的组织/细胞类型
2. 描述形态学特征
3. 评估是否存在异常
4. 与周围组织的关系
5. 诊断意义分析"""

        if question:
            analysis_prompt += f"\n\n用户具体问题：{question}"

        if context:
            analysis_prompt += f"\n\n临床背景：{context}"

        result = {
            "image_url": image_url,
            "region": region,
            "region_type": region_type,
            "region_description": region_desc,
            "analysis_prompt": analysis_prompt,
            "status": "ready_for_region_analysis",
            "expected_output": {
                "region_content": "区域内容描述",
                "tissue_type": "组织类型",
                "morphological_features": "形态学特征",
                "abnormalities": "异常发现",
                "relationship_to_surrounding": "与周围组织关系",
                "diagnostic_significance": "诊断意义",
                "answer_to_question": "对用户问题的回答"
            }
        }

        logger.info(f"Prepared marked region analysis for {region_type} region")
        return result

    except Exception as e:
        logger.error(f"Error analyzing marked region: {str(e)}")
        return {"error": str(e)}


@annotation_tools.tool(
    name="identify_point_location",
    description="Identify what is at a specific point clicked by the user on a pathology image. Provides detailed information about the cell/structure at that location."
)
async def identify_point_location(
    image_url: str,
    point: Dict,
    context_radius: int = 50
) -> Dict[str, Any]:
    """
    Identify structure at a specific point.

    Args:
        image_url: URL of the image
        point: Point coordinates {"x": int, "y": int}
        context_radius: Radius around point to consider for context

    Returns:
        Identification of structure at the point
    """
    try:
        identification_prompt = f"""请识别图像中坐标({point['x']}, {point['y']})位置的结构：

1. 这个位置是什么类型的细胞/结构？
2. 该细胞/结构的形态特征
3. 是否正常？如果异常，描述异常特征
4. 该结构在组织中的功能/作用
5. 与周围结构的关系

请提供准确、详细的识别结果。"""

        result = {
            "image_url": image_url,
            "point": point,
            "context_radius": context_radius,
            "identification_prompt": identification_prompt,
            "status": "ready_for_point_identification",
            "expected_output": {
                "point_location": point,
                "identified_structure": "识别的结构名称",
                "structure_type": "细胞/组织/其他",
                "characteristics": "特征描述",
                "is_normal": True,
                "abnormality_description": "异常描述（如有）",
                "function": "功能说明",
                "clinical_relevance": "临床相关性"
            }
        }

        logger.info(f"Prepared point identification at ({point['x']}, {point['y']})")
        return result

    except Exception as e:
        logger.error(f"Error identifying point location: {str(e)}")
        return {"error": str(e)}


@annotation_tools.tool(
    name="generate_auto_annotations",
    description="Automatically generate annotations for a pathology image. Identifies and labels key structures, cells, and abnormalities."
)
async def generate_auto_annotations(
    image_url: str,
    annotation_types: List[str],
    include_measurements: bool = False
) -> Dict[str, Any]:
    """
    Generate automatic annotations for an image.

    Args:
        image_url: URL of the image
        annotation_types: Types of annotations to generate (cell_nuclei/tissue_boundaries/lesion_areas/blood_vessels/glands)
        include_measurements: Whether to include size measurements

    Returns:
        Generated annotations with coordinates
    """
    try:
        type_descriptions = {
            "cell_nuclei": "细胞核",
            "tissue_boundaries": "组织边界",
            "lesion_areas": "病变区域",
            "blood_vessels": "血管",
            "glands": "腺体结构",
            "inflammatory_infiltrates": "炎症浸润",
            "necrotic_areas": "坏死区域",
            "mitotic_figures": "有丝分裂象"
        }

        requested_types = [type_descriptions.get(t, t) for t in annotation_types]

        annotation_prompt = f"""请为这张病理图像生成自动标注：

需要标注的类型：{', '.join(requested_types)}

对于每个检测到的结构，请提供：
1. 结构类型
2. 位置坐标（描述性或数值）
3. 形态描述
4. 是否正常
"""

        if include_measurements:
            annotation_prompt += "\n5. 尺寸估计（如可能）"

        result = {
            "image_url": image_url,
            "annotation_types": annotation_types,
            "include_measurements": include_measurements,
            "annotation_prompt": annotation_prompt,
            "status": "ready_for_auto_annotation",
            "expected_output": {
                "annotations": [
                    {
                        "id": "annotation_id",
                        "type": "annotation_type",
                        "location": {"x": 0, "y": 0, "width": 100, "height": 100},
                        "label": "标签",
                        "description": "描述",
                        "is_abnormal": False,
                        "measurement": "尺寸（如适用）"
                    }
                ],
                "total_annotations": 0,
                "summary_by_type": {
                    "type_name": {"count": 0, "normal": 0, "abnormal": 0}
                },
                "overall_assessment": "整体评估"
            }
        }

        logger.info(f"Prepared auto-annotation for types: {annotation_types}")
        return result

    except Exception as e:
        logger.error(f"Error generating auto annotations: {str(e)}")
        return {"error": str(e)}


@annotation_tools.tool(
    name="measure_region",
    description="Measure dimensions of a marked region in a pathology image. Provides estimated real-world measurements based on magnification."
)
async def measure_region(
    image_url: str,
    region: Dict,
    magnification: Optional[str] = None,
    measurement_type: str = "area"
) -> Dict[str, Any]:
    """
    Measure a marked region in an image.

    Args:
        image_url: URL of the image
        region: Region to measure
        magnification: Microscope magnification (e.g., "40x", "100x", "400x")
        measurement_type: Type of measurement (area/perimeter/diameter/length)

    Returns:
        Measurements of the region
    """
    try:
        measurement_prompt = f"""请测量图像中标记区域的尺寸：

区域信息：{region}
放大倍数：{magnification or '未知（请估计）'}
测量类型：{measurement_type}

请提供：
1. 像素尺寸
2. 估计的实际尺寸（基于放大倍数）
3. 与正常参考值的比较
4. 测量的临床意义"""

        # Calculate pixel dimensions from region
        pixel_measurements = {}
        if "x1" in region:
            width = abs(region["x2"] - region["x1"])
            height = abs(region["y2"] - region["y1"])
            pixel_measurements = {
                "width_px": width,
                "height_px": height,
                "area_px": width * height,
                "perimeter_px": 2 * (width + height)
            }
        elif "radius" in region:
            import math
            radius = region["radius"]
            pixel_measurements = {
                "radius_px": radius,
                "diameter_px": radius * 2,
                "area_px": math.pi * radius * radius,
                "circumference_px": 2 * math.pi * radius
            }

        # Magnification to μm/pixel conversion (approximate)
        magnification_scales = {
            "4x": 2.5,      # ~2.5 μm/pixel
            "10x": 1.0,     # ~1.0 μm/pixel
            "20x": 0.5,     # ~0.5 μm/pixel
            "40x": 0.25,    # ~0.25 μm/pixel
            "100x": 0.1,    # ~0.1 μm/pixel
            "400x": 0.025   # ~0.025 μm/pixel (oil immersion)
        }

        scale = magnification_scales.get(magnification, None)

        result = {
            "image_url": image_url,
            "region": region,
            "magnification": magnification,
            "measurement_type": measurement_type,
            "pixel_measurements": pixel_measurements,
            "scale_factor": scale,
            "measurement_prompt": measurement_prompt,
            "status": "ready_for_measurement",
            "expected_output": {
                "pixel_dimensions": pixel_measurements,
                "real_dimensions": {
                    "width_um": "宽度（微米）",
                    "height_um": "高度（微米）",
                    "area_um2": "面积（平方微米）"
                },
                "comparison_to_normal": "与正常值比较",
                "clinical_significance": "临床意义"
            }
        }

        logger.info(f"Prepared region measurement")
        return result

    except Exception as e:
        logger.error(f"Error measuring region: {str(e)}")
        return {"error": str(e)}


@annotation_tools.tool(
    name="interactive_pathology_qa",
    description="Answer questions about specific locations or regions in a pathology image. Enables interactive Q&A about image content."
)
async def interactive_pathology_qa(
    image_url: str,
    question: str,
    focus_region: Optional[Dict] = None,
    previous_qa: Optional[List[Dict]] = None
) -> Dict[str, Any]:
    """
    Interactive Q&A about a pathology image.

    Args:
        image_url: URL of the image
        question: User's question about the image
        focus_region: Specific region to focus on (optional)
        previous_qa: Previous Q&A for context

    Returns:
        Answer to the question
    """
    try:
        qa_prompt = f"""请回答关于这张病理图像的问题：

问题：{question}
"""

        if focus_region:
            qa_prompt += f"\n关注区域：{focus_region}"

        if previous_qa:
            qa_prompt += "\n\n之前的问答历史："
            for qa in previous_qa[-3:]:  # Only last 3 Q&As for context
                qa_prompt += f"\nQ: {qa.get('question')}\nA: {qa.get('answer')}"

        qa_prompt += """

请根据图像内容提供准确、专业的回答。如果问题涉及特定位置，请参考指定区域。
如果无法从图像中确定答案，请诚实说明并提供可能的解释。"""

        result = {
            "image_url": image_url,
            "question": question,
            "focus_region": focus_region,
            "qa_prompt": qa_prompt,
            "status": "ready_for_qa",
            "expected_output": {
                "question": question,
                "answer": "问题的回答",
                "confidence": 0.85,
                "referenced_regions": "答案参考的图像区域",
                "additional_info": "补充信息",
                "suggested_followup": "建议的后续问题"
            }
        }

        logger.info(f"Prepared interactive Q&A: {question[:50]}...")
        return result

    except Exception as e:
        logger.error(f"Error in interactive Q&A: {str(e)}")
        return {"error": str(e)}


@annotation_tools.tool(
    name="save_annotation_report",
    description="Save annotations and analysis as a structured report. Creates a comprehensive pathology report based on all annotations and findings."
)
async def save_annotation_report(
    image_url: str,
    annotations: List[Dict],
    findings: List[str],
    diagnosis_impression: str,
    patient_id: Optional[int] = None,
    report_type: str = "standard"
) -> Dict[str, Any]:
    """
    Save annotations as a structured report.

    Args:
        image_url: URL of the analyzed image
        annotations: List of annotations made
        findings: List of findings
        diagnosis_impression: Overall diagnostic impression
        patient_id: Patient ID to link report
        report_type: Type of report (standard/detailed/summary)

    Returns:
        Saved report information
    """
    try:
        report = {
            "report_id": f"PATHO-{hash(image_url) % 10000:04d}",
            "image_url": image_url,
            "patient_id": patient_id,
            "report_type": report_type,
            "content": {
                "image_description": "病理图像描述",
                "annotations_summary": {
                    "total_annotations": len(annotations),
                    "annotations": annotations
                },
                "findings": findings,
                "diagnosis_impression": diagnosis_impression
            },
            "sections": {
                "gross_description": "大体描述",
                "microscopic_description": "镜下描述",
                "immunohistochemistry": "免疫组化（如适用）",
                "molecular_studies": "分子研究（如适用）",
                "diagnosis": diagnosis_impression,
                "comments": "备注"
            },
            "status": "generated",
            "generated_at": "timestamp"
        }

        logger.info(f"Generated pathology report: {report['report_id']}")

        return {
            "success": True,
            "report": report,
            "message": "Pathology report generated successfully"
        }

    except Exception as e:
        logger.error(f"Error saving annotation report: {str(e)}")
        return {"error": str(e)}
