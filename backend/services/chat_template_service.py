import logging
from typing import List

from consts.exceptions import AgentRunException
from database import chat_template_db

logger = logging.getLogger(__name__)


async def list_templates_service(user_id: str, tenant_id: str) -> List[dict]:
    try:
        return chat_template_db.list_templates(user_id, tenant_id)
    except Exception as e:
        logger.error(f"Failed to list templates: {e}")
        raise AgentRunException(f"Failed to list templates: {e}")


async def create_template_service(data: dict, user_id: str, tenant_id: str) -> dict:
    try:
        for field in ['template_name', 'slash_command', 'prompt_template']:
            if not data.get(field):
                raise ValueError(f"Missing required field: {field}")
        result = chat_template_db.create_template(data, user_id, tenant_id)
        return {"success": True, "template_id": result["template_id"], "message": "Template created"}
    except ValueError as e:
        raise e
    except Exception as e:
        logger.error(f"Failed to create template: {e}")
        raise AgentRunException(f"Failed to create template: {e}")


async def update_template_service(template_id: int, data: dict, user_id: str, tenant_id: str) -> dict:
    try:
        success = chat_template_db.update_template(template_id, data, user_id, tenant_id)
        if not success:
            raise ValueError(f"Template {template_id} not found or not owned by user")
        return {"success": True, "message": "Template updated"}
    except ValueError as e:
        raise e
    except Exception as e:
        logger.error(f"Failed to update template: {e}")
        raise AgentRunException(f"Failed to update template: {e}")


async def delete_template_service(template_id: int, user_id: str, tenant_id: str) -> dict:
    try:
        success = chat_template_db.soft_delete_template(template_id, user_id, tenant_id)
        if not success:
            raise ValueError(f"Template {template_id} not found or not owned by user")
        return {"success": True, "message": "Template deleted"}
    except ValueError as e:
        raise e
    except Exception as e:
        logger.error(f"Failed to delete template: {e}")
        raise AgentRunException(f"Failed to delete template: {e}")
