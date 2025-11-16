from typing import Any, Dict, List, Optional

from sqlalchemy.exc import SQLAlchemyError

from database.client import as_dict, get_db_session
from database.db_models import KnowledgeFileCard


def create_or_update_card(card_data: Dict[str, Any]) -> int:
    """
    Create or update a knowledge file card

    Args:
        card_data: Dictionary containing card data, must include:
            - file_path: File path in MinIO
            - knowledge_id: Knowledge base ID
            - card_title: Card title
            - card_summary: Card summary (optional)
            - category: Category tag (optional)
            - tags: JSON string of tags (optional)
            - tenant_id: Tenant ID
            - user_id: User ID for created_by/updated_by

    Returns:
        int: Card ID
    """
    try:
        with get_db_session() as session:
            # Check if card already exists for this file
            existing_card = session.query(KnowledgeFileCard).filter(
                KnowledgeFileCard.file_path == card_data["file_path"],
                KnowledgeFileCard.tenant_id == card_data["tenant_id"],
                KnowledgeFileCard.delete_flag != 'Y'
            ).first()

            if existing_card:
                # Update existing card
                existing_card.card_title = card_data.get("card_title", existing_card.card_title)
                existing_card.card_summary = card_data.get("card_summary", existing_card.card_summary)
                existing_card.category = card_data.get("category", existing_card.category)
                existing_card.tags = card_data.get("tags", existing_card.tags)
                existing_card.knowledge_id = card_data.get("knowledge_id", existing_card.knowledge_id)
                existing_card.updated_by = card_data.get("user_id")
                session.flush()
                session.commit()
                return existing_card.card_id
            else:
                # Create new card
                new_card = KnowledgeFileCard(
                    file_path=card_data["file_path"],
                    knowledge_id=card_data["knowledge_id"],
                    card_title=card_data.get("card_title", ""),
                    card_summary=card_data.get("card_summary", ""),
                    category=card_data.get("category", ""),
                    tags=card_data.get("tags", "[]"),
                    view_count=0,
                    tenant_id=card_data["tenant_id"],
                    created_by=card_data.get("user_id"),
                    updated_by=card_data.get("user_id")
                )
                session.add(new_card)
                session.flush()
                session.commit()
                return new_card.card_id
    except SQLAlchemyError as e:
        session.rollback()
        raise e


def get_card_by_file_path(file_path: str, tenant_id: str) -> Optional[Dict[str, Any]]:
    """
    Get card information by file path

    Args:
        file_path: File path in MinIO
        tenant_id: Tenant ID

    Returns:
        Dict containing card information, or None if not found
    """
    try:
        with get_db_session() as session:
            card = session.query(KnowledgeFileCard).filter(
                KnowledgeFileCard.file_path == file_path,
                KnowledgeFileCard.tenant_id == tenant_id,
                KnowledgeFileCard.delete_flag != 'Y'
            ).first()

            if card:
                return as_dict(card)
            return None
    except SQLAlchemyError as e:
        raise e


def get_cards_by_knowledge_id(knowledge_id: int, tenant_id: str) -> List[Dict[str, Any]]:
    """
    Get all cards for a knowledge base

    Args:
        knowledge_id: Knowledge base ID
        tenant_id: Tenant ID

    Returns:
        List of card dictionaries
    """
    try:
        with get_db_session() as session:
            cards = session.query(KnowledgeFileCard).filter(
                KnowledgeFileCard.knowledge_id == knowledge_id,
                KnowledgeFileCard.tenant_id == tenant_id,
                KnowledgeFileCard.delete_flag != 'Y'
            ).all()

            return [as_dict(card) for card in cards]
    except SQLAlchemyError as e:
        raise e


def get_all_cards_by_tenant(tenant_id: str, category: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Get all cards for a tenant, optionally filtered by category

    Args:
        tenant_id: Tenant ID
        category: Optional category filter

    Returns:
        List of card dictionaries
    """
    try:
        with get_db_session() as session:
            query = session.query(KnowledgeFileCard).filter(
                KnowledgeFileCard.tenant_id == tenant_id,
                KnowledgeFileCard.delete_flag != 'Y'
            )

            if category:
                query = query.filter(KnowledgeFileCard.category == category)

            cards = query.order_by(KnowledgeFileCard.create_time.desc()).all()

            return [as_dict(card) for card in cards]
    except SQLAlchemyError as e:
        raise e


def delete_card(file_path: str, tenant_id: str, user_id: str) -> bool:
    """
    Delete a card (soft delete)

    Args:
        file_path: File path in MinIO
        tenant_id: Tenant ID
        user_id: User ID for updated_by

    Returns:
        bool: Whether the operation was successful
    """
    try:
        with get_db_session() as session:
            card = session.query(KnowledgeFileCard).filter(
                KnowledgeFileCard.file_path == file_path,
                KnowledgeFileCard.tenant_id == tenant_id,
                KnowledgeFileCard.delete_flag != 'Y'
            ).first()

            if not card:
                return False

            card.delete_flag = 'Y'
            card.updated_by = user_id
            session.flush()
            session.commit()
            return True
    except SQLAlchemyError as e:
        session.rollback()
        raise e


def increment_view_count(file_path: str, tenant_id: str) -> bool:
    """
    Increment view count for a card

    Args:
        file_path: File path in MinIO
        tenant_id: Tenant ID

    Returns:
        bool: Whether the operation was successful
    """
    try:
        with get_db_session() as session:
            card = session.query(KnowledgeFileCard).filter(
                KnowledgeFileCard.file_path == file_path,
                KnowledgeFileCard.tenant_id == tenant_id,
                KnowledgeFileCard.delete_flag != 'Y'
            ).first()

            if not card:
                return False

            card.view_count = (card.view_count or 0) + 1
            session.flush()
            session.commit()
            return True
    except SQLAlchemyError as e:
        session.rollback()
        raise e
