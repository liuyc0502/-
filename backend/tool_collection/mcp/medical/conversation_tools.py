"""
Conversation Management MCP Tools

Tools for managing medical conversations and patient linking.
"""

import json
import logging
from typing import Optional, List
from fastmcp import FastMCP

logger = logging.getLogger(__name__)


def register_conversation_tools(mcp: FastMCP):
    """Register all conversation management tools to the MCP service."""

    @mcp.tool(
        name="conversation_summarizer",
        description="Generate a summary of a medical conversation."
    )
    async def conversation_summarizer(conversation_id: int) -> str:
        """Generate conversation summary."""
        try:
            from services.conversation_management_service import get_conversation_history_service
            from utils.auth_utils import get_default_user_id

            user_id = get_default_user_id()
            history = get_conversation_history_service(conversation_id, user_id)

            if not history or not history[0].get("message"):
                return json.dumps({"success": False, "error": "Conversation not found or empty"})

            messages = history[0].get("message", [])
            user_questions = []
            assistant_responses = []

            for msg in messages:
                role = msg.get("role")
                if role == "user":
                    user_questions.append(msg.get("message", ""))
                elif role == "assistant":
                    content = msg.get("message", "")
                    if isinstance(content, list):
                        for unit in content:
                            if unit.get("type") == "final_answer":
                                assistant_responses.append(unit.get("content", ""))
                    else:
                        assistant_responses.append(content)

            return json.dumps({
                "success": True,
                "summary": {
                    "conversation_id": conversation_id,
                    "message_count": len(messages),
                    "user_queries": user_questions,
                    "response_count": len(assistant_responses)
                }
            }, ensure_ascii=False, default=str)
        except Exception as e:
            logger.error(f"conversation_summarizer failed: {str(e)}")
            return json.dumps({"success": False, "error": str(e)}, ensure_ascii=False)

    @mcp.tool(
        name="conversation_to_patient_link",
        description="Link or unlink a conversation to a patient record."
    )
    async def conversation_to_patient_link(
        conversation_id: int,
        patient_id: Optional[int] = None,
        patient_name: Optional[str] = None,
        action: str = "link"
    ) -> str:
        """Link conversation to patient."""
        try:
            from services.conversation_management_service import link_conversation_to_patient_service
            from utils.auth_utils import get_default_user_id

            user_id = get_default_user_id()

            if action == "unlink":
                patient_id = None
                patient_name = None

            result = link_conversation_to_patient_service(
                conversation_id=conversation_id,
                patient_id=patient_id,
                patient_name=patient_name,
                user_id=user_id
            )

            return json.dumps({
                "success": result.get("success", False),
                "message": result.get("message", "Operation completed")
            }, ensure_ascii=False)
        except Exception as e:
            logger.error(f"conversation_to_patient_link failed: {str(e)}")
            return json.dumps({"success": False, "error": str(e)}, ensure_ascii=False)

    @mcp.tool(
        name="patient_conversation_history",
        description="Get all conversations associated with a specific patient."
    )
    async def patient_conversation_history(
        patient_id: int,
        status: Optional[str] = None,
        include_archived: bool = False
    ) -> str:
        """Get patient's conversation history."""
        try:
            from services.conversation_management_service import get_patient_conversations_service
            from utils.auth_utils import get_default_user_id

            user_id = get_default_user_id()
            conversations = get_patient_conversations_service(
                patient_id=patient_id,
                user_id=user_id,
                status=status,
                include_archived=include_archived
            )

            result = [{
                "conversation_id": c.get("conversation_id"),
                "title": c.get("conversation_title"),
                "status": c.get("status"),
                "tags": c.get("tags", []),
                "create_time": c.get("create_time")
            } for c in conversations]

            return json.dumps({
                "success": True,
                "patient_id": patient_id,
                "conversations": result
            }, ensure_ascii=False, default=str)
        except Exception as e:
            logger.error(f"patient_conversation_history failed: {str(e)}")
            return json.dumps({"success": False, "error": str(e)}, ensure_ascii=False)
