"""
Patient Report Service

This service handles patient examination reports by reading from timeline data.
Reports are not stored separately but derived from timeline stages with metrics, images, or attachments.
"""
import logging
from typing import List, Dict, Optional

from database import patient_db

logger = logging.getLogger(__name__)


def infer_report_type(timeline: Dict) -> str:
    """
    Infer report type based on timeline title and content

    Args:
        timeline: Timeline dictionary with stage_title, images, metrics

    Returns:
        str: Report type label
    """
    title = (timeline.get('stage_title') or '').lower()

    # Priority 1: Based on title keywords
    if '病理' in title:
        return '病理报告'
    if '血液' in title or '化验' in title:
        return '血液检查'
    if 'ct' in title or '影像' in title or 'x光' in title or 'mri' in title or '超声' in title:
        return '影像检查'

    # Priority 2: Based on content
    if timeline.get('images') and len(timeline['images']) > 0:
        return '影像检查'
    if timeline.get('metrics') and len(timeline['metrics']) > 0:
        return '检查报告'

    # Priority 3: Use original title
    return timeline.get('stage_title', '检查报告')


def map_metric_status(status: Optional[str]) -> str:
    """
    Map metric status from doctor-side to patient-side values

    Args:
        status: Doctor-side status (normal/warning/error/improving)

    Returns:
        str: Patient-side status (normal/slightly_high/high/low)
    """
    mapping = {
        'normal': 'normal',
        'warning': 'slightly_high',
        'error': 'high',
        'improving': 'normal'
    }
    return mapping.get(status or 'normal', 'normal')


def map_metric_trend(trend: Optional[str]) -> str:
    """
    Map metric trend to patient-side valid values

    Args:
        trend: Metric trend value

    Returns:
        str: Valid trend value (up/down/stable)
    """
    valid_trends = ['up', 'down', 'stable']
    return trend if trend in valid_trends else 'stable'


def format_metric_value(metric: Dict) -> str:
    """
    Format metric value with unit

    Args:
        metric: Metric dictionary with metric_value and metric_unit

    Returns:
        str: Formatted value like "3.2 ng/mL"
    """
    value = metric.get('metric_value', '')
    unit = metric.get('metric_unit', '')
    return f"{value} {unit}".strip()


def map_key_findings(metrics: List[Dict]) -> List[Dict]:
    """
    Map metrics to key findings format for patient reports

    Args:
        metrics: List of metric dictionaries

    Returns:
        List of key findings (top 2 metrics only)
    """
    findings = []
    for metric in metrics[:2]:  # Only take first 2 metrics
        findings.append({
            'indicator': metric.get('metric_name', ''),
            'value': format_metric_value(metric),
            'status': map_metric_status(metric.get('metric_status')),
            'trend': map_metric_trend(metric.get('metric_trend'))
        })
    return findings


def is_valid_report(timeline: Dict) -> bool:
    """
    Check if a timeline qualifies as a report

    A timeline is considered a report if it has:
    - Metrics data, or
    - Medical images, or
    - Attachments, or
    - Pathology findings

    Args:
        timeline: Timeline dictionary

    Returns:
        bool: True if timeline qualifies as a report
    """
    has_metrics = timeline.get('metrics') and len(timeline['metrics']) > 0
    has_images = timeline.get('images') and len(timeline['images']) > 0
    has_attachments = timeline.get('attachments') and len(timeline['attachments']) > 0
    has_pathology = timeline.get('detail') and timeline['detail'].get('pathology_findings')

    return has_metrics or has_images or has_attachments or has_pathology


def get_patient_reports(patient_id: int, user_id: str, tenant_id: str) -> List[Dict]:
    """
    Get all examination reports for a patient

    Reports are derived from timeline stages that contain metrics, images, or attachments.

    Args:
        patient_id: Patient ID
        user_id: Current user ID
        tenant_id: Tenant ID

    Returns:
        List of report summaries
    """
    # Get all timeline stages for the patient
    timelines = patient_db.get_patient_timeline(patient_id, tenant_id)

    reports = []
    for timeline in timelines:
        # Load full details for each timeline
        timeline_detail = patient_db.get_timeline_detail(timeline['timeline_id'], tenant_id)
        if not timeline_detail:
            continue

        # Filter: Only return timelines that qualify as reports
        if not is_valid_report(timeline_detail):
            continue

        # Check if has AI interpretation
        has_ai = False
        if timeline_detail.get('detail'):
            has_ai = bool(timeline_detail['detail'].get('patient_summary'))

        reports.append({
            'id': str(timeline_detail['timeline_id']),
            'type': infer_report_type(timeline_detail),
            'date': timeline_detail.get('stage_date', ''),
            'doctor': '医生',  # TODO: Fetch actual doctor name from user table
            'status': '已解读' if timeline_detail.get('status') == 'completed' else '未解读',
            'hasAI': has_ai,
            'keyFindings': map_key_findings(timeline_detail.get('metrics', []))
        })

    # Sort by date descending (most recent first)
    reports.sort(key=lambda x: x['date'], reverse=True)

    logger.info(f"Retrieved {len(reports)} reports for patient {patient_id}")
    return reports


def map_metric_detail(metric: Dict) -> Dict:
    """
    Map metric to detailed format for report detail view

    Args:
        metric: Metric dictionary

    Returns:
        Mapped metric with patient-side status and trend
    """
    return {
        'metric_id': metric.get('metric_id'),
        'metric_name': metric.get('metric_name'),
        'metric_full_name': metric.get('metric_full_name'),
        'metric_value': metric.get('metric_value'),
        'metric_unit': metric.get('metric_unit'),
        'metric_trend': map_metric_trend(metric.get('metric_trend')),
        'metric_status': map_metric_status(metric.get('metric_status')),
        'normal_range_min': metric.get('normal_range_min'),
        'normal_range_max': metric.get('normal_range_max'),
        'percentage': metric.get('percentage'),
    }


def get_report_detail(timeline_id: int, user_id: str, tenant_id: str) -> Dict:
    """
    Get detailed report information

    Args:
        timeline_id: Timeline ID
        user_id: Current user ID
        tenant_id: Tenant ID

    Returns:
        Detailed report data
    """
    timeline = patient_db.get_timeline_detail(timeline_id, tenant_id)

    if not timeline:
        raise ValueError(f"Timeline {timeline_id} not found")

    # Check if has AI interpretation
    has_ai = False
    ai_summary = None
    suggestions = []

    if timeline.get('detail'):
        detail = timeline['detail']
        has_ai = bool(detail.get('patient_summary'))
        ai_summary = detail.get('patient_summary')
        suggestions = detail.get('patient_suggestions', [])

    report_detail = {
        'id': str(timeline['timeline_id']),
        'type': infer_report_type(timeline),
        'date': timeline.get('stage_date', ''),
        'doctor': '医生',  # TODO: Fetch actual doctor name
        'status': '已解读' if timeline.get('status') == 'completed' else '未解读',
        'hasAI': has_ai,
        'diagnosis': timeline.get('diagnosis'),
        'images': timeline.get('images', []),
        'metrics': [map_metric_detail(m) for m in timeline.get('metrics', [])],
        'attachments': timeline.get('attachments', []),
        'pathology_findings': timeline['detail'].get('pathology_findings') if timeline.get('detail') else None,
        'doctor_notes': timeline['detail'].get('doctor_notes') if timeline.get('detail') else None,
        'aiSummary': ai_summary,
        'suggestions': suggestions,
    }

    logger.info(f"Retrieved report detail for timeline {timeline_id}")
    return report_detail
