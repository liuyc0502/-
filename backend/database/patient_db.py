
import logging
from typing import List, Dict, Optional
from sqlalchemy import and_, or_
from database.client import get_db_session, as_dict
from database.db_models import (
    PatientInfo, PatientTimeline, PatientTimelineDetail,
    PatientMedicalImage, PatientMetrics, PatientAttachment, PatientTodo,
    PatientImageAnnotation, PatientImageAnalysis
)
 
logger = logging.getLogger(__name__)
 
 
# ============================================================================
# Patient Basic Info Operations
# ============================================================================
 
def create_patient(patient_data: dict, tenant_id: str, user_id: str) -> dict:
    """
    Create a new patient record
    """
    with get_db_session() as session:
        new_patient = PatientInfo(
            name=patient_data.get('name'),
            gender=patient_data.get('gender'),
            age=patient_data.get('age'),
            date_of_birth=patient_data.get('date_of_birth'),
            medical_record_no=patient_data.get('medical_record_no'),
            email=patient_data.get('email'),
            phone=patient_data.get('phone'),
            address=patient_data.get('address'),
            allergies=patient_data.get('allergies', []),
            family_history=patient_data.get('family_history'),
            past_medical_history=patient_data.get('past_medical_history', []),
            diagnosis=patient_data.get('diagnosis'),
            tenant_id=tenant_id,
            created_by=user_id,
            updated_by=user_id,
            delete_flag='N'
        )
        session.add(new_patient)
        session.flush()
 
        patient_id = new_patient.patient_id
        session.commit()
 
        logger.info(f"Created patient: {patient_id}")
        return {"patient_id": patient_id}


def get_patient_by_id(patient_id: int, tenant_id: str) -> Optional[dict]:
    """
    Get patient by ID
    """
    with get_db_session() as session:
        patient = session.query(PatientInfo).filter(
            PatientInfo.patient_id == patient_id,
            PatientInfo.tenant_id == tenant_id,
        ).first()
        if patient:
            return as_dict(patient)
        return None


def get_patient_by_email(email: str, tenant_id: str) -> Optional[dict]:
    """
    Get patient by email address
    """
    with get_db_session() as session:
        patient = session.query(PatientInfo).filter(
            PatientInfo.email == email,
            PatientInfo.tenant_id == tenant_id,
        ).first()
        if patient:
            return as_dict(patient)
        return None

def get_patient_by_medical_record_no(medical_record_no: str, tenant_id: str) -> Optional[dict]:
    """
    Get patient by medical record number
    """
    with get_db_session() as session:
        patient = session.query(PatientInfo).filter(
            PatientInfo.medical_record_no == medical_record_no,
            PatientInfo.tenant_id == tenant_id,
        ).first()
        if patient:
            return as_dict(patient)
        return None


def list_patients(tenant_id: str, search_query: Optional[str] = None,
                 filter_type: Optional[str] = None, limit: int = 100, offset: int = 0) -> List[dict]:
    """
    List patients with optional search and filters
    """
    with get_db_session() as session:
        query = session.query(PatientInfo).filter(
            PatientInfo.tenant_id == tenant_id,
            PatientInfo.delete_flag != 'Y'
        )
        # Apply search query
        if search_query:
            search_pattern = f"%{search_query}%"
            query = query.filter(
                or_(
                    PatientInfo.name.ilike(search_pattern),
                    PatientInfo.medical_record_no.ilike(search_pattern)
                )
            )
        # Apply filters (can be extended based on needs)
        # filter_type: recent/pending/difficult etc.
        patients = query.order_by(PatientInfo.create_time.desc()).limit(limit).offset(offset).all()
        return [as_dict(p) for p in patients]


def update_patient(patient_id: int, patient_data: dict, tenant_id: str, user_id: str) -> bool:
    """
    Update patient information
    """
    with get_db_session() as session:
        patient = session.query(PatientInfo).filter(
            PatientInfo.patient_id == patient_id,
            PatientInfo.tenant_id == tenant_id,
            PatientInfo.delete_flag != 'Y'
        ).first()
        if not patient:
            return False
 
        # Update fields
        for key, value in patient_data.items():
            if hasattr(patient, key) and value is not None:
                setattr(patient, key, value)
 
        patient.updated_by = user_id
        session.commit()
 
        logger.info(f"Updated patient: {patient_id}")
        return True
 
 
def delete_patient(patient_id: int, tenant_id: str, user_id: str) -> bool:
    """
    Hard delete patient record from database
    """
    with get_db_session() as session:
        patient = session.query(PatientInfo).filter(
            PatientInfo.patient_id == patient_id,
            PatientInfo.tenant_id == tenant_id
        ).first()
 
        if not patient:
            return False
 
        session.delete(patient)
        session.commit()
 
        logger.info(f"Hard deleted patient: {patient_id}")
        return True
 
 
# ============================================================================
# Patient Timeline Operations
# ============================================================================
 
def create_timeline_stage(timeline_data: dict, tenant_id: str, user_id: str) -> dict:
    """
    Create a new timeline stage
    """
    with get_db_session() as session:
        new_timeline = PatientTimeline(
            patient_id=timeline_data.get('patient_id'),
            stage_type=timeline_data.get('stage_type'),
            stage_date=timeline_data.get('stage_date'),
            stage_title=timeline_data.get('stage_title'),
            diagnosis=timeline_data.get('diagnosis'),
            status=timeline_data.get('status', 'pending'),
            display_order=timeline_data.get('display_order', 0),
            tenant_id=tenant_id,
            created_by=user_id,
            updated_by=user_id,
            delete_flag='N'
        )
        session.add(new_timeline)
        session.flush()

        timeline_id = new_timeline.timeline_id
        session.commit()
 
        logger.info(f"Created timeline stage: {timeline_id} for patient: {timeline_data.get('patient_id')}")
        return {"timeline_id": timeline_id}
 
 
def get_patient_timeline(patient_id: int, tenant_id: str) -> List[dict]:
    """
    Get all timeline stages for a patient by patient ID
    """
    with get_db_session() as session:
        timelines = session.query(PatientTimeline).filter(
            PatientTimeline.patient_id == patient_id,
            PatientTimeline.tenant_id == tenant_id,
            PatientTimeline.delete_flag != 'Y'
        ).order_by(PatientTimeline.display_order.asc(), PatientTimeline.stage_date.asc()).all()
 
        return [as_dict(t) for t in timelines]
 
 
def get_timeline_detail(timeline_id: int, tenant_id: str) -> Optional[dict]:
    """
    Get timeline detail information
    """
    with get_db_session() as session:
        # Get timeline basic info
        timeline = session.query(PatientTimeline).filter(
            PatientTimeline.timeline_id == timeline_id,
            PatientTimeline.tenant_id == tenant_id,
            PatientTimeline.delete_flag != 'Y'
        ).first()
 
        if not timeline:
            return None
 
        timeline_dict = as_dict(timeline)
 
        # Get detail info
        detail = session.query(PatientTimelineDetail).filter(
            PatientTimelineDetail.timeline_id == timeline_id,
            PatientTimelineDetail.tenant_id == tenant_id,
            PatientTimelineDetail.delete_flag != 'Y'
        ).first()
 
        if detail:
            timeline_dict['detail'] = as_dict(detail)
        # Get images
        images = session.query(PatientMedicalImage).filter(
            PatientMedicalImage.timeline_id == timeline_id,
            PatientMedicalImage.tenant_id == tenant_id,
            PatientMedicalImage.delete_flag != 'Y'
        ).order_by(PatientMedicalImage.display_order.asc()).all()
        timeline_dict['images'] = [as_dict(img) for img in images]
        # Get metrics
        metrics = session.query(PatientMetrics).filter(
            PatientMetrics.timeline_id == timeline_id,
            PatientMetrics.tenant_id == tenant_id,
            PatientMetrics.delete_flag != 'Y'
        ).all()
        timeline_dict['metrics'] = [as_dict(m) for m in metrics]
 
        # Get attachments
        attachments = session.query(PatientAttachment).filter(
            PatientAttachment.timeline_id == timeline_id,
            PatientAttachment.tenant_id == tenant_id,
            PatientAttachment.delete_flag != 'Y'

        ).all()

        timeline_dict['attachments'] = [as_dict(a) for a in attachments]

        return timeline_dict
 
 
def create_timeline_detail(detail_data: dict, tenant_id: str, user_id: str) -> dict:
    """
    Create or update timeline detail information
    """
    with get_db_session() as session:
        timeline_id = detail_data.get('timeline_id')
 
        # Check if detail already exists
        existing_detail = session.query(PatientTimelineDetail).filter(
            PatientTimelineDetail.timeline_id == timeline_id,
            PatientTimelineDetail.tenant_id == tenant_id,
            PatientTimelineDetail.delete_flag != 'Y'
        ).first()
 
        if existing_detail:
            # Update existing detail
            existing_detail.doctor_notes = detail_data.get('doctor_notes', existing_detail.doctor_notes)
            existing_detail.pathology_findings = detail_data.get('pathology_findings', existing_detail.pathology_findings)
            existing_detail.medications = detail_data.get('medications', existing_detail.medications)
            existing_detail.patient_summary = detail_data.get('patient_summary', existing_detail.patient_summary)
            existing_detail.patient_suggestions = detail_data.get('patient_suggestions', existing_detail.patient_suggestions)
            existing_detail.updated_by = user_id
            detail_id = existing_detail.detail_id
        else:
            # Create new detail
            new_detail = PatientTimelineDetail(
                timeline_id=timeline_id,
                doctor_notes=detail_data.get('doctor_notes'),
                pathology_findings=detail_data.get('pathology_findings'),
                medications=detail_data.get('medications', []),
                patient_summary=detail_data.get('patient_summary'),
                patient_suggestions=detail_data.get('patient_suggestions', []),
                tenant_id=tenant_id,
                created_by=user_id,
                updated_by=user_id,
                delete_flag='N'
            )
            session.add(new_detail)
            session.flush()
            detail_id = new_detail.detail_id
 
        session.commit()
        logger.info(f"Created/Updated timeline detail: {detail_id} for timeline: {timeline_id}")
        return {"detail_id": detail_id}
 
 
# ============================================================================
# Medical Image Operations
# ============================================================================
 
def create_medical_image(image_data: dict, tenant_id: str, user_id: str) -> dict:
    """
    Create a medical image record
    """
    with get_db_session() as session:
        new_image = PatientMedicalImage(
            timeline_id=image_data.get('timeline_id'),
            image_type=image_data.get('image_type'),
            image_label=image_data.get('image_label'),
            image_url=image_data.get('image_url'),
            thumbnail_url=image_data.get('thumbnail_url'),
            display_order=image_data.get('display_order', 0),
            tenant_id=tenant_id,
            created_by=user_id,
            updated_by=user_id,
            delete_flag='N'
        )
        session.add(new_image)
        session.flush()
 
        image_id = new_image.image_id
        session.commit()
 
        logger.info(f"Created medical image: {image_id}")
        return {"image_id": image_id}
 
 
# ============================================================================
# Metrics Operations
# ============================================================================
 
def batch_create_metrics(metrics_data: List[dict], tenant_id: str, user_id: str) -> dict:
    """
    Batch create patient metrics
    """
    with get_db_session() as session:
        created_count = 0
        for metric_data in metrics_data:
            new_metric = PatientMetrics(
                timeline_id=metric_data.get('timeline_id'),
                metric_name=metric_data.get('metric_name'),
                metric_full_name=metric_data.get('metric_full_name'),
                metric_value=metric_data.get('metric_value'),
                metric_unit=metric_data.get('metric_unit'),
                metric_trend=metric_data.get('metric_trend'),
                metric_status=metric_data.get('metric_status'),
                normal_range_min=metric_data.get('normal_range_min'),
                normal_range_max=metric_data.get('normal_range_max'),
                percentage=metric_data.get('percentage', 0),
                tenant_id=tenant_id,
                created_by=user_id,
                updated_by=user_id,
                delete_flag='N'
            )
            session.add(new_metric)
            created_count += 1
 
        session.commit()
        logger.info(f"Created {created_count} metrics")
        return {"created_count": created_count}
 
 
# ============================================================================
# Patient Todo Operations
# ============================================================================
 
def create_patient_todo(todo_data: dict, tenant_id: str, user_id: str) -> dict:
    """
    Create a patient todo item
    """
    with get_db_session() as session:
        new_todo = PatientTodo(
            patient_id=todo_data.get('patient_id'),
            todo_title=todo_data.get('todo_title'),
            todo_description=todo_data.get('todo_description'),
            todo_type=todo_data.get('todo_type'),
            due_date=todo_data.get('due_date'),
            priority=todo_data.get('priority', 'medium'),
            status=todo_data.get('status', 'pending'),
            assigned_doctor=todo_data.get('assigned_doctor', user_id),
            tenant_id=tenant_id,
            created_by=user_id,
            updated_by=user_id,
            delete_flag='N'
        )
        session.add(new_todo)
        session.flush()
 
        todo_id = new_todo.todo_id
        session.commit()
 
        logger.info(f"Created patient todo: {todo_id}")
        return {"todo_id": todo_id}
 
 
def get_patient_todos(patient_id: int, tenant_id: str, status: Optional[str] = None) -> List[dict]:
    """
    Get patient todos with optional status filter by patient ID
    """
    with get_db_session() as session:
        query = session.query(PatientTodo).filter(
            PatientTodo.patient_id == patient_id,
            PatientTodo.tenant_id == tenant_id,
            PatientTodo.delete_flag != 'Y'
        )
        if status:
            query = query.filter(PatientTodo.status == status)
 
        todos = query.order_by(PatientTodo.due_date.asc()).all()
        return [as_dict(t) for t in todos]
 
 
def update_todo_status(todo_id: int, status: str, tenant_id: str, user_id: str) -> bool:
    """
    Update todo status
    """
    with get_db_session() as session:
        todo = session.query(PatientTodo).filter(
            PatientTodo.todo_id == todo_id,
            PatientTodo.tenant_id == tenant_id,
            PatientTodo.delete_flag != 'Y'
        ).first()
        if not todo:
            return False
 
        todo.status = status
        todo.updated_by = user_id
        session.commit()

        logger.info(f"Updated todo status: {todo_id} to {status}")
        return True

 

 

def delete_timeline(timeline_id: int, tenant_id: str, user_id: str) -> bool:
    """
    Hard delete timeline record from database
    """
    with get_db_session() as session:
        timeline = session.query(PatientTimeline).filter(
            PatientTimeline.timeline_id == timeline_id,
            PatientTimeline.tenant_id == tenant_id,
        ).first()

        if not timeline:
            return False

        session.delete(timeline)
        session.commit()

        logger.info(f"Hard deleted timeline: {timeline_id}")
        return True

 

 

def delete_patient_todo(todo_id: int, tenant_id: str, user_id: str) -> bool:
    """
    Hard delete patient todo record from database
    """
    with get_db_session() as session:
        todo = session.query(PatientTodo).filter(
            PatientTodo.todo_id == todo_id,
            PatientTodo.tenant_id == tenant_id,
        ).first()

        if not todo:
            return False

        session.delete(todo)
        session.commit()

        logger.info(f"Hard deleted patient todo: {todo_id}")
        return True


def delete_timeline_images(timeline_id: int, tenant_id: str, user_id: str) -> bool:
    """
    Hard delete all images for a timeline
    """
    with get_db_session() as session:
        deleted_count = session.query(PatientMedicalImage).filter(
            PatientMedicalImage.timeline_id == timeline_id,
            PatientMedicalImage.tenant_id == tenant_id
        ).delete()
 
        session.commit()
        logger.info(f"Hard deleted {deleted_count} images for timeline: {timeline_id}")
        return True
 
 
def delete_timeline_metrics(timeline_id: int, tenant_id: str, user_id: str) -> bool:
    """
    Hard delete all metrics for a timeline
    """
    with get_db_session() as session:
        deleted_count = session.query(PatientMetrics).filter(
            PatientMetrics.timeline_id == timeline_id,
            PatientMetrics.tenant_id == tenant_id
        ).delete()
 
        session.commit()
        logger.info(f"Hard deleted {deleted_count} metrics for timeline: {timeline_id}")
        return True


# ============================================================================
# Attachment Operations
# ============================================================================
 
def create_attachment(attachment_data: dict, tenant_id: str, user_id: str) -> dict:
    """
    Create a new timeline attachment record
    """
    with get_db_session() as session:
        new_attachment = PatientAttachment(
            timeline_id=attachment_data.get('timeline_id'),
            file_name=attachment_data.get('file_name'),
            file_type=attachment_data.get('file_type'),
            file_url=attachment_data.get('file_url'),
            file_size=attachment_data.get('file_size', 0),
            tenant_id=tenant_id,
            created_by=user_id,
            updated_by=user_id,
            delete_flag='N'
        )
        session.add(new_attachment)
        session.flush()
 
        attachment_id = new_attachment.attachment_id
        session.commit()
 
        logger.info(f"Created attachment: {attachment_id}")
        return {"attachment_id": attachment_id}
 
 
def delete_timeline_attachments(timeline_id: int, tenant_id: str, user_id: str) -> bool:
    """
    Hard delete all attachments for a timeline
    """
    with get_db_session() as session:
        deleted_count = session.query(PatientAttachment).filter(
            PatientAttachment.timeline_id == timeline_id,
            PatientAttachment.tenant_id == tenant_id
        ).delete()

        session.commit()
        logger.info(f"Hard deleted {deleted_count} attachments for timeline: {timeline_id}")
        return True


# ============================================================================
# Image Annotation Operations
# ============================================================================

def create_image_annotation(annotation_data: dict, tenant_id: str, user_id: str) -> dict:
    """
    Create a new image annotation record
    """
    with get_db_session() as session:
        new_annotation = PatientImageAnnotation(
            image_id=annotation_data.get('image_id'),
            annotation_type=annotation_data.get('annotation_type'),
            annotation_shape=annotation_data.get('annotation_shape'),
            coordinates=annotation_data.get('coordinates'),
            annotation_color=annotation_data.get('annotation_color', '#FF0000'),
            annotation_label=annotation_data.get('annotation_label'),
            annotation_order=annotation_data.get('annotation_order'),
            cropped_image_url=annotation_data.get('cropped_image_url'),
            tenant_id=tenant_id,
            created_by=user_id,
            updated_by=user_id,
            delete_flag='N'
        )
        session.add(new_annotation)
        session.flush()

        annotation_id = new_annotation.annotation_id
        session.commit()

        logger.info(f"Created annotation: {annotation_id} for image: {annotation_data.get('image_id')}")
        return {"annotation_id": annotation_id}


def get_image_annotations(image_id: int, tenant_id: str) -> List[dict]:
    """
    Get all annotations for an image
    """
    with get_db_session() as session:
        annotations = session.query(PatientImageAnnotation).filter(
            PatientImageAnnotation.image_id == image_id,
            PatientImageAnnotation.tenant_id == tenant_id,
            PatientImageAnnotation.delete_flag != 'Y'
        ).order_by(PatientImageAnnotation.annotation_order).all()

        return [as_dict(ann) for ann in annotations]


def get_annotation_by_id(annotation_id: int, tenant_id: str) -> Optional[dict]:
    """
    Get a specific annotation by ID
    """
    with get_db_session() as session:
        annotation = session.query(PatientImageAnnotation).filter(
            PatientImageAnnotation.annotation_id == annotation_id,
            PatientImageAnnotation.tenant_id == tenant_id,
            PatientImageAnnotation.delete_flag != 'Y'
        ).first()

        if annotation:
            return as_dict(annotation)
        return None


def update_annotation(annotation_id: int, update_data: dict, tenant_id: str, user_id: str) -> bool:
    """
    Update an existing annotation
    """
    with get_db_session() as session:
        annotation = session.query(PatientImageAnnotation).filter(
            PatientImageAnnotation.annotation_id == annotation_id,
            PatientImageAnnotation.tenant_id == tenant_id,
            PatientImageAnnotation.delete_flag != 'Y'
        ).first()

        if not annotation:
            logger.warning(f"Annotation not found: {annotation_id}")
            return False

        # Update fields
        if 'annotation_label' in update_data:
            annotation.annotation_label = update_data['annotation_label']
        if 'annotation_color' in update_data:
            annotation.annotation_color = update_data['annotation_color']
        if 'coordinates' in update_data:
            annotation.coordinates = update_data['coordinates']
        if 'cropped_image_url' in update_data:
            annotation.cropped_image_url = update_data['cropped_image_url']

        annotation.updated_by = user_id
        session.commit()

        logger.info(f"Updated annotation: {annotation_id}")
        return True


def delete_annotation(annotation_id: int, tenant_id: str, user_id: str) -> bool:
    """
    Soft delete an annotation
    """
    with get_db_session() as session:
        annotation = session.query(PatientImageAnnotation).filter(
            PatientImageAnnotation.annotation_id == annotation_id,
            PatientImageAnnotation.tenant_id == tenant_id
        ).first()

        if not annotation:
            logger.warning(f"Annotation not found: {annotation_id}")
            return False

        annotation.delete_flag = 'Y'
        annotation.updated_by = user_id
        session.commit()

        logger.info(f"Soft deleted annotation: {annotation_id}")
        return True


def get_next_annotation_order(image_id: int, tenant_id: str) -> int:
    """
    Get the next annotation order number for an image
    """
    with get_db_session() as session:
        max_order = session.query(PatientImageAnnotation.annotation_order).filter(
            PatientImageAnnotation.image_id == image_id,
            PatientImageAnnotation.tenant_id == tenant_id,
            PatientImageAnnotation.delete_flag != 'Y'
        ).order_by(PatientImageAnnotation.annotation_order.desc()).first()

        if max_order and max_order[0] is not None:
            return max_order[0] + 1
        return 1


# ============================================================================
# Image Analysis Operations
# ============================================================================

def create_image_analysis(analysis_data: dict, tenant_id: str, user_id: str) -> dict:
    """
    Create a new image analysis record
    """
    with get_db_session() as session:
        new_analysis = PatientImageAnalysis(
            image_id=analysis_data.get('image_id'),
            annotation_id=analysis_data.get('annotation_id'),
            analysis_type=analysis_data.get('analysis_type'),
            analysis_prompt=analysis_data.get('analysis_prompt'),
            analysis_result=analysis_data.get('analysis_result'),
            model_name=analysis_data.get('model_name'),
            confidence_score=analysis_data.get('confidence_score'),
            conversation_id=analysis_data.get('conversation_id'),
            tenant_id=tenant_id,
            created_by=user_id,
            delete_flag='N'
        )
        session.add(new_analysis)
        session.flush()

        analysis_id = new_analysis.analysis_id
        session.commit()

        logger.info(f"Created analysis: {analysis_id} for image: {analysis_data.get('image_id')}")
        return {"analysis_id": analysis_id}


def get_image_analyses(image_id: int, tenant_id: str, limit: int = 50) -> List[dict]:
    """
    Get all analyses for an image
    """
    with get_db_session() as session:
        analyses = session.query(PatientImageAnalysis).filter(
            PatientImageAnalysis.image_id == image_id,
            PatientImageAnalysis.tenant_id == tenant_id,
            PatientImageAnalysis.delete_flag != 'Y'
        ).order_by(PatientImageAnalysis.create_time.desc()).limit(limit).all()

        return [as_dict(analysis) for analysis in analyses]


def get_annotation_analyses(annotation_id: int, tenant_id: str, limit: int = 20) -> List[dict]:
    """
    Get all analyses for a specific annotation
    """
    with get_db_session() as session:
        analyses = session.query(PatientImageAnalysis).filter(
            PatientImageAnalysis.annotation_id == annotation_id,
            PatientImageAnalysis.tenant_id == tenant_id,
            PatientImageAnalysis.delete_flag != 'Y'
        ).order_by(PatientImageAnalysis.create_time.desc()).limit(limit).all()

        return [as_dict(analysis) for analysis in analyses]


def get_conversation_analyses(conversation_id: int, tenant_id: str) -> List[dict]:
    """
    Get all analyses linked to a conversation
    """
    with get_db_session() as session:
        analyses = session.query(PatientImageAnalysis).filter(
            PatientImageAnalysis.conversation_id == conversation_id,
            PatientImageAnalysis.tenant_id == tenant_id,
            PatientImageAnalysis.delete_flag != 'Y'
        ).order_by(PatientImageAnalysis.create_time.desc()).all()

        return [as_dict(analysis) for analysis in analyses]