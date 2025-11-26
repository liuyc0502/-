"""
Medical Image Analysis Tools - MCP Format
Tools for AI-powered analysis of medical images and annotated regions
"""
import logging
import base64
import io
from typing import Dict, Any, Optional
from fastmcp import FastMCP
from PIL import Image
import requests

from consts.const import DEFAULT_TENANT_ID
from database.patient_db import (
    get_annotation_by_id,
    create_image_analysis,
    get_image_analyses,
    get_annotation_analyses
)

logger = logging.getLogger(__name__)
image_analysis_tools = FastMCP("medical_image_analysis")


def crop_image_region(image_url: str, coordinates: Dict[str, Any]) -> Optional[str]:
    """
    Crop image region based on coordinates and return base64 encoded image.

    Args:
        image_url: URL of the original image
        coordinates: Dict with shape and coordinates

    Returns:
        Base64 encoded cropped image or None if failed
    """
    try:
        # Download image
        response = requests.get(image_url, timeout=30)
        response.raise_for_status()
        image = Image.open(io.BytesIO(response.content))

        shape = coordinates.get("shape")

        if shape == "circle":
            x, y, radius = coordinates.get("x"), coordinates.get("y"), coordinates.get("radius")
            left = max(0, x - radius)
            top = max(0, y - radius)
            right = min(image.width, x + radius)
            bottom = min(image.height, y + radius)
            cropped = image.crop((left, top, right, bottom))

        elif shape == "rectangle":
            x, y = coordinates.get("x"), coordinates.get("y")
            width, height = coordinates.get("width"), coordinates.get("height")
            left, top = x, y
            right, bottom = x + width, y + height
            cropped = image.crop((left, top, right, bottom))

        elif shape == "polygon":
            # For polygon, get bounding box
            points = coordinates.get("points", [])
            if not points:
                return None
            xs = [p.get("x") for p in points]
            ys = [p.get("y") for p in points]
            left, top = min(xs), min(ys)
            right, bottom = max(xs), max(ys)
            cropped = image.crop((left, top, right, bottom))

        else:
            return None

        # Convert to base64
        buffer = io.BytesIO()
        cropped.save(buffer, format="PNG")
        buffer.seek(0)
        image_base64 = base64.b64encode(buffer.read()).decode('utf-8')

        return f"data:image/png;base64,{image_base64}"

    except Exception as e:
        logger.error(f"Error cropping image: {str(e)}")
        return None


@image_analysis_tools.tool(
    name="analyze_annotated_region",
    description="Analyze a specific annotated region of a medical image using AI vision model. Use when doctor asks questions about a marked region (e.g., 'Is Region 1 abnormal?', 'Analyze the shadow in Region 2'). Returns AI analysis result."
)
async def analyze_annotated_region_tool(
    annotation_id: int,
    question: str,
    conversation_id: Optional[int] = None
) -> Dict[str, Any]:
    """
    Analyze a specific annotated region using multimodal AI.

    Args:
        annotation_id: The ID of the annotation to analyze
        question: Doctor's question about the region (e.g., "Is this shadow abnormal?")
        conversation_id: Optional conversation ID for context linking

    Returns:
        Dict with AI analysis result
    """
    try:
        # Get annotation details
        annotation = get_annotation_by_id(annotation_id, DEFAULT_TENANT_ID)
        if not annotation:
            return {"error": f"Annotation {annotation_id} not found"}

        region_name = f"Region {annotation['annotation_order']}" if annotation.get("annotation_order") else "Unnamed region"
        annotation_label = annotation.get("annotation_label", "")

        # TODO: Get image_url from patient_medical_image_t via image_id
        # For now, return a placeholder response indicating the analysis would be performed

        analysis_result = f"""Based on the analysis of {region_name} ({annotation_label}):

Question: {question}

[Note: This is a placeholder response. In production, this tool would:
1. Fetch the original image URL from patient_medical_image_t using image_id={annotation.get('image_id')}
2. Crop the region using the coordinates: {annotation.get('coordinates')}
3. Send the cropped image to a multimodal AI model (GPT-4V/Claude 3.5 Sonnet)
4. Return the AI's analysis of the region]

Region Details:
- Type: {annotation.get('annotation_type')}
- Shape: {annotation.get('annotation_shape')}
- Location: {annotation.get('coordinates')}
- Label: {annotation_label}

Recommendation: Please integrate with a vision model API to get actual medical image analysis."""

        # Save analysis to database
        analysis_data = {
            "image_id": annotation.get("image_id"),
            "annotation_id": annotation_id,
            "analysis_type": "region_analysis",
            "analysis_prompt": question,
            "analysis_result": analysis_result,
            "model_name": "placeholder",  # Would be "gpt-4-vision" or "claude-3-5-sonnet"
            "conversation_id": conversation_id
        }

        result = create_image_analysis(
            analysis_data=analysis_data,
            tenant_id=DEFAULT_TENANT_ID,
            user_id="system"
        )

        logger.info(f"Created analysis {result['analysis_id']} for annotation {annotation_id}")

        return {
            "analysis_id": result["analysis_id"],
            "annotation_id": annotation_id,
            "region_name": region_name,
            "question": question,
            "analysis": analysis_result
        }

    except Exception as e:
        logger.error(f"Error analyzing annotation {annotation_id}: {str(e)}")
        return {"error": str(e)}


@image_analysis_tools.tool(
    name="compare_annotated_regions",
    description="Compare multiple annotated regions in a medical image. Use when doctor asks to compare different regions (e.g., 'Compare Region 1 and Region 2', 'What's the difference between the two marked areas?')."
)
async def compare_annotated_regions_tool(
    annotation_ids: str,  # Comma-separated IDs, e.g., "1,2,3"
    comparison_aspect: str = "morphology",  # 'morphology', 'color', 'size', 'texture'
    conversation_id: Optional[int] = None
) -> Dict[str, Any]:
    """
    Compare multiple annotated regions.

    Args:
        annotation_ids: Comma-separated annotation IDs (e.g., "1,2,3")
        comparison_aspect: Aspect to compare (morphology/color/size/texture)
        conversation_id: Optional conversation ID for context

    Returns:
        Dict with comparison analysis
    """
    try:
        # Parse annotation IDs
        ids = [int(id.strip()) for id in annotation_ids.split(",")]

        if len(ids) < 2:
            return {"error": "Need at least 2 annotations to compare"}

        # Get all annotations
        annotations = []
        for ann_id in ids:
            ann = get_annotation_by_id(ann_id, DEFAULT_TENANT_ID)
            if ann:
                annotations.append(ann)

        if len(annotations) < 2:
            return {"error": "Could not find enough valid annotations"}

        # Build comparison summary
        region_names = [f"Region {ann.get('annotation_order', '?')}" for ann in annotations]
        comparison_text = f"""Comparison Analysis of {', '.join(region_names)}:

Comparison Aspect: {comparison_aspect}

"""

        for i, ann in enumerate(annotations, 1):
            comparison_text += f"""
{region_names[i-1]}:
- Type: {ann.get('annotation_type')}
- Shape: {ann.get('annotation_shape')}
- Label: {ann.get('annotation_label', 'No label')}
- Coordinates: {ann.get('coordinates')}
"""

        comparison_text += """
[Note: In production, this would send all region images to a vision model for detailed comparative analysis]

Analysis would include:
- Morphological differences
- Color/texture variations
- Size comparisons
- Clinical significance of differences
"""

        return {
            "annotation_ids": ids,
            "region_names": region_names,
            "comparison_aspect": comparison_aspect,
            "comparison_result": comparison_text
        }

    except Exception as e:
        logger.error(f"Error comparing regions: {str(e)}")
        return {"error": str(e)}


@image_analysis_tools.tool(
    name="get_annotation_analysis_history",
    description="Get previous AI analyses for an annotated region. Use when doctor wants to see historical analysis results for a specific region."
)
async def get_annotation_analysis_history_tool(
    annotation_id: int,
    limit: int = 10
) -> Dict[str, Any]:
    """
    Get analysis history for an annotation.

    Args:
        annotation_id: The annotation ID
        limit: Maximum number of analyses to return

    Returns:
        Dict with list of previous analyses
    """
    try:
        analyses = get_annotation_analyses(annotation_id, DEFAULT_TENANT_ID, limit=limit)

        return {
            "annotation_id": annotation_id,
            "total_analyses": len(analyses),
            "analyses": [
                {
                    "analysis_id": a["analysis_id"],
                    "analysis_type": a["analysis_type"],
                    "question": a["analysis_prompt"],
                    "result": a["analysis_result"],
                    "model": a.get("model_name"),
                    "timestamp": str(a.get("create_time"))
                }
                for a in analyses
            ]
        }

    except Exception as e:
        logger.error(f"Error getting analysis history: {str(e)}")
        return {"error": str(e)}
