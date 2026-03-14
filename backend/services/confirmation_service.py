"""
Tool Confirmation Service - Manages interactive confirmation cards for write operations.
Allows doctor to confirm/edit/regenerate before MCP tools execute.
"""
import logging
import threading
import uuid
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)


@dataclass
class ConfirmationRequest:
    confirmation_id: str
    tool_name: str
    tool_display_name: str
    parameters: Dict[str, Any]
    parameter_schema: list
    event: threading.Event = field(default_factory=threading.Event)
    result: Optional[Dict[str, Any]] = None
    status: str = "pending"  # pending, confirmed, regenerate, timeout
    created_at: datetime = field(default_factory=datetime.now)


class ConfirmationManager:
    """Singleton manager for pending tool confirmations."""

    def __init__(self):
        self._pending: Dict[str, ConfirmationRequest] = {}
        self._lock = threading.Lock()

    def create_confirmation(
        self,
        tool_name: str,
        tool_display_name: str,
        parameters: Dict[str, Any],
        parameter_schema: list
    ) -> str:
        confirmation_id = str(uuid.uuid4())
        request = ConfirmationRequest(
            confirmation_id=confirmation_id,
            tool_name=tool_name,
            tool_display_name=tool_display_name,
            parameters=parameters,
            parameter_schema=parameter_schema
        )
        with self._lock:
            self._pending[confirmation_id] = request
        logger.info(f"Created confirmation {confirmation_id} for tool {tool_name}")
        return confirmation_id

    def wait_for_confirmation(self, confirmation_id: str, timeout: float = 300) -> Dict[str, Any]:
        """Block until doctor confirms/regenerates or timeout. Returns result dict."""
        with self._lock:
            request = self._pending.get(confirmation_id)
        if request is None:
            return {"action": "error", "message": "Confirmation not found"}

        # Block the agent thread
        confirmed = request.event.wait(timeout=timeout)

        # Cleanup
        with self._lock:
            self._pending.pop(confirmation_id, None)

        if not confirmed:
            request.status = "timeout"
            logger.warning(f"Confirmation {confirmation_id} timed out")
            return {"action": "timeout"}

        return request.result or {"action": "error", "message": "No result set"}

    def resolve_confirmation(
        self,
        confirmation_id: str,
        action: str,
        parameters: Optional[Dict[str, Any]] = None,
        instructions: Optional[str] = None
    ) -> bool:
        """Resolve a pending confirmation. Called by REST endpoint."""
        with self._lock:
            request = self._pending.get(confirmation_id)
        if request is None:
            logger.warning(f"Confirmation {confirmation_id} not found or expired")
            return False

        request.status = action
        request.result = {
            "action": action,
            "parameters": parameters or request.parameters,
            "instructions": instructions or ""
        }
        request.event.set()
        logger.info(f"Resolved confirmation {confirmation_id} with action={action}")
        return True

    def get_pending(self, conversation_id: Optional[str] = None) -> list:
        """Get all pending confirmations (for reconnection scenarios)."""
        with self._lock:
            pending = []
            for req in self._pending.values():
                if req.status == "pending":
                    pending.append({
                        "confirmation_id": req.confirmation_id,
                        "tool_name": req.tool_name,
                        "tool_display_name": req.tool_display_name,
                        "parameters": req.parameters,
                        "parameter_schema": req.parameter_schema,
                        "created_at": req.created_at.isoformat()
                    })
            return pending


# Global singleton
confirmation_manager = ConfirmationManager()
