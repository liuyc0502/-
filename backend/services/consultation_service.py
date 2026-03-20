"""
Multi-Agent Consultation Service - Manages debate consultation sessions.
Allows multiple specialist agents to debate in parallel with doctor intervention gates.
"""
import logging
import threading
import uuid
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


@dataclass
class AgentOpinion:
    agent_name: str
    specialty: str
    conclusion: str
    reasoning_steps: List[str] = field(default_factory=list)
    confidence: float = 0.0
    agrees_with: List[str] = field(default_factory=list)
    disagrees_with: List[str] = field(default_factory=list)


@dataclass
class RoundResult:
    round_num: int
    opinions: Dict[str, AgentOpinion] = field(default_factory=dict)
    summary: str = ""
    consensus_level: str = "divergent"  # full | partial | divergent


@dataclass
class ConsultationSession:
    consultation_id: str
    question: str
    specialist_agent_ids: List[int]
    max_rounds: int = 5
    current_round: int = 0
    round_results: List[RoundResult] = field(default_factory=list)
    status: str = "running"  # running | waiting_doctor | concluding | completed | timeout
    decision_event: threading.Event = field(default_factory=threading.Event)
    decision_result: Optional[Dict[str, Any]] = None
    created_at: datetime = field(default_factory=datetime.now)


class ConsultationManager:
    """Manages consultation sessions with doctor intervention blocking gates."""

    def __init__(self):
        self._sessions: Dict[str, ConsultationSession] = {}
        self._lock = threading.Lock()

    def create_session(
        self,
        question: str,
        specialist_agent_ids: List[int],
        max_rounds: int = 5,
    ) -> str:
        consultation_id = str(uuid.uuid4())
        session = ConsultationSession(
            consultation_id=consultation_id,
            question=question,
            specialist_agent_ids=specialist_agent_ids,
            max_rounds=max_rounds,
        )
        with self._lock:
            self._sessions[consultation_id] = session
        logger.info(f"Created consultation {consultation_id} with {len(specialist_agent_ids)} specialists")
        return consultation_id

    def get_session(self, consultation_id: str) -> Optional[ConsultationSession]:
        with self._lock:
            return self._sessions.get(consultation_id)

    def add_round_result(self, consultation_id: str, round_result: RoundResult):
        with self._lock:
            session = self._sessions.get(consultation_id)
        if session:
            session.round_results.append(round_result)

    def wait_for_doctor_decision(self, consultation_id: str, timeout: float = 3600) -> Dict[str, Any]:
        """Block until doctor decides to continue or conclude. Returns decision dict."""
        with self._lock:
            session = self._sessions.get(consultation_id)
        if session is None:
            return {"action": "error", "message": "Consultation not found"}

        session.status = "waiting_doctor"
        confirmed = session.decision_event.wait(timeout=timeout)
        session.decision_event.clear()  # Reset for next round

        if not confirmed:
            session.status = "timeout"
            logger.warning(f"Consultation {consultation_id} doctor decision timed out")
            return {"action": "conclude", "reason": "timeout"}

        return session.decision_result or {"action": "conclude"}

    def resolve_decision(
        self,
        consultation_id: str,
        action: str,
        instructions: Optional[str] = None,
    ) -> bool:
        """Resolve a pending doctor decision. Called by REST endpoint."""
        with self._lock:
            session = self._sessions.get(consultation_id)
        if session is None:
            logger.warning(f"Consultation {consultation_id} not found or expired")
            return False

        session.decision_result = {
            "action": action,
            "instructions": instructions or "",
        }
        session.status = "running" if action == "continue" else "concluding"
        session.decision_event.set()
        logger.info(f"Resolved consultation {consultation_id} with action={action}")
        return True

    def complete_session(self, consultation_id: str):
        """Mark session as completed."""
        with self._lock:
            session = self._sessions.get(consultation_id)
        if session:
            session.status = "completed"

    def cleanup_session(self, consultation_id: str):
        """Remove session from memory."""
        with self._lock:
            self._sessions.pop(consultation_id, None)

    def get_active_sessions(self) -> list:
        """Get all active consultation sessions."""
        with self._lock:
            return [
                {
                    "consultation_id": s.consultation_id,
                    "question": s.question,
                    "status": s.status,
                    "current_round": s.current_round,
                    "max_rounds": s.max_rounds,
                    "created_at": s.created_at.isoformat(),
                }
                for s in self._sessions.values()
                if s.status not in ("completed",)
            ]


# Global singleton
consultation_manager = ConsultationManager()
