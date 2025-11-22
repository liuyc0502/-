import json
import logging
from datetime import datetime
from typing import Any, Dict, List, Optional, TypedDict

from sqlalchemy import asc, desc, func, insert, select, update

from .client import as_dict, get_db_session
from .db_models import (
    ConversationMessage,
    ConversationMessageUnit,
    ConversationRecord,
    ConversationSourceImage,
    ConversationSourceSearch,
)
from .utils import add_creation_tracking, add_update_tracking

logger = logging.getLogger("conversation_db")


class MessageRecord(TypedDict):
    message_id: int
    message_index: int
    role: str
    type: Optional[str]
    content: Optional[str]
    opinion_flag: Optional[str]


class SearchRecord(TypedDict):
    message_id: int
    source_type: str
    source_title: str
    source_location: str
    source_content: str
    score_overall: Optional[float]
    score_accuracy: Optional[float]
    score_semantic: Optional[float]
    published_date: Optional[datetime]
    cite_index: Optional[int]
    search_type: Optional[str]
    tool_sign: Optional[str]


class ImageRecord(TypedDict):
    message_id: int
    image_url: str


class ConversationHistory(TypedDict):
    conversation_id: int
    create_time: int
    message_records: List[MessageRecord]
    search_records: List[SearchRecord]
    image_records: List[ImageRecord]


def create_conversation(conversation_title: str, user_id: Optional[str] = None, portal_type: str = 'general') -> Dict[str, Any]:
    """
    Create a new conversation record

    Args:
        conversation_title: Conversation title
        user_id: Reserved parameter for created_by and updated_by fields
        portal_type: Portal type ('doctor', 'student', 'patient', 'admin', or 'general')

    Returns:
        Dict[str, Any]: Dictionary containing complete information of the newly created conversation
    """
    with get_db_session() as session:
        # Prepare data dictionary
        data = {"conversation_title": conversation_title, "portal_type": portal_type, "delete_flag": 'N'}
        if user_id:
            data = add_creation_tracking(data, user_id)

        stmt = insert(ConversationRecord).values(**data).returning(
            ConversationRecord.conversation_id,
            ConversationRecord.conversation_title,
            ConversationRecord.portal_type,
            (func.extract('epoch', ConversationRecord.create_time)
             * 1000).label('create_time'),
            (func.extract('epoch', ConversationRecord.update_time)
             * 1000).label('update_time')
        )

        record = session.execute(stmt).fetchone()

        # Convert to dictionary and ensure timestamps are integers
        result_dict = {
            "conversation_id": record.conversation_id,
            "conversation_title": record.conversation_title,
            "portal_type": record.portal_type,
            "create_time": int(record.create_time),
            "update_time": int(record.update_time)
        }
        return result_dict


def create_conversation_message(message_data: Dict[str, Any], user_id: Optional[str] = None) -> int:
    """
    Create a conversation message record

    Args:
        message_data: Dictionary containing message data, must include the following fields:
            - conversation_id: Conversation ID (integer)
            - message_idx: Message index (integer)
            - role: Message role
            - content: Message content
            - minio_files: JSON string of attachment information
        user_id: Reserved parameter for created_by and updated_by fields

    Returns:
        int: Newly created message ID (auto-increment ID)
    """
    with get_db_session() as session:
        # Ensure conversation_id is integer type
        conversation_id = int(message_data['conversation_id'])
        message_idx = int(message_data['message_idx'])

        minio_files = message_data.get('minio_files')
        # Convert minio_files to JSON string for storage
        if minio_files is not None:
            # If minio_files is already a string, use it directly; otherwise convert to JSON string
            if not isinstance(minio_files, str):
                minio_files = json.dumps(minio_files)

        # Prepare data dictionary
        data = {"conversation_id": conversation_id, "message_index": message_idx, "message_role": message_data['role'],
                "message_content": message_data['content'], "minio_files": minio_files, "opinion_flag": None,
                "delete_flag": 'N'}
        if user_id:
            data = add_creation_tracking(data, user_id)

        # insert into conversation_message_t
        stmt = insert(ConversationMessage).values(
            **data).returning(ConversationMessage.message_id)
        result = session.execute(stmt)
        message_id = result.scalar()
        return message_id


def create_message_units(message_units: List[Dict[str, Any]], message_id: int, conversation_id: int,
                         user_id: Optional[str] = None) -> List[int]:
    """
    Batch create message unit records

    Args:
        message_units: List of message units, each containing:
            - type: Unit type
            - content: Unit content
        message_id: Message ID (integer)
        conversation_id: Conversation ID (integer)
        user_id: Reserved parameter for created_by and updated_by fields

    Returns:
        List[int]: List of newly created unit IDs
    """
    if not message_units:
        return []  # No message units, return empty list

    with get_db_session() as session:
        # Ensure IDs are integer type
        message_id = int(message_id)
        conversation_id = int(conversation_id)

        # Create units one by one to get unit_ids
        unit_ids = []
        for idx, unit in enumerate(message_units):
            # Basic data
            row_data = {
                "message_id": message_id,
                "conversation_id": conversation_id,
                "unit_index": idx,
                "unit_type": unit['type'],
                "unit_content": unit['content'],
                "delete_flag": 'N'
            }

            if user_id:
                row_data["created_by"] = user_id
                row_data["updated_by"] = user_id

            # Insert and get unit_id
            stmt = insert(ConversationMessageUnit).values(
                **row_data).returning(ConversationMessageUnit.unit_id)
            result = session.execute(stmt)
            unit_id = result.scalar_one()
            unit_ids.append(unit_id)

        return unit_ids


def get_conversation(conversation_id: int, user_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """
    Get conversation details

    Args:
        conversation_id: Conversation ID (integer)
        user_id: Reserved parameter for created_by and updated_by fields

    Returns:
        Optional[Dict[str, Any]]: Conversation details, or None if it doesn't exist
    """
    with get_db_session() as session:
        # Ensure conversation_id is integer type
        conversation_id = int(conversation_id)

        # Build the query statement
        stmt = select(ConversationRecord).where(
            ConversationRecord.conversation_id == conversation_id,
            ConversationRecord.delete_flag == 'N'
        )

        if user_id:
            stmt = stmt.where(
                ConversationRecord.created_by == user_id
            )

        # Execute the query
        record = session.scalars(stmt).first()
        return None if record is None else as_dict(record)


def get_conversation_messages(conversation_id: int) -> List[Dict[str, Any]]:
    """
    Get all messages in a conversation

    Args:
        conversation_id: Conversation ID (integer)

    Returns:
        List[Dict[str, Any]]: List of messages, sorted by message_index
    """
    with get_db_session() as session:
        # Ensure conversation_id is of integer type
        conversation_id = int(conversation_id)

        # Build the query statement
        stmt = select(ConversationMessage).where(
            ConversationMessage.conversation_id == conversation_id,
            ConversationMessage.delete_flag == 'N'
        ).order_by(asc(ConversationMessage.message_index))

        # Execute the query
        records = session.scalars(stmt).all()

        # Convert SQLAlchemy model instances to dictionaries
        return list(map(as_dict, records))


def get_message_units(message_id: int) -> List[Dict[str, Any]]:
    """
    Get all units of a message

    Args:
        message_id: Message ID (integer)

    Returns:
        List[Dict[str, Any]]: List of message units, sorted by unit_index
    """
    with get_db_session() as session:
        # Ensure message_id is integer type
        message_id = int(message_id)

        # Build the query statement
        stmt = select(ConversationMessageUnit).where(
            ConversationMessageUnit.message_id == message_id,
            ConversationMessageUnit.delete_flag == 'N'
        ).order_by(asc(ConversationMessageUnit.unit_index))

        # Execute the query
        records = session.scalars(stmt).all()

        # Convert SQLAlchemy model instances to dictionaries
        return list(map(as_dict, records))


def get_conversation_list(
    user_id: Optional[str] = None, 
    portal_type: Optional[str] = None,
    patient_id: Optional[int] = None,
    status: Optional[str] = None,
    tags: Optional[List[str]] = None,
    data_range: Optional[str] = None,
    include_archived: bool = False,
    ) -> List[Dict[str, Any]]:
     """
     Get list of all undeleted conversations with enhanced filtering options
 
     Args:
        user_id: Filter conversations created by this user
        portal_type: Portal type filter ('doctor', 'student', 'patient', 'admin', or 'general')
        patient_id: Filter by linked patient ID
        status: Filter by conversation status
        tags: Filter by tags (conversations must have any of these tags)
        date_range: Time range filter ('today', 'this_week', 'this_month', 'archived')
        include_archived: Whether to include archived conversations (default False)
 
     Returns:
        List[Dict[str, Any]]: List of conversations with all fields including patient info, status, tags, summary
     """

     with get_db_session() as session:
        # Build the query statement
        stmt = select(
            ConversationRecord.conversation_id,
            ConversationRecord.conversation_title,
            ConversationRecord.portal_type,
            ConversationRecord.patient_id,
            ConversationRecord.patient_name,
            ConversationRecord.conversation_status,
            ConversationRecord.tags,
            ConversationRecord.summary,
            (func.extract('epoch', ConversationRecord.archived_at) * 1000).label('archived_at'),
            ConversationRecord.archived_to_timeline,
            (func.extract('epoch', ConversationRecord.create_time)
             * 1000).label('create_time'),
            (func.extract('epoch', ConversationRecord.update_time)
             * 1000).label('update_time')
        ).where(
            ConversationRecord.delete_flag == 'N'
        )

        # If user_id is provided, additional filter conditions can be added here
        if user_id:
            stmt = stmt.where(ConversationRecord.created_by == user_id)

        # Filter by portal type if provided
        if portal_type:
            stmt = stmt.where(ConversationRecord.portal_type == portal_type)

       # Patient filter
        if patient_id is not None:
            stmt = stmt.where(ConversationRecord.patient_id == patient_id)
 
        # Status filter
        if status:
            stmt = stmt.where(ConversationRecord.conversation_status == status)
 
        # Tags filter - check if conversation has any of the specified tags
        if tags and len(tags) > 0:
            # Use overlap operator for array overlap check
            stmt = stmt.where(ConversationRecord.tags.overlap(tags))
 
        # Archived filter
        if not include_archived:
            stmt = stmt.where(ConversationRecord.conversation_status != 'archived')
 
        # Date range filter
        if data_range:
            from datetime import datetime, timedelta
            now = datetime.now()

            if data_range == 'today':
                start_of_day = now.replace(hour=0, minute=0, second=0, microsecond=0)
                stmt = stmt.where(ConversationRecord.create_time >= start_of_day)
            elif data_range == 'this_week':
                start_of_week = now - timedelta(days=now.weekday())
                start_of_week = start_of_week.replace(hour=0, minute=0, second=0, microsecond=0)
                stmt = stmt.where(ConversationRecord.create_time >= start_of_week)
            elif data_range == 'this_month':
                start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
                stmt = stmt.where(ConversationRecord.create_time >= start_of_month)
            elif data_range == 'archived':
                stmt = stmt.where(ConversationRecord.conversation_status == 'archived')
 
        # Order by update time descending
        stmt = stmt.order_by(desc(ConversationRecord.update_time))

        # Execute the query
        records = session.execute(stmt)

        # Convert query results to a list of dictionaries and ensure timestamps are integers
        result = []
        for record in records:
            conversation = as_dict(record)
            conversation['create_time'] = int(conversation['create_time']) if conversation.get('create_time') else 0
            conversation['update_time'] = int(conversation['update_time']) if conversation.get('update_time') else 0
            # Convert archived_at to timestamp if present (already extracted in SQL)
            if conversation.get('archived_at') is not None:
                conversation['archived_at'] = int(conversation['archived_at'])
            # Ensure tags is a list
            if not conversation.get('tags'):
                conversation['tags'] = []
            result.append(conversation)

        return result


def rename_conversation(conversation_id: int, new_title: str, user_id: Optional[str] = None) -> bool:
    """
    Rename a conversation

    Args:
        conversation_id: Conversation ID (integer)
        new_title: New conversation title
        user_id: Reserved parameter for updated_by field

    Returns:
        bool: Whether the operation was successful
    """
    with get_db_session() as session:
        # Ensure conversation_id is of integer type
        conversation_id = int(conversation_id)

        # Prepare update data
        update_data = {
            "conversation_title": new_title,
            "update_time": func.current_timestamp()
        }
        if user_id:
            update_data = add_update_tracking(update_data, user_id)

        # Build the update statement
        stmt = update(ConversationRecord).where(
            ConversationRecord.conversation_id == conversation_id,
            ConversationRecord.delete_flag == 'N'
        ).values(update_data)

        # Execute the update statement
        result = session.execute(stmt)

        # Check if any rows were affected
        return result.rowcount > 0


def delete_conversation(conversation_id: int, user_id: Optional[str] = None) -> bool:
    """
    Delete a conversation (soft delete)

    Args:
        conversation_id: Conversation ID (integer)
        user_id: Reserved parameter for updated_by field

    Returns:
        bool: Whether the operation was successful
    """
    with get_db_session() as session:
        # Ensure conversation_id is of integer type
        conversation_id = int(conversation_id)

        # Prepare update data
        update_data = {
            "delete_flag": 'Y',
            "update_time": func.current_timestamp()
        }
        if user_id:
            update_data = add_update_tracking(update_data, user_id)

        # 1. Mark conversation as deleted
        conversation_stmt = update(ConversationRecord).where(
            ConversationRecord.conversation_id == conversation_id,
            ConversationRecord.delete_flag == 'N'
        ).values(update_data)
        conversation_result = session.execute(conversation_stmt)

        # 2. Mark related messages as deleted
        message_stmt = update(ConversationMessage).where(
            ConversationMessage.conversation_id == conversation_id,
            ConversationMessage.delete_flag == 'N'
        ).values(update_data)
        session.execute(message_stmt)

        # 3. Mark message units as deleted
        unit_stmt = update(ConversationMessageUnit).where(
            ConversationMessageUnit.conversation_id == conversation_id,
            ConversationMessageUnit.delete_flag == 'N'
        ).values(update_data)
        session.execute(unit_stmt)

        # 4. Mark search sources as deleted
        search_stmt = update(ConversationSourceSearch).where(
            ConversationSourceSearch.conversation_id == conversation_id,
            ConversationSourceSearch.delete_flag == 'N'
        ).values(update_data)
        session.execute(search_stmt)

        # 5. Mark image sources as deleted
        image_stmt = update(ConversationSourceImage).where(
            ConversationSourceImage.conversation_id == conversation_id,
            ConversationSourceImage.delete_flag == 'N'
        ).values(update_data)
        session.execute(image_stmt)

        # Check if the conversation record was affected
        return conversation_result.rowcount > 0


def soft_delete_all_conversations_by_user(user_id: str) -> int:
    """
    Soft-delete all conversations and related records created by a user.

    Returns the number of conversations marked as deleted.
    """
    with get_db_session() as session:
        update_data = {
            "delete_flag": 'Y',
            "update_time": func.current_timestamp()
        }

        # 1) Find all conversation ids created by the user
        conv_ids = session.scalars(
            select(ConversationRecord.conversation_id).where(
                ConversationRecord.delete_flag == 'N',
                ConversationRecord.created_by == user_id,
            )
        ).all()

        if not conv_ids:
            return 0

        # 2) Mark conversations as deleted
        session.execute(
            update(ConversationRecord)
            .where(ConversationRecord.conversation_id.in_(conv_ids), ConversationRecord.delete_flag == 'N')
            .values(update_data)
        )

        # 3) Mark messages as deleted
        session.execute(
            update(ConversationMessage)
            .where(ConversationMessage.conversation_id.in_(conv_ids), ConversationMessage.delete_flag == 'N')
            .values(update_data)
        )

        # 4) Mark message units as deleted
        session.execute(
            update(ConversationMessageUnit)
            .where(ConversationMessageUnit.conversation_id.in_(conv_ids), ConversationMessageUnit.delete_flag == 'N')
            .values(update_data)
        )

        # 5) Mark search sources as deleted
        session.execute(
            update(ConversationSourceSearch)
            .where(ConversationSourceSearch.conversation_id.in_(conv_ids), ConversationSourceSearch.delete_flag == 'N')
            .values(update_data)
        )

        # 6) Mark image sources as deleted
        session.execute(
            update(ConversationSourceImage)
            .where(ConversationSourceImage.conversation_id.in_(conv_ids), ConversationSourceImage.delete_flag == 'N')
            .values(update_data)
        )

        return len(conv_ids)


def update_message_opinion(message_id: int, opinion: str, user_id: Optional[str] = None) -> bool:
    """
    Update message like/dislike status

    Args:
        message_id: Message ID (integer)
        opinion: Opinion flag, 'Y' for like, 'N' for dislike, None for no opinion
        user_id: Reserved parameter for updated_by field

    Returns:
        bool: Whether the operation was successful
    """
    with get_db_session() as session:
        # Ensure message_id is of integer type
        message_id = int(message_id)

        # Prepare update data
        update_data = {
            "opinion_flag": opinion,
            # Use the database's CURRENT_TIMESTAMP function
            "update_time": func.current_timestamp()
        }
        if user_id:
            update_data = add_update_tracking(update_data, user_id)

        # Build the update statement
        stmt = update(ConversationMessage).where(
            ConversationMessage.message_id == message_id,
            ConversationMessage.delete_flag == 'N'
        ).values(update_data)

        # Execute the update statement
        result = session.execute(stmt)

        # Check if any rows were affected
        return result.rowcount > 0


def get_conversation_history(conversation_id: int, user_id: Optional[str] = None) -> Optional[ConversationHistory]:
    """
    Get complete conversation history, including all messages and message units' raw data

    Args:
        conversation_id: Conversation ID (integer)
        user_id: Reserved parameter for created_by and updated_by fields

    Returns:
        Optional[ConversationHistory]: Contains basic conversation information and raw data of all messages and message units
    """
    with get_db_session() as session:
        # Ensure conversation_id is of integer type
        conversation_id = int(conversation_id)

        # First check if conversation exists
        check_stmt = select(
            ConversationRecord.conversation_id,
            (func.extract('epoch', ConversationRecord.create_time)
             * 1000).label('create_time')
        ).where(
            ConversationRecord.conversation_id == conversation_id,
            ConversationRecord.delete_flag == 'N'
        )
        if user_id:
            check_stmt = check_stmt.where(
                ConversationRecord.created_by == user_id)

        conversation = session.execute(check_stmt).first()

        if not conversation:
            return None

        conversation = as_dict(conversation)

        subquery = select(
            # Move the order_by to the json_agg function
            func.json_agg(
                func.json_build_object(
                    'unit_id', ConversationMessageUnit.unit_id,
                    'unit_type', ConversationMessageUnit.unit_type,
                    'unit_content', ConversationMessageUnit.unit_content
                )
            )
        ).select_from(
            ConversationMessageUnit
        ).where(
            ConversationMessageUnit.message_id == ConversationMessage.message_id,
            ConversationMessageUnit.delete_flag == 'N',
            ConversationMessageUnit.unit_type is not None
        ).scalar_subquery()

        query = select(
            ConversationMessage.message_id,
            ConversationMessage.message_index,
            ConversationMessage.message_role.label('role'),
            ConversationMessage.message_content,
            ConversationMessage.minio_files,
            ConversationMessage.opinion_flag,
            subquery.label('units')
        ).where(
            ConversationMessage.conversation_id == conversation_id,

            ConversationMessage.delete_flag == 'N'
        ).order_by(ConversationMessage.message_index)

        message_records = session.execute(query).all()

        # Get search data
        search_stmt = select(ConversationSourceSearch).where(
            ConversationSourceSearch.conversation_id == conversation_id,
            ConversationSourceSearch.delete_flag == 'N'
        ).order_by(ConversationSourceSearch.search_id)
        search_records = session.scalars(search_stmt).all()

        # Get image data
        image_stmt = select(ConversationSourceImage).where(
            ConversationSourceImage.conversation_id == conversation_id,
            ConversationSourceImage.delete_flag == 'N'
        )
        image_records = session.scalars(image_stmt).all()

        # Integrate message and unit data
        message_list = []
        for record in message_records:
            message_data = as_dict(record)

            # Ensure units field is empty list instead of None
            if message_data['units'] is None:
                message_data['units'] = []

            # Process minio_files field - if it's a JSON string, parse it into Python object
            if message_data.get('minio_files'):
                try:
                    if isinstance(message_data['minio_files'], str):
                        message_data['minio_files'] = json.loads(
                            message_data['minio_files'])
                except (json.JSONDecodeError, TypeError):
                    # If parsing fails, keep original value
                    pass

            message_list.append(message_data)

        return {
            'conversation_id': conversation['conversation_id'],
            'create_time': int(conversation['create_time']),
            'message_records': message_list,
            'search_records': [as_dict(record) for record in search_records],
            'image_records': [as_dict(record) for record in image_records]
        }


def create_source_image(image_data: Dict[str, Any], user_id: Optional[str] = None) -> int:
    """
    Create image source reference

    Args:
        image_data: Dictionary containing image data, must include the following fields:
            - message_id: Message ID (integer)
            - image_url: Image URL
        user_id: Reserved parameter for created_by and updated_by fields

    Returns:
        int: Newly created image ID (auto-increment ID)
    """
    with get_db_session() as session:
        # Ensure message_id is of integer type
        message_id = int(image_data['message_id'])

        # Prepare data dictionary
        data = {
            "message_id": message_id,
            "conversation_id": image_data.get('conversation_id'),
            "image_url": image_data['image_url'],
            "delete_flag": 'N',
            # Use the database's CURRENT_TIMESTAMP function
            "create_time": func.current_timestamp()
        }

        if user_id:
            data = add_creation_tracking(data, user_id)

        # Build the insert statement and return the newly created image ID
        stmt = insert(ConversationSourceImage).values(
            **data).returning(ConversationSourceImage.image_id)

        # Execute the insert statement
        result = session.execute(stmt)
        image_id = result.scalar_one()

        return image_id


def delete_source_image(image_id: int, user_id: Optional[str] = None) -> bool:
    """
    Delete image source reference (soft delete)

    Args:
        image_id: Image ID (integer)
        user_id: Reserved parameter for updated_by field

    Returns:
        bool: Whether the operation was successful
    """
    with get_db_session() as session:
        # Ensure image_id is an integer
        image_id = int(image_id)

        # Prepare update data
        update_data = {
            "delete_flag": 'Y',
            # Use database's CURRENT_TIMESTAMP function
            "update_time": func.current_timestamp()
        }

        if user_id:
            update_data = add_update_tracking(update_data, user_id)

        # Build the update statement
        stmt = update(ConversationSourceImage).where(
            ConversationSourceImage.image_id == image_id,
            ConversationSourceImage.delete_flag == 'N'
        ).values(update_data)

        # Execute the update statement
        result = session.execute(stmt)

        # Check if any rows were affected
        return result.rowcount > 0


def get_source_images_by_message(message_id: int, user_id: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Get all associated image source information by message ID

    Args:
        message_id: Message ID
        user_id: Reserved parameter for filtering images created by this user

    Returns:
        List[Dict[str, Any]]: List of image source information
    """
    with get_db_session() as session:
        # Ensure message_id is an integer
        message_id = int(message_id)

        # Build the query using SQLAlchemy's ORM
        stmt = select(ConversationSourceImage).join(
            ConversationMessage, ConversationSourceImage.message_id == ConversationMessage.message_id
        ).join(
            ConversationRecord, ConversationMessage.conversation_id == ConversationRecord.conversation_id
        ).where(
            ConversationSourceImage.message_id == message_id,
            ConversationSourceImage.delete_flag == 'N'
        ).order_by(
            ConversationSourceImage.image_id
        )

        if user_id:
            stmt = stmt.where(ConversationRecord.created_by == user_id)

        # Execute the query
        image_records = session.scalars(stmt).all()

        # Convert SQLAlchemy model instances to dictionaries
        return [as_dict(record) for record in image_records]


def get_source_images_by_conversation(conversation_id: int, user_id: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Get all associated image source information by conversation ID

    Args:
        conversation_id: Conversation ID
        user_id: Current user ID, for filtering images created by this user

    Returns:
        List[Dict[str, Any]]: List of image source information
    """
    with get_db_session() as session:
        # Ensure conversation_id is an integer
        conversation_id = int(conversation_id)

        # Build the query
        stmt = select(ConversationSourceImage).join(
            ConversationRecord, ConversationSourceImage.conversation_id == ConversationRecord.conversation_id
        ).where(
            ConversationSourceImage.conversation_id == conversation_id,
            ConversationSourceImage.delete_flag == 'N'
        ).order_by(
            ConversationSourceImage.image_id
        )

        if user_id:
            stmt = stmt.where(ConversationRecord.created_by == user_id)

        # Execute the query
        image_records = session.scalars(stmt).all()

        # Convert SQLAlchemy model instances to dictionaries
        return [as_dict(record) for record in image_records]


def create_source_search(search_data: Dict[str, Any], user_id: Optional[str] = None) -> int:
    """
    Create search source reference

    Args:
        search_data: Dictionary containing search data, must include the following fields:
            - message_id: Message ID (integer)
            - source_type: Source type
            - source_title: Source title
            - source_location: Source location/URL
            - source_content: Source content
            - cite_index: Index number
            - search_type: Source tool
            - tool_sign: Source tool simple identifier, used for summary differentiation
            Optional fields:
            - unit_id: Message unit ID (integer)
            - score_overall: Overall relevance score
            - score_accuracy: Accuracy score
            - score_semantic: Semantic relevance score
            - published_date: Publication date
        user_id: Reserved parameter for created_by and updated_by fields

    Returns:
        int: Newly created search ID (auto-increment ID)
    """
    with get_db_session() as session:
        # Ensure message_id is an integer
        message_id = int(search_data['message_id'])

        # Prepare basic data dictionary
        data = {
            "message_id": message_id,
            "conversation_id": search_data.get('conversation_id'),
            "source_type": search_data['source_type'],
            "source_title": search_data['source_title'],
            "source_location": search_data['source_location'],
            "source_content": search_data['source_content'],
            "cite_index": search_data['cite_index'],
            "search_type": search_data['search_type'],
            "tool_sign": search_data['tool_sign'],
            "delete_flag": 'N',
            # Use the database's CURRENT_TIMESTAMP function
            "create_time": func.current_timestamp()
        }

        # Add unit_id if provided
        if 'unit_id' in search_data and search_data['unit_id'] is not None:
            data["unit_id"] = int(search_data['unit_id'])

        # Add optional fields
        if 'score_overall' in search_data:
            data["score_overall"] = search_data['score_overall']
        if 'score_accuracy' in search_data:
            data["score_accuracy"] = search_data['score_accuracy']
        if 'score_semantic' in search_data:
            data["score_semantic"] = search_data['score_semantic']
        if 'published_date' in search_data:
            data["published_date"] = search_data['published_date']
        if user_id:
            data = add_creation_tracking(data, user_id)

        # Build the insert statement and return the newly created search ID
        stmt = insert(ConversationSourceSearch).values(
            **data).returning(ConversationSourceSearch.search_id)

        # Execute the insert statement
        result = session.execute(stmt)
        search_id = result.scalar_one()

        return search_id


def delete_source_search(search_id: int, user_id: Optional[str] = None) -> bool:
    """
    Delete search source reference (soft delete)

    Args:
        search_id: Search ID (integer)
        user_id: Reserved parameter for updated_by field

    Returns:
        bool: Whether the operation was successful
    """
    with get_db_session() as session:
        # Ensure search_id is an integer
        search_id = int(search_id)

        # Prepare update data
        update_data = {
            "delete_flag": 'Y',
            # Use the database's CURRENT_TIMESTAMP function
            "update_time": func.current_timestamp()
        }
        if user_id:
            update_data = add_update_tracking(update_data, user_id)

        # Build the update statement
        stmt = update(ConversationSourceSearch).where(
            ConversationSourceSearch.search_id == search_id,
            ConversationSourceSearch.delete_flag == 'N'
        ).values(update_data)

        # Execute the update statement
        result = session.execute(stmt)

        # Check if any rows were affected
        return result.rowcount > 0


def get_source_searches_by_message(message_id: int, user_id: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Get all associated search source information by message ID

    Args:
        message_id: Message ID
        user_id: Reserved parameter for created_by and updated_by fields

    Returns:
        List[Dict[str, Any]]: List of search source information
    """
    with get_db_session() as session:
        # Ensure message_id is an integer
        message_id = int(message_id)

        # Build the query
        stmt = select(ConversationSourceSearch).join(
            ConversationMessage, ConversationSourceSearch.message_id == ConversationMessage.message_id
        ).join(
            ConversationRecord, ConversationMessage.conversation_id == ConversationRecord.conversation_id
        ).where(
            ConversationSourceSearch.message_id == message_id,
            ConversationSourceSearch.delete_flag == 'N'
        ).order_by(
            ConversationSourceSearch.search_id
        )

        if user_id:
            stmt = stmt.where(ConversationRecord.created_by == user_id)

        # Execute the query
        search_records = session.scalars(stmt).all()

        # Convert SQLAlchemy model instances to dictionaries
        return [as_dict(record) for record in search_records]


def get_source_searches_by_conversation(conversation_id: int, user_id: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Get all associated search source information by conversation ID

    Args:
        conversation_id: Conversation ID
        user_id: Reserved parameter for filtering search content created by this user

    Returns:
        List[Dict[str, Any]]: List of search source information
    """
    with get_db_session() as session:
        # Convert conversation_id to integer
        conversation_id = int(conversation_id)

        # Build the SQL query
        stmt = select(ConversationSourceSearch).join(
            ConversationRecord,
            ConversationSourceSearch.conversation_id == ConversationRecord.conversation_id
        ).where(
            ConversationSourceSearch.conversation_id == conversation_id,
            ConversationSourceSearch.delete_flag == 'N'
        ).order_by(
            ConversationSourceSearch.search_id
        )

        if user_id:
            stmt = stmt.where(ConversationRecord.created_by == user_id)

        # Execute the query and get all results
        search_records = session.scalars(stmt).all()

        # Convert SQLAlchemy objects to dictionaries
        return [as_dict(record) for record in search_records]


def get_message(message_id: int, user_id: Optional[str] = None) -> Dict[str, Any]:
    """
    Get message details by message ID

    Args:
        message_id: Message ID
        user_id: Reserved parameter for created_by and updated_by fields

    Returns:
        Dict[str, Any]: Message details
    """
    with get_db_session() as session:
        # Ensure message_id is an integer
        message_id = int(message_id)

        # Build the query
        stmt = select(ConversationMessage).join(
            ConversationRecord, ConversationMessage.conversation_id == ConversationRecord.conversation_id
        ).where(
            ConversationMessage.message_id == message_id,
            ConversationMessage.delete_flag == 'N'
        )

        if user_id:
            stmt = stmt.where(ConversationRecord.created_by == user_id)

        # Execute the query and get the first result
        record = session.scalars(stmt).first()

        # Convert the SQLAlchemy object to a dictionary if it exists
        return as_dict(record) if record else None


def get_message_id_by_index(conversation_id: int, message_index: int) -> Optional[int]:
    """
    Get message ID by conversation ID and message index

    Args:
        conversation_id: Conversation ID (integer)
        message_index: Message index (integer)

    Returns:
        Optional[int]: Message ID if found, None otherwise
    """
    with get_db_session() as session:
        # Ensure input parameters are integers
        conversation_id = int(conversation_id)
        message_index = int(message_index)

        # Build the query
        stmt = select(ConversationMessage.message_id).where(
            ConversationMessage.conversation_id == conversation_id,
            ConversationMessage.message_index == message_index,
            ConversationMessage.delete_flag == 'N'
        )

        # Execute the query and get the first result
        result = session.execute(stmt).scalar()

        return result



# ============================================================================
# Patient Linking and Status Management Functions
# ============================================================================
 
def link_conversation_to_patient(conversation_id: int, patient_id: Optional[int], patient_name: Optional[str], user_id: str) -> bool:
    """
    Link or unlink a conversation to a patient
 
    Args:
        conversation_id: Conversation ID
        patient_id: Patient ID (None to unlink)
        patient_name: Patient name (None to unlink)
        user_id: User ID performing the action
 
    Returns:
        bool: True if successful
    """
    with get_db_session() as session:
        conversation = session.query(ConversationRecord).filter(
            ConversationRecord.conversation_id == conversation_id,
            ConversationRecord.delete_flag == 'N'
        ).first()
 
        if not conversation:
            raise ValueError(f"Conversation {conversation_id} not found")
 
        conversation.patient_id = patient_id
        conversation.patient_name = patient_name
        conversation.updated_by = user_id
 
        session.commit()
        logger.info(f"Conversation {conversation_id} {'linked to' if patient_id else 'unlinked from'} patient {patient_id}")
        return True
 
 
def update_conversation_status(conversation_id: int, status: str, user_id: str) -> bool:
    """
    Update conversation status
 
    Args:
        conversation_id: Conversation ID
        status: New status (active/pending_followup/difficult_case/completed/archived)
        user_id: User ID performing the action
 
    Returns:
        bool: True if successful
    """
    valid_statuses = ['active', 'pending_followup', 'difficult_case', 'completed', 'archived']
    if status not in valid_statuses:
        raise ValueError(f"Invalid status: {status}. Must be one of {valid_statuses}")
 
    with get_db_session() as session:
        conversation = session.query(ConversationRecord).filter(
            ConversationRecord.conversation_id == conversation_id,
            ConversationRecord.delete_flag == 'N'
        ).first()
 
        if not conversation:
            raise ValueError(f"Conversation {conversation_id} not found")
 
        conversation.conversation_status = status
        conversation.updated_by = user_id
 
        # If archiving, set archived_at timestamp
        if status == 'archived' and conversation.archived_at is None:
            conversation.archived_at = func.now()
 
        session.commit()
        logger.info(f"Conversation {conversation_id} status updated to {status}")
        return True
 
 
def update_conversation_tags(conversation_id: int, tags: List[str], user_id: str) -> bool:
    """
    Update conversation tags
 
    Args:
        conversation_id: Conversation ID
        tags: List of tag strings
        user_id: User ID performing the action
 
    Returns:
        bool: True if successful
    """
    with get_db_session() as session:
        conversation = session.query(ConversationRecord).filter(
            ConversationRecord.conversation_id == conversation_id,
            ConversationRecord.delete_flag == 'N'
        ).first()
 
        if not conversation:
            raise ValueError(f"Conversation {conversation_id} not found")
 
        conversation.tags = tags
        conversation.updated_by = user_id
 
        session.commit()
        logger.info(f"Conversation {conversation_id} tags updated: {tags}")
        return True
 
 
def update_conversation_summary(conversation_id: int, summary: str, user_id: str) -> bool:
    """
    Update conversation summary
 
    Args:
        conversation_id: Conversation ID
        summary: Summary text
        user_id: User ID performing the action
 
    Returns:
        bool: True if successful
    """
    with get_db_session() as session:
        conversation = session.query(ConversationRecord).filter(
            ConversationRecord.conversation_id == conversation_id,
            ConversationRecord.delete_flag == 'N'
        ).first()
 
        if not conversation:
            raise ValueError(f"Conversation {conversation_id} not found")
 
        conversation.summary = summary
        conversation.updated_by = user_id
 
        session.commit()
        logger.info(f"Conversation {conversation_id} summary updated")
        return True
 
 
def archive_conversation(conversation_id: int, archive_to_timeline: bool, user_id: str) -> bool:
    """
    Archive a conversation
 
    Args:
        conversation_id: Conversation ID
        archive_to_timeline: Whether to mark as archived to patient timeline
        user_id: User ID performing the action
 
    Returns:
        bool: True if successful
    """
    with get_db_session() as session:
        conversation = session.query(ConversationRecord).filter(
            ConversationRecord.conversation_id == conversation_id,
            ConversationRecord.delete_flag == 'N'
        ).first()
 
        if not conversation:
            raise ValueError(f"Conversation {conversation_id} not found")
 
        conversation.conversation_status = 'archived'
        conversation.archived_at = func.now()
        conversation.archived_to_timeline = archive_to_timeline
        conversation.updated_by = user_id
 
        session.commit()
        logger.info(f"Conversation {conversation_id} archived (to_timeline={archive_to_timeline})")
        return True

 
def batch_archive_conversations(conversation_ids: List[int], archive_to_timeline: bool, user_id: str) -> int:
    """
    Batch archive multiple conversations
 
    Args:
        conversation_ids: List of conversation IDs
        archive_to_timeline: Whether to mark as archived to patient timeline
        user_id: User ID performing the action
 
    Returns:
        int: Number of conversations archived
    """
    with get_db_session() as session:
        updated = session.query(ConversationRecord).filter(
            ConversationRecord.conversation_id.in_(conversation_ids),
            ConversationRecord.delete_flag == 'N'
        ).update(
            {
                ConversationRecord.conversation_status: 'archived',
                ConversationRecord.archived_at: func.now(),
                ConversationRecord.archived_to_timeline: archive_to_timeline,
                ConversationRecord.updated_by: user_id
            },
            synchronize_session=False
        )
 
        session.commit()
        logger.info(f"Batch archived {updated} conversations")
        return updated
 
 
def get_patient_conversations(patient_id: int, user_id: str, status: Optional[str] = None, include_archived: bool = False) -> List[dict]:
    """
    Get all conversations for a specific patient
 
    Args:
        patient_id: Patient ID
        user_id: User ID (for access control)
        status: Optional status filter
        include_archived: Whether to include archived conversations
 
    Returns:
        List[dict]: List of conversation dictionaries
    """
    with get_db_session() as session:
        query = session.query(ConversationRecord).filter(
            ConversationRecord.patient_id == patient_id,
            ConversationRecord.created_by == user_id,
            ConversationRecord.delete_flag == 'N'
        )
 
        if status:
            query = query.filter(ConversationRecord.conversation_status == status)
 
        if not include_archived:
            query = query.filter(ConversationRecord.conversation_status != 'archived')
 
        query = query.order_by(ConversationRecord.create_time.desc())
 
        conversations = query.all()
 
        return [as_dict(conv) for conv in conversations]