import logging
from http import HTTPStatus
from typing import Any, Dict, Optional,List

from fastapi import APIRouter, Header, HTTPException, Request

from consts.model import (
    ConversationRequest,
    ConversationResponse,
    GenerateTitleRequest,
    MessageIdRequest,
    OpinionRequest,
    RenameRequest,
    LinkPatientRequest,
    UpdateConversationStatusRequest,
    UpdateConversationTagsRequest,
    UpdateConversationSummaryRequest,
    ArchiveConversationRequest,
    BatchArchiveRequest,
)
from services.conversation_management_service import (
    create_new_conversation,
    delete_conversation_service,
    generate_conversation_title_service,
    get_conversation_history_service,
    get_conversation_list_service,
    get_sources_service,
    rename_conversation_service,
    update_message_opinion_service, 
    get_message_id_by_index_impl,
    link_conversation_to_patient_service,
    update_conversation_status_service,
    update_conversation_tags_service,
    update_conversation_summary_service,
    archive_conversation_service,
    batch_archive_conversations_service,
    get_patient_conversations_service,
)
from utils.auth_utils import get_current_user_id, get_current_user_info

router = APIRouter(prefix="/conversation")


@router.put("/create", response_model=ConversationResponse)
async def create_new_conversation_endpoint(request: ConversationRequest, authorization: Optional[str] = Header(None)):
    """
    Create a new conversation

    Args:
        request: ConversationRequest object containing:
            - title: Conversation title, default is "New Conversation"
            - portal_type: Portal type ('doctor', 'student', 'patient', 'admin', or 'general')
        authorization: Authorization header

    Returns:
        ConversationResponse object containing:
            - conversation_id: Conversation ID
            - conversation_title: Conversation title
            - portal_type: Portal type
            - create_time: Creation timestamp (milliseconds)
            - update_time: Update timestamp (milliseconds)
    """
    try:
        user_id, tenant_id = get_current_user_id(authorization)
        portal_type = getattr(request, 'portal_type', 'general')
        conversation_data = create_new_conversation(request.title, user_id, portal_type)
        return ConversationResponse(code=0, message="success", data=conversation_data)
    except Exception as e:
        logging.error(f"Failed to create conversation: {str(e)}")
        raise HTTPException(status_code=HTTPStatus.INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/list", response_model=ConversationResponse)
async def list_conversations_endpoint(
    portal_type: Optional[str] = None, 
    patient_id: Optional[int] = None,
    status: Optional[str] = None,
    tags: Optional[List[str]] = None,
    data_range: Optional[str] = None,
    include_archived: bool = False,
    authorization: Optional[str] = Header(None)
    ):
    """
    Get conversation list with enhanced filtering
 
    Args:
        portal_type: Optional portal type filter ('doctor', 'student', 'patient', 'admin', or 'general')
        patient_id: Filter by linked patient ID
        status: Filter by status (active/pending_followup/difficult_case/completed/archived)
        tags: Comma-separated tags to filter by
        date_range: Time range ('today', 'this_week', 'this_month', 'archived')
        include_archived: Whether to include archived conversations (default False)
        authorization: Authorization header
 
    Returns:
        ConversationResponse object containing conversation list with patient info, status, tags, summary
    """
    try:
        user_id, tenant_id = get_current_user_id(authorization)
        if not user_id:
            raise HTTPException(status_code=HTTPStatus.UNAUTHORIZED, detail="Unauthorized access, Please login first")

        tag_list = None
        if tags:
            # Handle both list and comma-separated string
            if isinstance(tags, list):
                tag_list = [tag.strip() for tag in tags if tag and tag.strip()]
            elif isinstance(tags, str):
                tag_list = [tag.strip() for tag in tags.split(',') if tag.strip()]

        conversations = get_conversation_list_service(
            user_id=user_id,
            portal_type=portal_type,
            patient_id=patient_id,
            status=status,
            tags=tag_list,
            data_range=data_range,
            include_archived=include_archived,
        )
        return ConversationResponse(code=0, message="success", data=conversations)
    except Exception as e:
        logging.error(f"Failed to get conversation list: {str(e)}")
        raise HTTPException(status_code=HTTPStatus.INTERNAL_SERVER_ERROR, detail=str(e))


@router.post("/rename", response_model=ConversationResponse)
async def rename_conversation_endpoint(request: RenameRequest, authorization: Optional[str] = Header(None)):
    """
    Rename a conversation

    Args:
        request: RenameRequest object containing:
            - conversation_id: Conversation ID
            - name: New conversation title
        authorization: Authorization header

    Returns:
        ConversationResponse object
    """
    try:
        user_id, tenant_id = get_current_user_id(authorization)
        rename_conversation_service(
            request.conversation_id, request.name, user_id)
        return ConversationResponse(code=0, message="success", data=True)
    except Exception as e:
        logging.error(f"Failed to rename conversation: {str(e)}")
        raise HTTPException(status_code=HTTPStatus.INTERNAL_SERVER_ERROR, detail=str(e))


@router.delete("/{conversation_id}", response_model=ConversationResponse)
async def delete_conversation_endpoint(conversation_id: int, authorization: Optional[str] = Header(None)):
    """
    Delete specified conversation

    Args:
        conversation_id: Conversation ID to delete
        authorization: Authorization header

    Returns:
        ConversationResponse object
    """
    try:
        user_id, tenant_id = get_current_user_id(authorization)
        delete_conversation_service(conversation_id, user_id)
        return ConversationResponse(code=0, message="success", data=True)
    except Exception as e:
        logging.error(f"Failed to delete conversation: {str(e)}")
        raise HTTPException(status_code=HTTPStatus.INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/{conversation_id}", response_model=ConversationResponse)
async def get_conversation_history_endpoint(conversation_id: int, authorization: Optional[str] = Header(None)):
    """
    Get complete history of specified conversation

    Args:
        conversation_id: Conversation ID
        authorization: Authorization header

    Returns:
        ConversationResponse object containing conversation history
    """
    try:
        user_id, tenant_id = get_current_user_id(authorization)
        history_data = get_conversation_history_service(
            conversation_id, user_id)
        return ConversationResponse(code=0, message="success", data=history_data)
    except Exception as e:
        logging.error(f"Failed to get conversation history: {str(e)}")
        raise HTTPException(status_code=HTTPStatus.INTERNAL_SERVER_ERROR, detail=str(e))


@router.post("/sources", response_model=Dict[str, Any])
async def get_sources_endpoint(request: Dict[str, Any], authorization: Optional[str] = Header(None)):
    """
    Get message source information (images and search results)

    Args:
        request: Request body containing optional fields:
            - conversation_id: Conversation ID
            - message_id: Message ID
            - type: Source type, default is "all", options are "image", "search", or "all"
        authorization: Authorization header

    Returns:
        Dict containing source information
    """
    try:
        user_id, tenant_id = get_current_user_id(authorization)
        conversation_id = request.get("conversation_id")
        message_id = request.get("message_id")
        source_type = request.get("type", "all")
        return get_sources_service(conversation_id, message_id, source_type, user_id)
    except Exception as e:
        logging.error(f"Failed to get message sources: {str(e)}")
        raise HTTPException(status_code=HTTPStatus.INTERNAL_SERVER_ERROR, detail=str(e))


@router.post("/generate_title", response_model=ConversationResponse)
async def generate_conversation_title_endpoint(
        request: GenerateTitleRequest,
        http_request: Request,
        authorization: Optional[str] = Header(None)
):
    """
    Generate conversation title

    Args:
        request: GenerateTitleRequest object containing:
            - conversation_id: Conversation ID
            - history: Conversation history list
        http_request: http request containing language info
        authorization: Authorization header

    Returns:
        ConversationResponse object containing generated title
    """
    try:
        user_id, tenant_id, language = get_current_user_info(
            authorization=authorization, request=http_request)
        title = await generate_conversation_title_service(request.conversation_id, request.history, user_id, tenant_id=tenant_id, language=language)
        return ConversationResponse(code=0, message="success", data=title)
    except Exception as e:
        logging.error(f"Failed to generate conversation title: {str(e)}")
        raise HTTPException(status_code=HTTPStatus.INTERNAL_SERVER_ERROR, detail=str(e))


@router.post("/message/update_opinion", response_model=ConversationResponse)
async def update_opinion_endpoint(request: OpinionRequest, authorization: Optional[str] = Header(None)):
    """
    Update message like/dislike status

    Args:
        request: OpinionRequest object containing message_id and opinion
        authorization: Authorization header

    Returns:
        ConversationResponse object
    """
    try:
        update_message_opinion_service(request.message_id, request.opinion)
        return ConversationResponse(code=0, message="success", data=True)
    except Exception as e:
        logging.error(f"Failed to update message like/dislike: {str(e)}")
        raise HTTPException(status_code=HTTPStatus.INTERNAL_SERVER_ERROR, detail=str(e))


@router.post("/message/id", response_model=ConversationResponse)
async def get_message_id_endpoint(request: MessageIdRequest):
    """
    Get message ID by conversation ID and message index

    Args:
        request: MessageIdRequest object containing:
            - conversation_id: Conversation ID
            - message_index: Message index

    Returns:
        ConversationResponse object containing message_id
    """
    try:
        message_id = await get_message_id_by_index_impl(request.conversation_id, request.message_index)
        return ConversationResponse(code=0, message="success", data=message_id)
    except Exception as e:
        logging.error(f"Failed to get message ID: {str(e)}")
        raise HTTPException(status_code=HTTPStatus.INTERNAL_SERVER_ERROR, detail=str(e))


# Conversation-Patient Linking Feature Endpoints
@router.put("/link_patient", response_model=ConversationResponse)
async def link_patient_endpoint(request: LinkPatientRequest, authorization: Optional[str] = Header(None)):
    """
    Link or unlink a conversation to a patient
 
    Args:
        request: LinkPatientRequest object containing:
            - conversation_id: Conversation ID
            - patient_id: Patient ID (null to unlink)
            - patient_name: Patient name
        authorization: Authorization header
 
    Returns:
        ConversationResponse object
    """
    try:
        user_id, tenant_id = get_current_user_id(authorization)
        result = link_conversation_to_patient_service(
            request.conversation_id, request.patient_id, request.patient_name, user_id
        )
        return ConversationResponse(code=0, message="success", data=result)
    except Exception as e:
        logging.error(f"Failed to link patient: {str(e)}")
        raise HTTPException(status_code=HTTPStatus.INTERNAL_SERVER_ERROR, detail=str(e))
 
 
@router.put("/status", response_model=ConversationResponse)
async def update_status_endpoint(request: UpdateConversationStatusRequest, authorization: Optional[str] = Header(None)):
    """
    Update conversation status
 
    Args:
        request: UpdateConversationStatusRequest object containing:
            - conversation_id: Conversation ID
            - status: Status (active/pending_followup/difficult_case/completed/archived)
        authorization: Authorization header
 
    Returns:
        ConversationResponse object
    """
    try:
        user_id, tenant_id = get_current_user_id(authorization)
        result = update_conversation_status_service(
            request.conversation_id, request.status, user_id
        )
        return ConversationResponse(code=0, message="success", data=result)
    except Exception as e:
        logging.error(f"Failed to update conversation status: {str(e)}")
        raise HTTPException(status_code=HTTPStatus.INTERNAL_SERVER_ERROR, detail=str(e))
 
 
@router.put("/tags", response_model=ConversationResponse)
async def update_tags_endpoint(request: UpdateConversationTagsRequest, authorization: Optional[str] = Header(None)):
    """
    Update conversation tags
 
    Args:
        request: UpdateConversationTagsRequest object containing:
            - conversation_id: Conversation ID
            - tags: Tags array
        authorization: Authorization header
 
    Returns:
        ConversationResponse object
    """
    try:

        user_id, tenant_id = get_current_user_id(authorization)
        result = update_conversation_tags_service(
            request.conversation_id, request.tags, user_id
        )
        return ConversationResponse(code=0, message="success", data=result)
    except Exception as e:
        logging.error(f"Failed to update conversation tags: {str(e)}")
        raise HTTPException(status_code=HTTPStatus.INTERNAL_SERVER_ERROR, detail=str(e))
 
 
@router.put("/summary", response_model=ConversationResponse)
async def update_summary_endpoint(request: UpdateConversationSummaryRequest, authorization: Optional[str] = Header(None)):
    """
    Update conversation summary
 
    Args:
        request: UpdateConversationSummaryRequest object containing:
            - conversation_id: Conversation ID
            - summary: Conversation summary text
        authorization: Authorization header
 
    Returns:
        ConversationResponse object
    """
    try:
        user_id, tenant_id = get_current_user_id(authorization)
        result = update_conversation_summary_service(
            request.conversation_id, request.summary, user_id
        )
        return ConversationResponse(code=0, message="success", data=result)
    except Exception as e:
        logging.error(f"Failed to update conversation summary: {str(e)}")
        raise HTTPException(status_code=HTTPStatus.INTERNAL_SERVER_ERROR, detail=str(e))
 
 
@router.post("/archive", response_model=ConversationResponse)
async def archive_conversation_endpoint(request: ArchiveConversationRequest, authorization: Optional[str] = Header(None)):
    """
    Archive a conversation
 
    Args:
        request: ArchiveConversationRequest object containing:
            - conversation_id: Conversation ID
            - archive_to_timeline: Whether to archive to patient timeline
        authorization: Authorization header
 
    Returns:
        ConversationResponse object
    """
    try:
        user_id, tenant_id = get_current_user_id(authorization)
        result = archive_conversation_service(
            request.conversation_id, request.archive_to_timeline, user_id
        )
        return ConversationResponse(code=0, message="success", data=result)
    except Exception as e:
        logging.error(f"Failed to archive conversation: {str(e)}")
        raise HTTPException(status_code=HTTPStatus.INTERNAL_SERVER_ERROR, detail=str(e))
 
 
@router.post("/batch_archive", response_model=ConversationResponse)
async def batch_archive_endpoint(request: BatchArchiveRequest, authorization: Optional[str] = Header(None)):
    """
    Batch archive multiple conversations
 
    Args:
        request: BatchArchiveRequest object containing:
            - conversation_ids: List of conversation IDs to archive
            - archive_to_timeline: Whether to archive to patient timeline
        authorization: Authorization header
 
    Returns:
        ConversationResponse object containing count of archived conversations
    """
    try:
        user_id, tenant_id = get_current_user_id(authorization)
        result = batch_archive_conversations_service(
            request.conversation_ids, request.archive_to_timeline, user_id
        )
        return ConversationResponse(code=0, message="success", data=result)
    except Exception as e:
        logging.error(f"Failed to batch archive conversations: {str(e)}")
        raise HTTPException(status_code=HTTPStatus.INTERNAL_SERVER_ERROR, detail=str(e))
 
 
@router.get("/patient/{patient_id}/conversations", response_model=ConversationResponse)
async def get_patient_conversations_endpoint(
    patient_id: int,
    status: Optional[str] = None,
    include_archived: bool = False,
    authorization: Optional[str] = Header(None)
):
    """
    Get all conversations for a specific patient
 
    Args:
        patient_id: Patient ID
        status: Optional status filter
        include_archived: Whether to include archived conversations
        authorization: Authorization header
 
    Returns:
        ConversationResponse object containing conversation list
    """
    try:
        user_id, tenant_id = get_current_user_id(authorization)
        conversations = get_patient_conversations_service(
            patient_id, user_id, status, include_archived
        )
        return ConversationResponse(code=0, message="success", data=conversations)
    except Exception as e:
        logging.error(f"Failed to get patient conversations: {str(e)}")
        raise HTTPException(status_code=HTTPStatus.INTERNAL_SERVER_ERROR, detail=str(e))