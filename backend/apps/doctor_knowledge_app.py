import logging
from datetime import datetime
from http import HTTPStatus
from typing import List, Optional

from fastapi import APIRouter, HTTPException, Query, Header
from fastapi.responses import JSONResponse

from database.knowledge_db import get_knowledge_info_by_tenant_id
from database.knowledge_card_db import (
    create_or_update_card, get_card_by_file_path, get_cards_by_knowledge_id,
    get_all_cards_by_tenant, delete_card, increment_view_count
)
from services.file_management_service import list_files_impl, get_file_stream_impl
from utils.auth_utils import get_current_user_id

logger = logging.getLogger(__name__)

# Create API router for doctor portal knowledge base
router = APIRouter(prefix="/doctor/knowledge")


def convert_datetime_to_iso(obj):
    """
    Convert datetime objects in a dictionary or list to ISO format strings
    
    Args:
        obj: Dictionary, list, or any object that may contain datetime objects
        
    Returns:
        Object with datetime objects converted to ISO format strings
    """
    if isinstance(obj, datetime):
        return obj.isoformat()
    elif isinstance(obj, dict):
        return {key: convert_datetime_to_iso(value) for key, value in obj.items()}
    elif isinstance(obj, list):
        return [convert_datetime_to_iso(item) for item in obj]
    else:
        return obj


@router.get("/bases/list")
async def get_knowledge_bases(
    tenant_id: Optional[str] = Query(None, description="Tenant ID"),
    authorization: Optional[str] = Header(None)
):
    """
    Get knowledge base list for doctor portal

    Returns:
        List of knowledge bases with id, name, description
    """
    try:
        # Get tenant_id from auth if not provided
        if not tenant_id:
            _, tenant_id = get_current_user_id(authorization)

        if not tenant_id:
            raise HTTPException(
                status_code=HTTPStatus.UNAUTHORIZED,
                detail="Tenant ID not found"
            )

        # Get all knowledge bases for this tenant
        knowledge_bases = get_knowledge_info_by_tenant_id(tenant_id)

        # Transform to frontend format
        result = []
        for kb in knowledge_bases:
            result.append({
                "id": kb["knowledge_id"],
                "name": kb["index_name"],
                "description": kb.get("knowledge_describe", ""),
                "created_at": kb.get("create_time"),
            })

        # Convert datetime objects to ISO format strings
        result = convert_datetime_to_iso(result)

        return JSONResponse(
            status_code=HTTPStatus.OK,
            content={"knowledge_bases": result}
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get knowledge bases: {str(e)}")
        raise HTTPException(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            detail=f"Failed to get knowledge bases: {str(e)}"
        )


@router.get("/bases/{kb_id}/files")
async def get_knowledge_base_files(
    kb_id: int,
    tenant_id: Optional[str] = Query(None, description="Tenant ID"),
    authorization: Optional[str] = Header(None)
):
    """
    Get file list for a specific knowledge base

    Args:
        kb_id: Knowledge base ID
        tenant_id: Tenant ID (optional, will use from auth if not provided)

    Returns:
        List of files in the knowledge base
    """
    try:
        # Get tenant_id from auth if not provided
        if not tenant_id:
            _, tenant_id = get_current_user_id(authorization)

        # Get knowledge base info to get index_name
        knowledge_bases = get_knowledge_info_by_tenant_id(tenant_id)
        kb = next((k for k in knowledge_bases if k["knowledge_id"] == kb_id), None)

        if not kb:
            raise HTTPException(
                status_code=HTTPStatus.NOT_FOUND,
                detail=f"Knowledge base {kb_id} not found"
            )

        index_name = kb["index_name"]

        # Get files from MinIO with prefix of knowledge_base/{index_name}/
        prefix = f"knowledge_base/{index_name}/"
        files = await list_files_impl(prefix=prefix, limit=1000)

        # Filter only .md files and transform to frontend format
        md_files = []
        for file in files:
            file_name = file.get("name", "")
            if file_name.endswith(".md"):
                # Extract display name (remove prefix and .md extension)
                display_name = file_name.replace(prefix, "").replace(".md", "")
                md_files.append({
                    "id": file_name,  # Full path as ID
                    "name": display_name,
                    "full_path": file_name,
                    "size": file.get("size", 0),
                    "created_at": file.get("last_modified"),
                })

        # Convert datetime objects to ISO format strings
        md_files = convert_datetime_to_iso(md_files)

        return JSONResponse(
            status_code=HTTPStatus.OK,
            content={"files": md_files}
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get knowledge base files: {str(e)}")
        raise HTTPException(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            detail=f"Failed to get knowledge base files: {str(e)}"
        )


@router.get("/files/{file_path:path}/content")
async def get_file_content(
    file_path: str
):
    """
    Get Markdown file content

    Args:
        file_path: Full path to the file in MinIO

    Returns:
        File content as text
    """
    try:
        # Get file stream from MinIO
        file_stream, content_type = await get_file_stream_impl(object_name=file_path)

        # Read content as text
        content = b""
        async for chunk in file_stream:
            content += chunk

        # Decode to string
        text_content = content.decode("utf-8")

        return JSONResponse(
            status_code=HTTPStatus.OK,
            content={
                "content": text_content,
                "content_type": content_type
            }
        )
    except Exception as e:
        logger.error(f"Failed to get file content: {str(e)}")
        raise HTTPException(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            detail=f"Failed to get file content: {str(e)}"
        )


# ==================== Knowledge File Card APIs ====================

@router.post("/card/save")
async def save_file_card(
    card_data: dict,
    authorization: Optional[str] = Header(None)
):
    """
    Create or update a knowledge file card

    Request body:
        {
            "file_path": "knowledge_base/index_name/file.md",
            "knowledge_id": 1,
            "card_title": "Card Title",
            "card_summary": "Card summary text",
            "category": "诊断标准",
            "tags": ["tag1", "tag2"]
        }

    Returns:
        Card ID
    """
    try:
        user_id, tenant_id = get_current_user_id(authorization)

        if not tenant_id:
            raise HTTPException(
                status_code=HTTPStatus.UNAUTHORIZED,
                detail="Tenant ID not found"
            )

        # Convert tags list to JSON string
        import json
        if "tags" in card_data and isinstance(card_data["tags"], list):
            card_data["tags"] = json.dumps(card_data["tags"])

        card_data["tenant_id"] = tenant_id
        card_data["user_id"] = user_id

        card_id = create_or_update_card(card_data)

        return JSONResponse(
            status_code=HTTPStatus.OK,
            content={"card_id": card_id, "message": "Card saved successfully"}
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to save card: {str(e)}")
        raise HTTPException(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            detail=f"Failed to save card: {str(e)}"
        )


@router.get("/card/get")
async def get_file_card(
    file_path: str = Query(..., description="File path in MinIO"),
    authorization: Optional[str] = Header(None)
):
    """
    Get card information for a file

    Returns:
        Card information or null if not found
    """
    try:
        _, tenant_id = get_current_user_id(authorization)

        if not tenant_id:
            raise HTTPException(
                status_code=HTTPStatus.UNAUTHORIZED,
                detail="Tenant ID not found"
            )

        card = get_card_by_file_path(file_path, tenant_id)

        # Parse tags JSON string to list
        if card and card.get("tags"):
            import json
            try:
                card["tags"] = json.loads(card["tags"])
            except:
                card["tags"] = []

        # Convert datetime objects to ISO format strings
        card = convert_datetime_to_iso(card) if card else None

        return JSONResponse(
            status_code=HTTPStatus.OK,
            content={"card": card}
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get card: {str(e)}")
        raise HTTPException(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            detail=f"Failed to get card: {str(e)}"
        )


@router.get("/cards/list")
async def get_all_cards(
    category: Optional[str] = Query(None, description="Filter by category"),
    authorization: Optional[str] = Header(None)
):
    """
    Get all knowledge cards for doctor portal

    Returns:
        List of cards
    """
    try:
        _, tenant_id = get_current_user_id(authorization)

        if not tenant_id:
            raise HTTPException(
                status_code=HTTPStatus.UNAUTHORIZED,
                detail="Tenant ID not found"
            )

        cards = get_all_cards_by_tenant(tenant_id, category)

        # Parse tags for each card and convert datetime objects
        import json
        for card in cards:
            if card.get("tags"):
                try:
                    card["tags"] = json.loads(card["tags"])
                except:
                    card["tags"] = []

        # Convert datetime objects to ISO format strings
        cards = convert_datetime_to_iso(cards)

        return JSONResponse(
            status_code=HTTPStatus.OK,
            content={"cards": cards}
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get cards: {str(e)}")
        raise HTTPException(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            detail=f"Failed to get cards: {str(e)}"
        )


@router.delete("/card/delete")
async def delete_file_card(
    file_path: str = Query(..., description="File path in MinIO"),
    authorization: Optional[str] = Header(None)
):
    """
    Delete a knowledge file card

    Returns:
        Success message
    """
    try:
        user_id, tenant_id = get_current_user_id(authorization)

        if not tenant_id:
            raise HTTPException(
                status_code=HTTPStatus.UNAUTHORIZED,
                detail="Tenant ID not found"
            )

        success = delete_card(file_path, tenant_id, user_id)

        if not success:
            raise HTTPException(
                status_code=HTTPStatus.NOT_FOUND,
                detail="Card not found"
            )

        return JSONResponse(
            status_code=HTTPStatus.OK,
            content={"message": "Card deleted successfully"}
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete card: {str(e)}")
        raise HTTPException(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete card: {str(e)}"
        )
