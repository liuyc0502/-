"""
Image Annotation Tools - MCP Format
Tools for managing annotations on medical images
"""
import logging
from typing import Dict, Any, List
from fastmcp import FastMCP
from consts.const import DEFAULT_TENANT_ID
from database.patient_db import (
    create_image_annotation,
    get_image_annotations,
    get_annotation_by_id,
    update_annotation,
    delete_annotation,
    get_next_annotation_order
)

logger = logging.getLogger(__name__)
annotation_tools = FastMCP("image_annotation")


@annotation_tools.tool(
    name="create_image_annotation",
    description="Create a new annotation on a medical image. Use when doctor draws a region of interest (circle, rectangle, or polygon) on an image and wants to label it. Returns the new annotation ID."
)
async def create_image_annotation_tool(
    image_id: int,
    annotation_type: str,  # 'lesion', 'control', 'shadow', 'hemorrhage', 'artifact', 'other'
    annotation_shape: str,  # 'circle', 'rectangle', 'polygon'
    coordinates: Dict[str, Any],  # Shape-specific coordinates
    annotation_label: str = "",  # User's description/notes
    annotation_color: str = "#FF0000"  # Color for visualization
) -> Dict[str, Any]:
    """
    Create a new annotation on a medical image.

    Args:
        image_id: The ID of the image to annotate
        annotation_type: Type of annotation (lesion/control/shadow/hemorrhage/artifact/other)
        annotation_shape: Shape type (circle/rectangle/polygon)
        coordinates: Shape coordinates as dict:
            - circle: {"shape": "circle", "x": 100, "y": 200, "radius": 50}
            - rectangle: {"shape": "rectangle", "x": 100, "y": 200, "width": 150, "height": 100}
            - polygon: {"shape": "polygon", "points": [{"x": 10, "y": 20}, {"x": 30, "y": 40}, ...]}
        annotation_label: User-provided description (e.g., "Shadow region", "Lesion area")
        annotation_color: Hex color code for visualization (default: #FF0000)

    Returns:
        Dict with annotation_id, annotation_order (Region N number)
    """
    try:
        # Get next order number
        next_order = get_next_annotation_order(image_id, DEFAULT_TENANT_ID)

        annotation_data = {
            "image_id": image_id,
            "annotation_type": annotation_type,
            "annotation_shape": annotation_shape,
            "coordinates": coordinates,
            "annotation_label": annotation_label,
            "annotation_color": annotation_color,
            "annotation_order": next_order
        }

        result = create_image_annotation(
            annotation_data=annotation_data,
            tenant_id=DEFAULT_TENANT_ID,
            user_id="system"  # Will be replaced with actual user in API layer
        )

        logger.info(f"Created annotation {result['annotation_id']} (Region {next_order}) for image {image_id}")
        return {
            "annotation_id": result["annotation_id"],
            "annotation_order": next_order,
            "message": f"Successfully created annotation (Region {next_order})"
        }

    except Exception as e:
        logger.error(f"Error creating annotation: {str(e)}")
        return {"error": str(e)}


@annotation_tools.tool(
    name="get_image_annotations",
    description="Get all annotations for a medical image. Use when doctor wants to view all labeled regions on an image or needs to reference existing annotations."
)
async def get_image_annotations_tool(
    image_id: int
) -> Dict[str, Any]:
    """
    Get all annotations for a medical image.

    Args:
        image_id: The ID of the image

    Returns:
        Dict with list of annotations, each containing annotation_id, type, shape, coordinates, label, order
    """
    try:
        annotations = get_image_annotations(image_id, DEFAULT_TENANT_ID)

        return {
            "image_id": image_id,
            "total_annotations": len(annotations),
            "annotations": [
                {
                    "annotation_id": ann["annotation_id"],
                    "annotation_type": ann["annotation_type"],
                    "annotation_shape": ann["annotation_shape"],
                    "coordinates": ann["coordinates"],
                    "annotation_label": ann["annotation_label"],
                    "annotation_color": ann["annotation_color"],
                    "annotation_order": ann["annotation_order"],
                    "region_name": f"Region {ann['annotation_order']}" if ann["annotation_order"] else "Unnamed"
                }
                for ann in annotations
            ]
        }

    except Exception as e:
        logger.error(f"Error getting annotations for image {image_id}: {str(e)}")
        return {"error": str(e)}


@annotation_tools.tool(
    name="update_annotation_label",
    description="Update the label/description of an existing annotation. Use when doctor wants to edit the notes or description of a marked region."
)
async def update_annotation_label_tool(
    annotation_id: int,
    new_label: str
) -> Dict[str, Any]:
    """
    Update the label/description of an annotation.

    Args:
        annotation_id: The ID of the annotation to update
        new_label: New description text

    Returns:
        Dict with success status
    """
    try:
        success = update_annotation(
            annotation_id=annotation_id,
            update_data={"annotation_label": new_label},
            tenant_id=DEFAULT_TENANT_ID,
            user_id="system"
        )

        if success:
            return {
                "annotation_id": annotation_id,
                "message": "Successfully updated annotation label"
            }
        else:
            return {
                "annotation_id": annotation_id,
                "error": "Annotation not found or update failed"
            }

    except Exception as e:
        logger.error(f"Error updating annotation {annotation_id}: {str(e)}")
        return {"error": str(e)}


@annotation_tools.tool(
    name="delete_annotation",
    description="Delete an annotation from a medical image. Use when doctor wants to remove a marked region."
)
async def delete_annotation_tool(
    annotation_id: int
) -> Dict[str, Any]:
    """
    Delete an annotation.

    Args:
        annotation_id: The ID of the annotation to delete

    Returns:
        Dict with success status
    """
    try:
        # Get annotation info before deletion
        annotation = get_annotation_by_id(annotation_id, DEFAULT_TENANT_ID)
        if not annotation:
            return {
                "error": "Annotation not found",
                "annotation_id": annotation_id
            }

        success = delete_annotation(
            annotation_id=annotation_id,
            tenant_id=DEFAULT_TENANT_ID,
            user_id="system"
        )

        if success:
            return {
                "annotation_id": annotation_id,
                "annotation_order": annotation.get("annotation_order"),
                "message": f"Successfully deleted annotation (Region {annotation.get('annotation_order')})"
            }
        else:
            return {
                "error": "Failed to delete annotation",
                "annotation_id": annotation_id
            }

    except Exception as e:
        logger.error(f"Error deleting annotation {annotation_id}: {str(e)}")
        return {"error": str(e)}


@annotation_tools.tool(
    name="get_annotation_details",
    description="Get detailed information about a specific annotation. Use when doctor asks about a specific region (e.g., 'What is Region 1?', 'Tell me about the marked area')."
)
async def get_annotation_details_tool(
    annotation_id: int
) -> Dict[str, Any]:
    """
    Get detailed information about a specific annotation.

    Args:
        annotation_id: The ID of the annotation

    Returns:
        Dict with full annotation details
    """
    try:
        annotation = get_annotation_by_id(annotation_id, DEFAULT_TENANT_ID)

        if not annotation:
            return {
                "error": "Annotation not found",
                "annotation_id": annotation_id
            }

        return {
            "annotation_id": annotation["annotation_id"],
            "image_id": annotation["image_id"],
            "annotation_type": annotation["annotation_type"],
            "annotation_shape": annotation["annotation_shape"],
            "coordinates": annotation["coordinates"],
            "annotation_label": annotation["annotation_label"],
            "annotation_color": annotation["annotation_color"],
            "annotation_order": annotation["annotation_order"],
            "region_name": f"Region {annotation['annotation_order']}" if annotation["annotation_order"] else "Unnamed",
            "created_at": str(annotation.get("create_time"))
        }

    except Exception as e:
        logger.error(f"Error getting annotation details {annotation_id}: {str(e)}")
        return {"error": str(e)}
