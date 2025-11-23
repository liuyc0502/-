"""
Knowledge Base Tools - MCP Format
5 tools for medical knowledge retrieval
"""
import logging
from typing import Optional, List, Dict, Any

from fastmcp import FastMCP

from database.knowledge_db import (
    get_knowledge_record_by_id,
    list_knowledge_records
)
from database.knowledge_card_db import (
    list_knowledge_cards,
    get_knowledge_card_by_id
)
from database.learning_record_db import (
    get_learning_records_by_user,
    get_recommended_knowledge
)

logger = logging.getLogger(__name__)

knowledge_tools = FastMCP("knowledge_base")


@knowledge_tools.tool(
    name="search_knowledge",
    description="Semantic search in medical knowledge base. Use when doctor asks about diagnostic criteria, treatment guidelines, disease information, or any medical knowledge question."
)
async def search_knowledge(
    tenant_id: str,
    query: str,
    category: Optional[str] = None,
    limit: int = 10
) -> Dict[str, Any]:
    """
    Search medical knowledge base using semantic search.

    Args:
        tenant_id: Tenant ID for data isolation
        query: Natural language search query (e.g., "ºzL„Ê­Æ")
        category: Filter by category (Ê­Æ/oiáo/»—W/ÅåÆ)
        limit: Maximum number of results

    Returns:
        List of relevant knowledge entries
    """
    try:
        # Get knowledge records
        knowledge_records = list_knowledge_records(tenant_id)

        # Get knowledge cards
        cards = list_knowledge_cards(
            tenant_id=tenant_id,
            search_query=query,
            category=category,
            limit=limit
        )

        results = []
        for card in cards:
            results.append({
                "card_id": card.get("card_id"),
                "title": card.get("card_title"),
                "summary": card.get("card_summary"),
                "category": card.get("category"),
                "tags": card.get("tags"),
                "file_path": card.get("file_path"),
                "view_count": card.get("view_count", 0)
            })

        return {
            "query": query,
            "category": category,
            "total_results": len(results),
            "knowledge_entries": results,
            "available_categories": ["Ê­Æ", "oiáo", "»—W", "ÅåÆ", "4ŠÀŒ", "qÏÊ­"]
        }

    except Exception as e:
        logger.error(f"Error searching knowledge: {str(e)}")
        return {"error": str(e)}


@knowledge_tools.tool(
    name="get_knowledge_by_category",
    description="Browse knowledge by category. Use when doctor wants to see all knowledge in a specific category like diagnostic criteria or drug information."
)
async def get_knowledge_by_category(
    tenant_id: str,
    category: str,
    limit: int = 20,
    offset: int = 0
) -> Dict[str, Any]:
    """
    Get knowledge entries by category.

    Args:
        tenant_id: Tenant ID for data isolation
        category: Knowledge category (Ê­Æ/oiáo/»—W/ÅåÆ)
        limit: Maximum number of results
        offset: Pagination offset

    Returns:
        List of knowledge entries in the category
    """
    try:
        cards = list_knowledge_cards(
            tenant_id=tenant_id,
            category=category,
            limit=limit,
            offset=offset
        )

        return {
            "category": category,
            "total_entries": len(cards),
            "entries": [
                {
                    "card_id": card.get("card_id"),
                    "title": card.get("card_title"),
                    "summary": card.get("card_summary"),
                    "tags": card.get("tags"),
                    "view_count": card.get("view_count", 0)
                }
                for card in cards
            ]
        }

    except Exception as e:
        logger.error(f"Error getting knowledge by category: {str(e)}")
        return {"error": str(e)}


@knowledge_tools.tool(
    name="get_learning_recommendations",
    description="Get personalized learning recommendations based on user's learning history. Use when doctor asks for study suggestions or wants to know what to learn next."
)
async def get_learning_recommendations(
    tenant_id: str,
    user_id: str,
    limit: int = 10
) -> Dict[str, Any]:
    """
    Get personalized learning recommendations.

    Args:
        tenant_id: Tenant ID for data isolation
        user_id: User ID for personalization
        limit: Maximum number of recommendations

    Returns:
        List of recommended knowledge entries
    """
    try:
        # Get user's learning history
        learning_records = get_learning_records_by_user(user_id, tenant_id)

        # Get categories user hasn't explored much
        viewed_categories = set()
        for record in learning_records:
            if record.get("category"):
                viewed_categories.add(record.get("category"))

        # Get all available cards
        all_cards = list_knowledge_cards(tenant_id=tenant_id, limit=100)

        # Recommend cards from less-explored categories or popular ones
        recommendations = []
        for card in all_cards:
            card_category = card.get("category")
            is_new_category = card_category not in viewed_categories

            # Check if user has viewed this card
            viewed = any(
                r.get("file_path") == card.get("file_path")
                for r in learning_records
            )

            if not viewed:
                recommendations.append({
                    "card_id": card.get("card_id"),
                    "title": card.get("card_title"),
                    "summary": card.get("card_summary"),
                    "category": card_category,
                    "reason": "New category to explore" if is_new_category else "Popular content",
                    "priority": "high" if is_new_category else "medium"
                })

        # Sort by priority and limit
        recommendations = sorted(
            recommendations,
            key=lambda x: (0 if x["priority"] == "high" else 1)
        )[:limit]

        return {
            "user_id": user_id,
            "learning_progress": {
                "total_viewed": len(learning_records),
                "categories_explored": list(viewed_categories)
            },
            "recommendations": recommendations
        }

    except Exception as e:
        logger.error(f"Error getting learning recommendations: {str(e)}")
        return {"error": str(e)}


@knowledge_tools.tool(
    name="search_diagnosis_guidelines",
    description="Search clinical diagnosis guidelines. Use when doctor asks about disease staging, classification criteria, or diagnostic protocols."
)
async def search_diagnosis_guidelines(
    tenant_id: str,
    disease: str,
    guideline_type: Optional[str] = None
) -> Dict[str, Any]:
    """
    Search clinical diagnosis guidelines.

    Args:
        tenant_id: Tenant ID for data isolation
        disease: Disease name to search guidelines for
        guideline_type: Type of guideline (Æ/Ê­Æ/»—W/{Æ)

    Returns:
        Relevant clinical guidelines
    """
    try:
        # Search for guidelines related to the disease
        search_query = f"{disease} {guideline_type}" if guideline_type else disease

        cards = list_knowledge_cards(
            tenant_id=tenant_id,
            search_query=search_query,
            category="Ê­Æ",
            limit=10
        )

        # Also search in treatment guidelines
        treatment_cards = list_knowledge_cards(
            tenant_id=tenant_id,
            search_query=search_query,
            category="»—W",
            limit=10
        )

        all_results = cards + treatment_cards

        return {
            "disease": disease,
            "guideline_type": guideline_type,
            "total_guidelines": len(all_results),
            "guidelines": [
                {
                    "card_id": card.get("card_id"),
                    "title": card.get("card_title"),
                    "summary": card.get("card_summary"),
                    "category": card.get("category"),
                    "file_path": card.get("file_path")
                }
                for card in all_results
            ]
        }

    except Exception as e:
        logger.error(f"Error searching diagnosis guidelines: {str(e)}")
        return {"error": str(e)}


@knowledge_tools.tool(
    name="get_knowledge_document",
    description="Get full document content from knowledge base. Use when doctor needs to read the complete content of a knowledge entry."
)
async def get_knowledge_document(
    tenant_id: str,
    card_id: int,
    user_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Get full knowledge document content.

    Args:
        tenant_id: Tenant ID for data isolation
        card_id: Knowledge card ID
        user_id: User ID for recording view history

    Returns:
        Complete document content
    """
    try:
        card = get_knowledge_card_by_id(card_id, tenant_id)

        if not card:
            return {"error": "Knowledge card not found", "card_id": card_id}

        # Record view if user_id provided
        if user_id:
            from database.learning_record_db import create_or_update_learning_record
            create_or_update_learning_record(
                user_id=user_id,
                tenant_id=tenant_id,
                file_path=card.get("file_path"),
                file_name=card.get("card_title"),
                category=card.get("category")
            )

        return {
            "card_id": card.get("card_id"),
            "title": card.get("card_title"),
            "summary": card.get("card_summary"),
            "category": card.get("category"),
            "tags": card.get("tags"),
            "file_path": card.get("file_path"),
            "knowledge_id": card.get("knowledge_id"),
            "view_count": card.get("view_count", 0),
            "message": "To view full content, access the file at the provided file_path"
        }

    except Exception as e:
        logger.error(f"Error getting knowledge document: {str(e)}")
        return {"error": str(e)}
