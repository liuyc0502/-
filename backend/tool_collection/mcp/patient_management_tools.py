"""
Patient Management Tools for Medical AI Agent
MCP-based tools for querying and managing patient records
"""

from fastmcp import FastMCP
from typing import Optional, List, Dict, Any
import logging

# Import services
from services.patient_service import (
    get_patient_info,
    list_patients_service,
    get_patient_timeline_service,
    get_patient_todos_service
)
from services.patient_report_service import get_patient_reports
from database.patient_db import (
    get_patient_medical_images,
    get_timeline_metrics
)

logger = logging.getLogger(__name__)

# Create MCP server for patient management tools
patient_tools = FastMCP("patient_management")


@patient_tools.tool(
    name="get_patient_basic_info",
    description="Get patient basic information including demographics, medical record number, and diagnosis summary. Use this tool when doctor asks about patient's general information."
)
async def get_patient_basic_info(
    patient_id: int,
    tenant_id: str,
    include_summary: bool = True
) -> Dict[str, Any]:
    """
    Retrieve patient basic information

    Args:
        patient_id: Patient ID
        tenant_id: Tenant ID for data isolation
        include_summary: Whether to include AI-generated patient summary

    Returns:
        Patient basic information including name, age, gender, medical record number, diagnosis
    """
    try:
        patient = await get_patient_info(patient_id, tenant_id)

        if not patient:
            return {"error": "Patient not found", "patient_id": patient_id}

        result = {
            "patient_id": patient.get('patient_id'),
            "name": patient.get('name'),
            "age": patient.get('age'),
            "gender": patient.get('gender'),
            "date_of_birth": patient.get('date_of_birth'),
            "medical_record_no": patient.get('medical_record_no'),
            "diagnosis": patient.get('diagnosis'),  # Current primary diagnosis
            "phone": patient.get('phone'),
            "email": patient.get('email'),
            "address": patient.get('address'),
            "allergies": patient.get('allergies', []),
            "family_history": patient.get('family_history'),
            "past_medical_history": patient.get('past_medical_history', []),
        }

        logger.info(f"Retrieved patient info for patient_id={patient_id}")
        return result

    except Exception as e:
        logger.error(f"Error getting patient info: {str(e)}")
        return {"error": str(e)}


@patient_tools.tool(
    name="get_patient_timeline",
    description="Get patient's complete diagnostic timeline including admissions, diagnoses, treatments, examinations, and follow-ups. Use this when doctor asks about patient's medical history or timeline."
)
async def get_patient_timeline(
    patient_id: int,
    tenant_id: str,
    stage_type: Optional[str] = None,
    limit: int = 50
) -> Dict[str, Any]:
    """
    Retrieve patient diagnostic timeline

    Args:
        patient_id: Patient ID
        tenant_id: Tenant ID for data isolation
        stage_type: Filter by stage type (admission/diagnosis/treatment/examination/followup)
        limit: Maximum number of timeline events to return

    Returns:
        Timeline events list with dates, types, titles, and key findings
    """
    try:
        timeline = await get_patient_timeline_service(patient_id, tenant_id)

        if not timeline:
            return {"patient_id": patient_id, "timeline": [], "message": "No timeline records found"}

        # Filter by stage_type if specified
        if stage_type:
            timeline = [t for t in timeline if t.get('stage_type') == stage_type]

        # Limit results
        timeline = timeline[:limit]

        # Format timeline events
        formatted_timeline = []
        for event in timeline:
            formatted_timeline.append({
                "timeline_id": event.get('timeline_id'),
                "stage_date": event.get('stage_date'),
                "stage_type": event.get('stage_type'),
                "stage_title": event.get('stage_title'),
                "status": event.get('status'),
                "doctor_notes": event.get('doctor_notes'),
                "has_images": len(event.get('images', [])) > 0,
                "has_metrics": len(event.get('metrics', [])) > 0,
            })

        logger.info(f"Retrieved {len(formatted_timeline)} timeline events for patient_id={patient_id}")
        return {
            "patient_id": patient_id,
            "total_events": len(formatted_timeline),
            "timeline": formatted_timeline
        }

    except Exception as e:
        logger.error(f"Error getting patient timeline: {str(e)}")
        return {"error": str(e)}


@patient_tools.tool(
    name="get_patient_medical_images",
    description="Get patient's medical images including pathology slides, CT scans, X-rays, MRI, and ultrasound. Use this when doctor needs to view or review medical images."
)
async def get_patient_medical_images_tool(
    patient_id: int,
    tenant_id: str,
    image_type: Optional[str] = None,
    timeline_id: Optional[int] = None,
    limit: int = 20
) -> Dict[str, Any]:
    """
    Retrieve patient medical images

    Args:
        patient_id: Patient ID
        tenant_id: Tenant ID for data isolation
        image_type: Filter by image type (pathology_slide/ct_scan/xray/mri/ultrasound)
        timeline_id: Filter by specific timeline event
        limit: Maximum number of images to return

    Returns:
        Medical images list with URLs, types, labels, and AI annotations
    """
    try:
        # Get timeline to find images
        timeline = await get_patient_timeline_service(patient_id, tenant_id)

        all_images = []
        for event in timeline:
            if timeline_id and event.get('timeline_id') != timeline_id:
                continue

            images = event.get('images', [])
            for img in images:
                if image_type and img.get('image_type') != image_type:
                    continue

                all_images.append({
                    "image_id": img.get('image_id'),
                    "timeline_id": event.get('timeline_id'),
                    "stage_title": event.get('stage_title'),
                    "stage_date": event.get('stage_date'),
                    "image_type": img.get('image_type'),
                    "image_label": img.get('image_label'),
                    "image_url": img.get('image_url'),
                    "thumbnail_url": img.get('thumbnail_url'),
                    "display_order": img.get('display_order'),
                })

        # Limit results
        all_images = all_images[:limit]

        logger.info(f"Retrieved {len(all_images)} medical images for patient_id={patient_id}")
        return {
            "patient_id": patient_id,
            "total_images": len(all_images),
            "images": all_images
        }

    except Exception as e:
        logger.error(f"Error getting medical images: {str(e)}")
        return {"error": str(e)}


@patient_tools.tool(
    name="analyze_patient_metrics",
    description="Analyze patient's medical metrics and lab results over time, detect trends and abnormalities. Use this when doctor asks about patient's lab results or metric trends."
)
async def analyze_patient_metrics_tool(
    patient_id: int,
    tenant_id: str,
    metric_names: Optional[List[str]] = None,
    time_period: str = "3months",
    include_trend_analysis: bool = True
) -> Dict[str, Any]:
    """
    Analyze patient metrics data

    Args:
        patient_id: Patient ID
        tenant_id: Tenant ID for data isolation
        metric_names: Specific metric names to analyze (e.g., ["白细胞计数", "血红蛋白"])
        time_period: Analysis time period (1month/3months/6months/1year)
        include_trend_analysis: Whether to include trend analysis and anomaly detection

    Returns:
        Metrics analysis with current values, trends, anomalies, and recommendations
    """
    try:
        # Get timeline to find metrics
        timeline = await get_patient_timeline_service(patient_id, tenant_id)

        all_metrics = []
        for event in timeline:
            metrics = event.get('metrics', [])
            for metric in metrics:
                if metric_names and metric.get('metric_name') not in metric_names:
                    continue

                all_metrics.append({
                    "timeline_id": event.get('timeline_id'),
                    "date": event.get('stage_date'),
                    "metric_name": metric.get('metric_name'),
                    "metric_full_name": metric.get('metric_full_name'),
                    "metric_value": metric.get('metric_value'),
                    "metric_unit": metric.get('metric_unit'),
                    "normal_range_min": metric.get('normal_range_min'),
                    "normal_range_max": metric.get('normal_range_max'),
                    "metric_trend": metric.get('metric_trend'),
                    "status": metric.get('metric_status'),  # normal/warning/error/improving
                    "percentage": metric.get('percentage'),
                })

        # Group by metric name
        metrics_by_name = {}
        for metric in all_metrics:
            name = metric['metric_name']
            if name not in metrics_by_name:
                metrics_by_name[name] = []
            metrics_by_name[name].append(metric)

        # Analyze trends
        analysis_results = []
        for metric_name, values in metrics_by_name.items():
            # Sort by date
            values.sort(key=lambda x: x['date'])

            latest = values[-1] if values else None

            trend = "stable"
            if len(values) >= 2:
                if values[-1]['metric_value'] > values[-2]['metric_value']:
                    trend = "increasing"
                elif values[-1]['metric_value'] < values[-2]['metric_value']:
                    trend = "decreasing"

            analysis_results.append({
                "metric_name": metric_name,
                "metric_full_name": latest['metric_full_name'] if latest else None,
                "latest_value": latest['metric_value'] if latest else None,
                "latest_date": latest['date'] if latest else None,
                "unit": latest['metric_unit'] if latest else None,
                "normal_range_min": latest['normal_range_min'] if latest else None,
                "normal_range_max": latest['normal_range_max'] if latest else None,
                "current_status": latest['status'] if latest else None,
                "trend": trend,
                "historical_count": len(values),
                "historical_values": values if include_trend_analysis else None,
            })

        logger.info(f"Analyzed {len(analysis_results)} metrics for patient_id={patient_id}")
        return {
            "patient_id": patient_id,
            "time_period": time_period,
            "total_metrics": len(analysis_results),
            "metrics_analysis": analysis_results
        }

    except Exception as e:
        logger.error(f"Error analyzing patient metrics: {str(e)}")
        return {"error": str(e)}


@patient_tools.tool(
    name="get_patient_todos",
    description="Get patient's pending tasks and todos including scheduled examinations, medication reminders, and follow-up appointments. Use this when doctor asks about patient's upcoming tasks or pending items."
)
async def get_patient_todos_tool(
    patient_id: int,
    tenant_id: str,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    limit: int = 20
) -> Dict[str, Any]:
    """
    Retrieve patient todos and tasks

    Args:
        patient_id: Patient ID
        tenant_id: Tenant ID for data isolation
        status: Filter by status (pending/completed/overdue)
        priority: Filter by priority (high/medium/low)
        limit: Maximum number of todos to return

    Returns:
        Todo list with titles, types, due dates, priorities, and completion status
    """
    try:
        todos = await get_patient_todos_service(patient_id, tenant_id, status)

        # Filter by priority if specified
        if priority:
            todos = [t for t in todos if t.get('priority') == priority]

        # Limit results
        todos = todos[:limit]

        # Format todos
        formatted_todos = []
        for todo in todos:
            formatted_todos.append({
                "todo_id": todo.get('todo_id'),
                "todo_title": todo.get('todo_title'),
                "todo_description": todo.get('todo_description'),
                "todo_type": todo.get('todo_type'),
                "due_date": todo.get('due_date'),
                "priority": todo.get('priority'),
                "status": todo.get('status'),
                "assigned_doctor": todo.get('assigned_doctor'),
            })

        # Count by status
        status_counts = {}
        for todo in todos:
            st = todo.get('status', 'unknown')
            status_counts[st] = status_counts.get(st, 0) + 1

        logger.info(f"Retrieved {len(formatted_todos)} todos for patient_id={patient_id}")
        return {
            "patient_id": patient_id,
            "total_todos": len(formatted_todos),
            "status_counts": status_counts,
            "todos": formatted_todos
        }

    except Exception as e:
        logger.error(f"Error getting patient todos: {str(e)}")
        return {"error": str(e)}


@patient_tools.tool(
    name="get_patient_examination_reports",
    description="Get patient's examination reports including pathology reports, blood tests, imaging reports. Use this when doctor asks about patient's test results or reports."
)
async def get_patient_examination_reports_tool(
    patient_id: int,
    tenant_id: str,
    report_type: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 20
) -> Dict[str, Any]:
    """
    Retrieve patient examination reports

    Args:
        patient_id: Patient ID
        tenant_id: Tenant ID for data isolation
        report_type: Filter by report type (病理报告/血液检查/影像检查/检查报告)
        status: Filter by status (待解读/已解读)
        limit: Maximum number of reports to return

    Returns:
        Report list with types, dates, key findings, AI interpretations, and doctor notes
    """
    try:
        reports = await get_patient_reports(patient_id, tenant_id)

        # Filter by report_type if specified
        if report_type:
            reports = [r for r in reports if r.get('type') == report_type]

        # Filter by status if specified
        if status:
            reports = [r for r in reports if r.get('status') == status]

        # Limit results
        reports = reports[:limit]

        logger.info(f"Retrieved {len(reports)} examination reports for patient_id={patient_id}")
        return {
            "patient_id": patient_id,
            "total_reports": len(reports),
            "reports": reports
        }

    except Exception as e:
        logger.error(f"Error getting examination reports: {str(e)}")
        return {"error": str(e)}
