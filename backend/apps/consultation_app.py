"""
Consultation API endpoints - Manage multi-agent debate consultation sessions.
"""
import asyncio
import json
import logging
import threading
from http import HTTPStatus
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Header
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, Field

from agents.create_agent_info import create_agent_config, create_model_config_list
from database.agent_db import search_agent_info_by_agent_id
from consts.const import LOCAL_MCP_SERVER, LANGUAGE, MESSAGE_ROLE
from consts.model import MessageRequest, MessageUnit
from nexent.core.utils.observer import MessageObserver, ProcessType
from services.consultation_orchestrator import ConsultationOrchestrator
from services.consultation_service import consultation_manager
from services.conversation_management_service import save_message
from services.remote_mcp_service import get_remote_mcp_server_list
from database.consultation_db import (
    list_consultations as db_list_consultations,
    get_consultation_by_id,
    delete_consultation as db_delete_consultation,
)
from database.conversation_db import get_conversation_messages
from utils.auth_utils import get_current_user_id

logger = logging.getLogger(__name__)
router = APIRouter()


class ConsultationStartRequest(BaseModel):
    question: str = Field(..., description="The consultation question")
    specialist_agent_ids: List[int] = Field(..., description="List of specialist agent IDs")
    coordinator_agent_id: Optional[int] = Field(None, description="Coordinator agent ID (optional)")
    max_rounds: int = Field(5, description="Maximum debate rounds")
    patient_id: Optional[int] = Field(None, description="Patient ID for context")
    conversation_id: Optional[int] = Field(None, description="Conversation ID to link")
    minio_files: Optional[List[Dict]] = Field(None, description="Uploaded file attachments [{name, type, object_name, url}]")


class ConsultationDecisionRequest(BaseModel):
    action: str = Field(..., description="Action: 'continue' or 'conclude'")
    instructions: Optional[str] = Field(None, description="Optional instructions for next round")
    minio_files: Optional[List[Dict]] = Field(None, description="Additional file attachments [{name, type, object_name, url}]")


@router.post("/agent/consultation/start")
async def start_consultation(
    request: ConsultationStartRequest,
    authorization: Optional[str] = Header(None),
):
    """Start a multi-agent debate consultation and stream results."""
    try:
        user_id, tenant_id = get_current_user_id(authorization)
        if not user_id or not tenant_id:
            raise HTTPException(status_code=HTTPStatus.UNAUTHORIZED, detail="Unauthorized")

        if len(request.specialist_agent_ids) < 2:
            raise HTTPException(
                status_code=HTTPStatus.BAD_REQUEST,
                detail="At least 2 specialist agents required for consultation"
            )

        language = LANGUAGE["ZH"]

        # Create consultation session
        consultation_id = consultation_manager.create_session(
            question=request.question,
            specialist_agent_ids=request.specialist_agent_ids,
            max_rounds=request.max_rounds,
            minio_files=request.minio_files,
        )

        # Build specialist configs
        model_config_list = await create_model_config_list(tenant_id)
        specialist_configs = []
        for agent_id in request.specialist_agent_ids:
            agent_config = await create_agent_config(
                agent_id=agent_id,
                tenant_id=tenant_id,
                user_id=user_id,
                language=language,
                last_user_query=request.question,
                allow_memory_search=False,
            )
            # Use display_name for UI display, fallback to agent_config.name
            agent_info = search_agent_info_by_agent_id(agent_id=agent_id, tenant_id=tenant_id)
            display_name = agent_info.get("display_name") or agent_config.name
            specialist_configs.append({
                "agent_config": agent_config,
                "name": display_name,
                "specialty": agent_config.description,
            })

        # Build coordinator config
        coordinator_config = None
        if request.coordinator_agent_id:
            coord_agent_config = await create_agent_config(
                agent_id=request.coordinator_agent_id,
                tenant_id=tenant_id,
                user_id=user_id,
                language=language,
                last_user_query=request.question,
                allow_memory_search=False,
            )
            coordinator_config = {"agent_config": coord_agent_config}

        # Get MCP hosts
        from urllib.parse import urljoin
        remote_mcp_list = await get_remote_mcp_server_list(tenant_id=tenant_id)
        default_mcp_url = urljoin(LOCAL_MCP_SERVER, "sse")
        remote_mcp_list.append({
            "remote_mcp_server_name": "nexent",
            "remote_mcp_server": default_mcp_url,
            "status": True
        })
        mcp_host = [r["remote_mcp_server"] for r in remote_mcp_list if r.get("status")]

        # Build additional_args
        additional_args = {}
        if request.patient_id:
            additional_args["patient_id"] = str(request.patient_id)

        # Create shared observer and orchestrator
        observer = MessageObserver(lang=language)
        stop_event = threading.Event()

        from services.confirmation_service import confirmation_manager as conf_manager
        orchestrator = ConsultationOrchestrator(
            observer=observer,
            consultation_manager=consultation_manager,
            model_config_list=model_config_list,
            stop_event=stop_event,
            confirmation_manager=conf_manager,
            tenant_id=tenant_id,
            user_id=user_id,
        )

        # Launch orchestration on background thread
        thread = threading.Thread(
            target=orchestrator.run_consultation,
            kwargs={
                "consultation_id": consultation_id,
                "question": request.question,
                "specialist_configs": specialist_configs,
                "coordinator_config": coordinator_config,
                "max_rounds": request.max_rounds,
                "additional_args": additional_args if additional_args else None,
                "mcp_host": mcp_host,
                "conversation_id": request.conversation_id,
                "patient_id": request.patient_id,
                "minio_files": request.minio_files,
            },
            daemon=True,
        )
        thread.start()

        # Stream SSE from observer
        async def generate_stream():
            all_messages: List[str] = []
            try:
                while thread.is_alive():
                    cached = observer.get_cached_message()
                    for msg in cached:
                        all_messages.append(msg)
                        yield f"data: {msg}\n\n"
                        if len(cached) < 8:
                            await asyncio.sleep(0.05)
                    await asyncio.sleep(0.1)

                # Flush remaining messages
                cached = observer.get_cached_message()
                for msg in cached:
                    all_messages.append(msg)
                    yield f"data: {msg}\n\n"
            except Exception as e:
                error_payload = json.dumps(
                    {"type": "error", "content": str(e)}, ensure_ascii=False)
                yield f"data: {error_payload}\n\n"
            finally:
                # Save consultation messages to conversation history
                if request.conversation_id and all_messages:
                    try:
                        # Only save final results, not intermediate specialist steps/thinking
                        # (those are preserved in the consultation_record table)
                        saveable_types = {
                            ProcessType.FINAL_ANSWER.value,
                            ProcessType.REPORT_CARD.value,
                        }
                        message_units = []
                        for raw_msg in all_messages:
                            try:
                                parsed = json.loads(raw_msg)
                                if parsed.get("type") in saveable_types:
                                    message_units.append(
                                        MessageUnit(type=parsed["type"], content=parsed["content"])
                                    )
                            except (json.JSONDecodeError, KeyError):
                                continue

                        if message_units:
                            # Determine message_idx from existing messages
                            existing = get_conversation_messages(request.conversation_id)
                            message_idx = len(existing)

                            # Save user message (the consultation question) first
                            user_msg_request = MessageRequest(
                                conversation_id=request.conversation_id,
                                message_idx=message_idx,
                                role=MESSAGE_ROLE["USER"],
                                message=[MessageUnit(type="string", content=f"[多学科会诊] {request.question}")],
                            )
                            save_message(user_msg_request, user_id=user_id, tenant_id=tenant_id)

                            # Save assistant message (consultation results)
                            msg_request = MessageRequest(
                                conversation_id=request.conversation_id,
                                message_idx=message_idx + 1,
                                role=MESSAGE_ROLE["ASSISTANT"],
                                message=message_units,
                            )
                            save_message(msg_request, user_id=user_id, tenant_id=tenant_id)
                            logger.info(
                                f"Saved {len(message_units)} consultation messages to conversation {request.conversation_id}"
                            )
                    except Exception as save_err:
                        logger.error(f"Failed to save consultation messages: {save_err}")

        return StreamingResponse(
            generate_stream(),
            media_type="text/event-stream",
            headers={"Cache-Control": "no-cache", "Connection": "keep-alive"},
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error starting consultation: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/agent/consultation/{consultation_id}/decide")
async def consultation_decision(
    consultation_id: str,
    request: ConsultationDecisionRequest,
    authorization: Optional[str] = Header(None),
):
    """Doctor intervention: continue debate or form conclusion."""
    try:
        user_id, tenant_id = get_current_user_id(authorization)
        if not user_id or not tenant_id:
            raise HTTPException(status_code=HTTPStatus.UNAUTHORIZED, detail="Unauthorized")

        if request.action not in ("continue", "conclude"):
            raise HTTPException(
                status_code=HTTPStatus.BAD_REQUEST,
                detail="action must be 'continue' or 'conclude'"
            )

        success = consultation_manager.resolve_decision(
            consultation_id=consultation_id,
            action=request.action,
            instructions=request.instructions,
            minio_files=request.minio_files,
        )

        if not success:
            raise HTTPException(
                status_code=HTTPStatus.NOT_FOUND,
                detail="Consultation not found or not waiting for decision"
            )

        return JSONResponse(
            status_code=HTTPStatus.OK,
            content={"success": True, "message": f"Consultation {request.action}d"}
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in consultation decision: {str(e)}")
        raise HTTPException(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/agent/consultation/{consultation_id}/status")
async def consultation_status(
    consultation_id: str,
    authorization: Optional[str] = Header(None),
):
    """Get consultation session status."""
    try:
        user_id, tenant_id = get_current_user_id(authorization)
        if not user_id or not tenant_id:
            raise HTTPException(status_code=HTTPStatus.UNAUTHORIZED, detail="Unauthorized")

        session = consultation_manager.get_session(consultation_id)
        if session is None:
            raise HTTPException(
                status_code=HTTPStatus.NOT_FOUND,
                detail="Consultation not found"
            )

        return JSONResponse(
            status_code=HTTPStatus.OK,
            content={
                "consultation_id": session.consultation_id,
                "status": session.status,
                "current_round": session.current_round,
                "max_rounds": session.max_rounds,
                "question": session.question,
                "round_count": len(session.round_results),
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting consultation status: {str(e)}")
        raise HTTPException(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/agent/consultations")
async def list_consultations(
    authorization: Optional[str] = Header(None),
):
    """List all active consultation sessions."""
    try:
        user_id, tenant_id = get_current_user_id(authorization)
        if not user_id or not tenant_id:
            raise HTTPException(status_code=HTTPStatus.UNAUTHORIZED, detail="Unauthorized")

        sessions = consultation_manager.get_active_sessions()
        return JSONResponse(
            status_code=HTTPStatus.OK,
            content={"consultations": sessions}
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listing consultations: {str(e)}")
        raise HTTPException(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


# ============================================================================
# Consultation History Endpoints (persisted records)
# ============================================================================


@router.get("/agent/consultation/history")
async def get_consultation_history(
    page: int = 1,
    page_size: int = 20,
    status: Optional[str] = None,
    patient_id: Optional[int] = None,
    authorization: Optional[str] = Header(None),
):
    """List persisted consultation records with pagination."""
    try:
        user_id, tenant_id = get_current_user_id(authorization)
        if not user_id or not tenant_id:
            raise HTTPException(status_code=HTTPStatus.UNAUTHORIZED, detail="Unauthorized")

        result = db_list_consultations(
            tenant_id=tenant_id,
            status=status,
            patient_id=patient_id,
            page=page,
            page_size=page_size,
        )
        return JSONResponse(status_code=HTTPStatus.OK, content=result)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching consultation history: {str(e)}")
        raise HTTPException(status_code=HTTPStatus.INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/agent/consultation/history/{consultation_id}")
async def get_consultation_detail(
    consultation_id: int,
    authorization: Optional[str] = Header(None),
):
    """Get a single consultation record detail."""
    try:
        user_id, tenant_id = get_current_user_id(authorization)
        if not user_id or not tenant_id:
            raise HTTPException(status_code=HTTPStatus.UNAUTHORIZED, detail="Unauthorized")

        record = get_consultation_by_id(consultation_id, tenant_id)
        if not record:
            raise HTTPException(status_code=HTTPStatus.NOT_FOUND, detail="Consultation record not found")

        return JSONResponse(status_code=HTTPStatus.OK, content=record)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching consultation detail: {str(e)}")
        raise HTTPException(status_code=HTTPStatus.INTERNAL_SERVER_ERROR, detail=str(e))


@router.delete("/agent/consultation/history/{consultation_id}")
async def delete_consultation_record(
    consultation_id: int,
    authorization: Optional[str] = Header(None),
):
    """Soft-delete a consultation record."""
    try:
        user_id, tenant_id = get_current_user_id(authorization)
        if not user_id or not tenant_id:
            raise HTTPException(status_code=HTTPStatus.UNAUTHORIZED, detail="Unauthorized")

        success = db_delete_consultation(consultation_id, tenant_id)
        if not success:
            raise HTTPException(status_code=HTTPStatus.NOT_FOUND, detail="Consultation record not found")

        return JSONResponse(status_code=HTTPStatus.OK, content={"success": True})

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting consultation record: {str(e)}")
        raise HTTPException(status_code=HTTPStatus.INTERNAL_SERVER_ERROR, detail=str(e))
