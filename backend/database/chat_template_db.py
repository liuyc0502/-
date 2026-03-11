import logging
from typing import List, Optional

from database.client import get_db_session, as_dict
from database.db_models import ChatTemplate

logger = logging.getLogger(__name__)


def list_templates(user_id: str, tenant_id: str) -> List[dict]:
    """List all non-deleted templates for a user, ordered by sort_order then create_time."""
    with get_db_session() as session:
        templates = session.query(ChatTemplate).filter(
            ChatTemplate.user_id == user_id,
            ChatTemplate.tenant_id == tenant_id,
            ChatTemplate.delete_flag != 'Y'
        ).order_by(ChatTemplate.sort_order.asc(), ChatTemplate.create_time.asc()).all()
        return [as_dict(t) for t in templates]


def create_template(data: dict, user_id: str, tenant_id: str) -> dict:
    """Create a new chat template. Returns dict with template_id."""
    with get_db_session() as session:
        new_tpl = ChatTemplate(
            template_name=data.get('template_name'),
            slash_command=data.get('slash_command'),
            prompt_template=data.get('prompt_template'),
            fields=data.get('fields', []),
            sort_order=data.get('sort_order', 0),
            user_id=user_id,
            tenant_id=tenant_id,
            created_by=user_id,
            updated_by=user_id,
            delete_flag='N'
        )
        session.add(new_tpl)
        session.flush()
        template_id = new_tpl.template_id
        session.commit()
        logger.info(f"Created chat template {template_id} for user {user_id}")
        return {"template_id": template_id}


def update_template(template_id: int, data: dict, user_id: str, tenant_id: str) -> bool:
    """Update mutable fields. Returns False if not found or not owned by user."""
    with get_db_session() as session:
        tpl = session.query(ChatTemplate).filter(
            ChatTemplate.template_id == template_id,
            ChatTemplate.user_id == user_id,
            ChatTemplate.tenant_id == tenant_id,
            ChatTemplate.delete_flag != 'Y'
        ).first()
        if not tpl:
            return False
        updatable = ['template_name', 'slash_command', 'prompt_template', 'fields', 'sort_order']
        for key in updatable:
            if key in data:
                setattr(tpl, key, data[key])
        tpl.updated_by = user_id
        session.commit()
        logger.info(f"Updated chat template {template_id}")
        return True


def soft_delete_template(template_id: int, user_id: str, tenant_id: str) -> bool:
    """Soft delete by setting delete_flag='Y'."""
    with get_db_session() as session:
        tpl = session.query(ChatTemplate).filter(
            ChatTemplate.template_id == template_id,
            ChatTemplate.user_id == user_id,
            ChatTemplate.tenant_id == tenant_id,
            ChatTemplate.delete_flag != 'Y'
        ).first()
        if not tpl:
            return False
        tpl.delete_flag = 'Y'
        tpl.updated_by = user_id
        session.commit()
        logger.info(f"Soft-deleted chat template {template_id}")
        return True
