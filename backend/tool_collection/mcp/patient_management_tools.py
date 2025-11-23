"""
Patient Management Tools - MCP Format
6 tools for managing patient records and medical data
"""
import logging
from typing import Optional, List, Dict, Any
from fastmcp import FastMCP
from consts.const import DEFAULT_TENANT_ID
from database.patient_db import (
    get_patient_by_id,
    get_patient_timeline,
    get_timeline_detail,
    get_patient_todos,
    list_patients
)
logger = logging.getLogger(__name__) 
patient_tools = FastMCP("patient_management")

@patient_tools.tool(
    name="get_patient_basic_info",
    description="Get patient demographics and diagnosis summary. Use when doctor asks about patient's basic information, age, gender, diagnosis, medical record number, allergies, or family history."
)
async def get_patient_basic_info(
    patient_id: int,
    include_summary: bool = True
) -> Dict[str, Any]:
    """
    Get patient basic information including demographics and diagnosis.
    Args:
        patient_id: The unique patient identifier
        include_summary: Whether to include diagnosis summary
    Returns:
        Patient information dictionary
    """
    try:
        patient = get_patient_by_id(patient_id, DEFAULT_TENANT_ID)
        if not patient:
            return {"error": "Patient not found", "patient_id": patient_id}
        result = {
            "patient_id": patient.get("patient_id"),
            "name": patient.get("name"),
            "gender": patient.get("gender"),
            "age": patient.get("age"),
            "date_of_birth": patient.get("date_of_birth"),
            "medical_record_no": patient.get("medical_record_no"),
            "phone": patient.get("phone"),
            "email": patient.get("email"),
            "address": patient.get("address"),
            "allergies": patient.get("allergies", []),
            "family_history": patient.get("family_history"),
            "past_medical_history": patient.get("past_medical_history", []),
        }
        if include_summary:
            result["diagnosis"] = patient.get("diagnosis")
        logger.info(f"Retrieved patient info: {patient_id}")
        return result
    except Exception as e:
        logger.error(f"Error getting patient info: {str(e)}")
        return {"error": str(e)}


@patient_tools.tool(
    name="get_patient_timeline",
    description="Get complete diagnostic timeline for a patient. Use when doctor asks about treatment history, diagnosis stages, or what happened during the patient's medical journey."
)
async def get_patient_timeline_tool(
    patient_id: int,
    include_details: bool = False
) -> Dict[str, Any]:
    """
    Get patient's complete diagnostic and treatment timeline.
    Args:
        patient_id: The unique patient identifier
        include_details: Whether to include detailed information for each stage
    Returns:
        Timeline information with stages
    """
    try:
        timeline = get_patient_timeline(patient_id, DEFAULT_TENANT_ID)
        if not timeline:
            return {
                "patient_id": patient_id,
                "timeline": [],
                "message": "No timeline records found"
            }
        result = {
            "patient_id": patient_id,
            "total_stages": len(timeline),
            "timeline": []
        }
        for stage in timeline:
            stage_info = {
                "timeline_id": stage.get("timeline_id"),
                "stage_type": stage.get("stage_type"),
                "stage_date": stage.get("stage_date"),
                "stage_title": stage.get("stage_title"),
                "diagnosis": stage.get("diagnosis"),
                "status": stage.get("status")
            }
            if include_details:
                detail = get_timeline_detail(stage.get("timeline_id"), DEFAULT_TENANT_ID)
                if detail:
                    stage_info["detail"] = detail.get("detail")
                    stage_info["images"] = detail.get("images", [])
                    stage_info["metrics"] = detail.get("metrics", [])
            result["timeline"].append(stage_info)
        logger.info(f"Retrieved timeline for patient: {patient_id}")
        return result
    except Exception as e:
        logger.error(f"Error getting patient timeline: {str(e)}")
        return {"error": str(e)}



@patient_tools.tool(
    name="get_patient_medical_images",
    description="Get pathology slides, CT scans, X-rays and other medical images for a patient. Use when doctor needs to view or analyze patient's imaging results."
)
async def get_patient_medical_images(
    patient_id: int,
    image_type: Optional[str] = None,
    limit: int = 20
) -> Dict[str, Any]:
    """
    Get patient's medical images including pathology slides, CT, X-ray, MRI, etc.
    Args:
        patient_id: The unique patient identifier
        image_type: Filter by image type (病理切片/X光/CT/MRI/临床照片/超声)
        limit: Maximum number of images to return
    Returns:
        List of medical images with URLs and descriptions
    """
    try:
        timeline = get_patient_timeline(patient_id, DEFAULT_TENANT_ID)
        all_images = []
        for stage in timeline:
            detail = get_timeline_detail(stage.get("timeline_id"), DEFAULT_TENANT_ID)
            if detail and detail.get("images"):
                for img in detail.get("images", []):
                    if image_type and img.get("image_type") != image_type:
                        continue
                    all_images.append({
                        "image_id": img.get("image_id"),
                        "image_type": img.get("image_type"),
                        "image_label": img.get("image_label"),
                        "image_url": img.get("image_url"),
                        "thumbnail_url": img.get("thumbnail_url"),
                        "stage_date": stage.get("stage_date"),
                        "stage_title": stage.get("stage_title")
                    })
        # Sort by date and limit
        all_images = sorted(all_images, key=lambda x: x.get("stage_date", ""), reverse=True)[:limit]
        return {
            "patient_id": patient_id,
            "total_images": len(all_images),
            "images": all_images
        }
    except Exception as e:
        logger.error(f"Error getting patient medical images: {str(e)}")
        return {"error": str(e)}



@patient_tools.tool(
    name="analyze_patient_metrics",
    description="Analyze lab results and metric trends for a patient. Use when doctor asks about blood test results, inflammation markers, or how metrics have changed over time."
)
async def analyze_patient_metrics(
    patient_id: int,
    metric_names: Optional[List[str]] = None
) -> Dict[str, Any]:
    """
    Analyze patient's lab results and metric trends.
    Args:
        patient_id: The unique patient identifier
        metric_names: Specific metrics to analyze (e.g., ["ESR", "CRP", "RF"])
    Returns:
        Metrics analysis with trends
    """
    try:
        timeline = get_patient_timeline(patient_id, DEFAULT_TENANT_ID)
        metrics_by_name = {}
        for stage in timeline:
            detail = get_timeline_detail(stage.get("timeline_id"), DEFAULT_TENANT_ID)
            if detail and detail.get("metrics"):
                for metric in detail.get("metrics", []):
                    name = metric.get("metric_name")
                    if metric_names and name not in metric_names:
                        continue
                    if name not in metrics_by_name:
                        metrics_by_name[name] = {
                            "metric_name": name,
                            "full_name": metric.get("metric_full_name"),
                            "unit": metric.get("metric_unit"),
                            "normal_range": {
                                "min": float(metric.get("normal_range_min", 0)) if metric.get("normal_range_min") else None,
                                "max": float(metric.get("normal_range_max", 0)) if metric.get("normal_range_max") else None
                            },
                            "history": []
                        }
                    metrics_by_name[name]["history"].append({
                        "date": stage.get("stage_date"),
                        "value": metric.get("metric_value"),
                        "trend": metric.get("metric_trend"),
                        "status": metric.get("metric_status")
                    })
        # Calculate overall trends
        analysis = []
        for name, data in metrics_by_name.items():
            history = data["history"]
            if len(history) >= 2:
                # Compare latest with previous
                latest = history[0]
                previous = history[1]
                try:
                    latest_val = float(latest["value"])
                    prev_val = float(previous["value"])
                    change_pct = ((latest_val - prev_val) / prev_val * 100) if prev_val != 0 else 0
                    data["trend_analysis"] = {
                        "direction": "up" if change_pct > 0 else "down" if change_pct < 0 else "stable",
                        "change_percentage": round(change_pct, 2)
                    }
                except (ValueError, TypeError):
                    data["trend_analysis"] = {"direction": "unknown"}
            analysis.append(data)
        return {
            "patient_id": patient_id,
            "metrics_count": len(analysis),
            "metrics": analysis
        }
    except Exception as e:
        logger.error(f"Error analyzing patient metrics: {str(e)}")
        return {"error": str(e)}


        
@patient_tools.tool(
    name="get_patient_todos",
    description="Get pending tasks and examinations for a patient. Use when doctor asks about what needs to be done next, upcoming appointments, or pending tests."
)
async def get_patient_todos_tool(
    patient_id: int,
    status: Optional[str] = None,
    priority: Optional[str] = None
) -> Dict[str, Any]:
    """
    Get patient's pending todos and tasks.
    Args:
        patient_id: The unique patient identifier
        status: Filter by status (pending/completed/overdue)
        priority: Filter by priority (high/medium/low)
    Returns:
        List of todos with details
    """
    try:
        todos = get_patient_todos(patient_id, DEFAULT_TENANT_ID, status)
        if priority:
            todos = [t for t in todos if t.get("priority") == priority]
        result = {
            "patient_id": patient_id,
            "total_todos": len(todos),
            "pending_count": len([t for t in todos if t.get("status") == "pending"]),
            "overdue_count": len([t for t in todos if t.get("status") == "overdue"]),
            "todos": [
                {
                    "todo_id": t.get("todo_id"),
                    "title": t.get("todo_title"),
                    "description": t.get("todo_description"),
                    "type": t.get("todo_type"),
                    "due_date": t.get("due_date"),
                    "priority": t.get("priority"),
                    "status": t.get("status"),
                    "assigned_doctor": t.get("assigned_doctor")
                }
                for t in todos
            ]
        }
        logger.info(f"Retrieved todos for patient: {patient_id}")
        return result
    except Exception as e:
        logger.error(f"Error getting patient todos: {str(e)}")
        return {"error": str(e)}
@patient_tools.tool(
    name="get_patient_examination_reports",
    description="Get examination reports with AI interpretations for a patient. Use when doctor asks about pathology reports, test results, or needs to see detailed examination findings."
)
async def get_patient_examination_reports(
    patient_id: int,
    report_type: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 10
) -> Dict[str, Any]:
    """
    Get patient's examination reports.
    Args:
        patient_id: The unique patient identifier
        report_type: Filter by report type
        status: Filter by status (已解读/待解读)
        limit: Maximum number of reports
    Returns:
        List of examination reports
    """
    try:
        timeline = get_patient_timeline(patient_id, DEFAULT_TENANT_ID)
        reports = []
        for stage in timeline:
            detail = get_timeline_detail(stage.get("timeline_id"), DEFAULT_TENANT_ID)
            if detail:
                # Construct report from timeline detail
                report = {
                    "timeline_id": stage.get("timeline_id"),
                    "stage_date": stage.get("stage_date"),
                    "stage_type": stage.get("stage_type"),
                    "stage_title": stage.get("stage_title"),
                    "diagnosis": stage.get("diagnosis"),
                    "pathology_findings": detail.get("detail", {}).get("pathology_findings") if detail.get("detail") else None,
                    "doctor_notes": detail.get("detail", {}).get("doctor_notes") if detail.get("detail") else None,
                    "patient_summary": detail.get("detail", {}).get("patient_summary") if detail.get("detail") else None,
                    "metrics": detail.get("metrics", []),
                    "attachments": detail.get("attachments", [])
                }
                if report_type and stage.get("stage_type") != report_type:
                    continue
                reports.append(report)
        # Sort by date and limit
        reports = sorted(reports, key=lambda x: x.get("stage_date", ""), reverse=True)[:limit]
        return {
            "patient_id": patient_id,
            "total_reports": len(reports),
            "reports": reports
        }
    except Exception as e:
        logger.error(f"Error getting patient examination reports: {str(e)}")
        return {"error": str(e)}


@patient_tools.tool(
name="list_all_patients",
description="List all patients in the system. Use when doctor asks about available patients, patient list, or wants to see all patients in the database."

)

async def list_all_patients_tool(
    limit: int = 50
) -> Dict[str, Any]:
    """
    List all patients in the system.
    Args:
        limit: Maximum number of patients to return
    Returns:
        List of patients with basic info
    """
    try:
        patients = list_patients(tenant_id=DEFAULT_TENANT_ID, limit=limit)
        return {
            "total_patients": len(patients),
            "patients": [
                {
                    "patient_id": p.get("patient_id"),
                    "name": p.get("name"),
                    "gender": p.get("gender"),
                    "age": p.get("age"),
                    "medical_record_no": p.get("medical_record_no"),
                    "diagnosis": p.get("diagnosis")
                }
                for p in patients
            ]
        }
    except Exception as e:
        logger.error(f"Error listing patients: {str(e)}")
        return {"error": str(e)}