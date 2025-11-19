"""
Knowledge Base Tools for Medical AI Agent
MCP-based tools for searching and retrieving medical knowledge
"""

from fastmcp import FastMCP
from typing import Optional, List, Dict, Any
import logging

# Import services
from services.elasticsearch_service import (
    search_knowledge_base,
    get_knowledge_file_content
)
from database.knowledge_db import (
    get_knowledge_info_by_tenant_id,
    get_knowledge_record
)
from database.knowledge_card_db import (
    get_cards_by_category,
    search_knowledge_cards,
    get_card_by_id
)
from services.learning_record_service import (
    get_user_records_service,
    get_stats_service
)

logger = logging.getLogger(__name__)

# Create MCP server for knowledge base tools
knowledge_tools = FastMCP("knowledge_base")


@knowledge_tools.tool(
    name="search_knowledge",
    description="Search knowledge base using semantic search. Supports searching for diagnosis guidelines, drug information, surgical procedures, pathology standards. Use this when doctor asks medical knowledge questions."
)
async def search_knowledge_tool(
    query: str,
    tenant_id: str,
    knowledge_base: Optional[str] = None,
    limit: int = 10
) -> Dict[str, Any]:
    """
    Search knowledge base with semantic search

    Args:
        query: Search query
        tenant_id: Tenant ID for data isolation
        knowledge_base: Specify knowledge base name (optional)
        limit: Maximum number of results

    Returns:
        Knowledge entries with titles, summaries, sources, relevance scores, document links
    """
    try:
        # Get knowledge bases for tenant
        knowledge_bases = get_knowledge_info_by_tenant_id(tenant_id)

        if knowledge_base:
            # Filter to specific knowledge base
            knowledge_bases = [kb for kb in knowledge_bases if kb.get('index_name') == knowledge_base]

        if not knowledge_bases:
            return {"error": "No knowledge base found", "query": query}

        # Search across knowledge bases
        all_results = []
        for kb in knowledge_bases:
            index_name = kb.get('index_name')

            # Perform semantic search using Elasticsearch
            search_results = await search_knowledge_base(
                index_name=index_name,
                query=query,
                limit=limit
            )

            for result in search_results:
                all_results.append({
                    "knowledge_base": kb.get('knowledge_describe', index_name),
                    "title": result.get('title', ''),
                    "summary": result.get('summary', '')[:300],  # First 300 chars
                    "source": result.get('source', ''),
                    "relevance_score": round(result.get('score', 0.0), 2),
                    "file_path": result.get('file_path', ''),
                    "category": result.get('category', ''),
                    "tags": result.get('tags', []),
                })

        # Sort by relevance score
        all_results.sort(key=lambda x: x['relevance_score'], reverse=True)

        # Limit total results
        all_results = all_results[:limit]

        logger.info(f"Found {len(all_results)} knowledge entries for query: {query}")
        return {
            "query": query,
            "total_results": len(all_results),
            "knowledge_entries": all_results
        }

    except Exception as e:
        logger.error(f"Error searching knowledge base: {str(e)}")
        return {"error": str(e)}


@knowledge_tools.tool(
    name="get_knowledge_by_category",
    description="Browse knowledge base by category (diagnosis guidelines, drug information, surgical procedures, pathology classification, prognosis assessment). Use this when doctor wants to explore knowledge in specific categories."
)
async def get_knowledge_by_category_tool(
    category: str,
    tenant_id: str,
    subcategory: Optional[str] = None,
    limit: int = 20
) -> Dict[str, Any]:
    """
    Get knowledge entries by category

    Args:
        category: Category name (诊断标准/药物信息/手术指南/病理分型/预后评估)
        tenant_id: Tenant ID for data isolation
        subcategory: Subcategory (optional)
        limit: Maximum number of entries

    Returns:
        Knowledge card list with titles, summaries, tags, view counts
    """
    try:
        # Get knowledge cards by category
        cards = get_cards_by_category(
            tenant_id=tenant_id,
            category=category,
            limit=limit
        )

        # Filter by subcategory if specified
        if subcategory:
            cards = [c for c in cards if subcategory in c.get('tags', [])]

        formatted_cards = []
        for card in cards:
            formatted_cards.append({
                "card_id": card.get('card_id'),
                "title": card.get('card_title'),
                "summary": card.get('card_summary'),
                "category": card.get('category'),
                "tags": card.get('tags', []),
                "view_count": card.get('view_count', 0),
                "file_path": card.get('file_path'),
                "knowledge_id": card.get('knowledge_id'),
            })

        logger.info(f"Found {len(formatted_cards)} knowledge cards for category: {category}")
        return {
            "category": category,
            "subcategory": subcategory,
            "total_entries": len(formatted_cards),
            "knowledge_cards": formatted_cards
        }

    except Exception as e:
        logger.error(f"Error getting knowledge by category: {str(e)}")
        return {"error": str(e)}


@knowledge_tools.tool(
    name="get_learning_recommendations",
    description="Get personalized knowledge recommendations based on user's learning history and focus areas. Use this when doctor asks for learning recommendations or wants to improve specific knowledge areas."
)
async def get_learning_recommendations_tool(
    user_id: str,
    tenant_id: str,
    focus_areas: Optional[List[str]] = None,
    limit: int = 5
) -> Dict[str, Any]:
    """
    Get personalized learning recommendations

    Args:
        user_id: User ID (doctor)
        tenant_id: Tenant ID for data isolation
        focus_areas: Focus areas (optional, e.g., ["肺癌诊断", "化疗方案"])
        limit: Maximum number of recommendations

    Returns:
        Recommended knowledge list with titles, reasons, difficulty levels, estimated learning time
    """
    try:
        # Get user's learning history
        learning_records = await get_user_records_service(user_id, tenant_id, limit=50)

        # Get learning stats
        stats = await get_stats_service(user_id, tenant_id)

        # Analyze learning patterns
        viewed_categories = {}
        for record in learning_records:
            category = record.get('category', 'general')
            viewed_categories[category] = viewed_categories.get(category, 0) + 1

        # Get weak areas (categories with less time spent)
        weak_areas = []
        if focus_areas:
            weak_areas = focus_areas
        else:
            # Find categories with fewer views
            all_categories = ["诊断标准", "药物信息", "手术指南", "病理分型", "预后评估"]
            weak_areas = [cat for cat in all_categories if viewed_categories.get(cat, 0) < 5]

        # Get recommendations from weak areas
        recommendations = []
        for category in weak_areas[:limit]:
            cards = get_cards_by_category(
                tenant_id=tenant_id,
                category=category,
                limit=3
            )

            # Filter out already viewed
            viewed_paths = [r.get('file_path') for r in learning_records]
            new_cards = [c for c in cards if c.get('file_path') not in viewed_paths]

            if new_cards:
                card = new_cards[0]
                recommendations.append({
                    "card_id": card.get('card_id'),
                    "title": card.get('card_title'),
                    "category": category,
                    "recommendation_reason": f"Strengthen knowledge in {category} area",
                    "difficulty_level": "intermediate",
                    "estimated_time_minutes": 15,
                    "file_path": card.get('file_path'),
                })

        logger.info(f"Generated {len(recommendations)} learning recommendations for user: {user_id}")
        return {
            "user_id": user_id,
            "total_learning_time_minutes": stats.get('total_time_spent_seconds', 0) // 60,
            "total_items_viewed": stats.get('total_items', 0),
            "recommendations": recommendations
        }

    except Exception as e:
        logger.error(f"Error getting learning recommendations: {str(e)}")
        return {"error": str(e)}


@knowledge_tools.tool(
    name="search_diagnosis_guidelines",
    description="Search for diagnosis guidelines and clinical pathways for specific diseases. Use this when doctor needs diagnosis criteria, staging standards, or treatment guidelines."
)
async def search_diagnosis_guidelines_tool(
    disease_name: str,
    tenant_id: str,
    guideline_type: Optional[str] = None
) -> Dict[str, Any]:
    """
    Search diagnosis guidelines and clinical pathways

    Args:
        disease_name: Disease name (e.g., 肺癌, 胃癌, 肝癌)
        tenant_id: Tenant ID for data isolation
        guideline_type: Guideline type (diagnosis/treatment/staging/screening)

    Returns:
        Guideline documents with names, versions, publishing organizations, key points, full document links
    """
    try:
        # Build search query
        query = f"{disease_name}"
        if guideline_type:
            query += f" {guideline_type}"
        query += " 指南 标准 诊断"

        # Search in knowledge base
        knowledge_results = await search_knowledge_tool(
            query=query,
            tenant_id=tenant_id,
            knowledge_base=None,  # Search all knowledge bases
            limit=10
        )

        if "error" in knowledge_results:
            return knowledge_results

        # Filter for guidelines
        guidelines = []
        for entry in knowledge_results.get('knowledge_entries', []):
            title = entry.get('title', '')
            if any(keyword in title for keyword in ['指南', '标准', '共识', '规范', 'guideline', 'consensus']):
                guidelines.append({
                    "guideline_name": title,
                    "disease": disease_name,
                    "guideline_type": guideline_type or "comprehensive",
                    "version": entry.get('tags', [])[0] if entry.get('tags') else "Latest",
                    "publishing_organization": entry.get('source', 'Medical Association'),
                    "key_points": entry.get('summary', '')[:500],
                    "full_document_link": entry.get('file_path', ''),
                    "relevance_score": entry.get('relevance_score', 0),
                })

        logger.info(f"Found {len(guidelines)} guidelines for disease: {disease_name}")
        return {
            "disease_name": disease_name,
            "guideline_type": guideline_type,
            "total_guidelines": len(guidelines),
            "guidelines": guidelines
        }

    except Exception as e:
        logger.error(f"Error searching diagnosis guidelines: {str(e)}")
        return {"error": str(e)}


@knowledge_tools.tool(
    name="get_knowledge_document",
    description="Get full content of a specific knowledge document. Use this when doctor wants to read the complete content of a knowledge article or guideline."
)
async def get_knowledge_document_tool(
    card_id: Optional[int] = None,
    file_path: Optional[str] = None,
    tenant_id: str = None
) -> Dict[str, Any]:
    """
    Get full knowledge document content

    Args:
        card_id: Knowledge card ID (optional)
        file_path: File path in storage (optional)
        tenant_id: Tenant ID for data isolation

    Returns:
        Full document content with metadata
    """
    try:
        if not card_id and not file_path:
            return {"error": "Must provide either card_id or file_path"}

        # Get card info
        if card_id:
            card = get_card_by_id(card_id, tenant_id)
            if not card:
                return {"error": "Knowledge card not found"}
            file_path = card.get('file_path')

        # Get document content from storage/Elasticsearch
        content = await get_knowledge_file_content(file_path, tenant_id)

        result = {
            "file_path": file_path,
            "content": content.get('text', ''),
            "metadata": {
                "title": content.get('title', ''),
                "category": content.get('category', ''),
                "tags": content.get('tags', []),
                "author": content.get('author', ''),
                "publish_date": content.get('publish_date', ''),
            }
        }

        logger.info(f"Retrieved knowledge document: {file_path}")
        return result

    except Exception as e:
        logger.error(f"Error getting knowledge document: {str(e)}")
        return {"error": str(e)}
