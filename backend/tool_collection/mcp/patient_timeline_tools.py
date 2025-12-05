"""
Patient Timeline Tools - Atomic MCP Tools
Medical timeline and report retrieval tools.
"""
import logging
from typing import Optional, Dict, Any, List
from fastmcp import FastMCP
from consts.const import DEFAULT_TENANT_ID
from database.patient_db import (
    get_patient_timeline,
    get_timeline_detail
)

logger = logging.getLogger(__name__)
patient_timeline_tools = FastMCP("patient_timeline")


@patient_timeline_tools.tool()
async def list_patient_timeline_events(
    patient_id: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    event_type: Optional[str] = None,
    limit: int = 20,
    tenant_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    List patient's medical timeline events (reports, procedures, etc).

    Use this tool when:
    - Patient asks "What's in my medical history?"
    - Need to find specific reports (e.g., "my latest pathology report")
    - Looking for events in a date range
    - Want overview before getting detailed data

    Args:
        patient_id: Patient identifier
        start_date: Filter events after this date (YYYY-MM-DD), optional
        end_date: Filter events before this date (YYYY-MM-DD), optional
        event_type: Filter by type (病理报告/血常规/CT/MRI/手术记录/etc), optional
        limit: Maximum events to return (default 20)
        tenant_id: Tenant identifier (optional)

    Returns:
        - patient_id: Patient identifier
        - total_events: Total events in filtered result
        - events: List of timeline events, each containing:
          - timeline_id: Use this to get event details (get_timeline_event_detail)
          - stage_date: Event date (YYYY-MM-DD)
          - stage_type: Event type (病理报告/血常规/etc)
          - stage_title: Event title/name
          - diagnosis: Diagnosis at that time
          - status: Event status (completed/pending/etc)

    Next steps:
    - Call get_timeline_event_detail(timeline_id) for detailed findings
    - Call get_timeline_event_metrics(timeline_id) for lab values

    Example workflow:
        # Get recent pathology reports
        result = list_patient_timeline_events(
            patient_id=patient_id,
            event_type="病理报告",
            limit=5
        )

        # Get details of most recent report
        if result['events']:
            latest = result['events'][0]
            detail = get_timeline_event_detail(latest['timeline_id'])
    """
    try:
        tenant = tenant_id or DEFAULT_TENANT_ID
        timeline = get_patient_timeline(patient_id, tenant)

        if not timeline:
            return {
                "patient_id": patient_id,
                "total_events": 0,
                "events": [],
                "message": "No timeline events found"
            }

        # Filter by date range
        filtered_events = []
        for event in timeline:
            event_date = event.get("stage_date", "")

            # Date range filter
            if start_date and event_date < start_date:
                continue
            if end_date and event_date > end_date:
                continue

            # Event type filter
            if event_type and event.get("stage_type") != event_type:
                continue

            filtered_events.append({
                "timeline_id": event.get("timeline_id"),
                "stage_date": event.get("stage_date"),
                "stage_type": event.get("stage_type"),
                "stage_title": event.get("stage_title"),
                "diagnosis": event.get("diagnosis"),
                "status": event.get("status")
            })

        # Apply limit
        filtered_events = filtered_events[:limit]

        logger.info(f"Retrieved {len(filtered_events)} timeline events for patient {patient_id}")

        return {
            "patient_id": patient_id,
            "total_events": len(filtered_events),
            "events": filtered_events,
            "filters_applied": {
                "start_date": start_date,
                "end_date": end_date,
                "event_type": event_type,
                "limit": limit
            }
        }

    except Exception as e:
        logger.error(f"Error listing timeline events: {str(e)}")
        return {"error": str(e)}


@patient_timeline_tools.tool()
async def get_timeline_event_detail(
    timeline_id: str,
    tenant_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Get detailed information for a specific timeline event.

    Use this tool when:
    - Need to see report findings/description
    - Patient asks "What did my report say?"
    - Want detailed pathology findings or clinical notes

    Args:
        timeline_id: Timeline event identifier (from list_patient_timeline_events)
        tenant_id: Tenant identifier (optional)

    Returns:
        - timeline_id: Timeline event identifier
        - detail: Detailed information, may contain:
          - pathology_findings: Pathology report findings
          - patient_summary: Summary for patient
          - clinical_notes: Clinical notes
          - imaging_findings: Imaging report findings
          - (structure varies by event type)

    Example:
        # First get timeline events
        events = list_patient_timeline_events(patient_id, limit=5)

        # Get details of first event
        detail = get_timeline_event_detail(events['events'][0]['timeline_id'])
        print(detail['detail']['pathology_findings'])
    """
    try:
        tenant = tenant_id or DEFAULT_TENANT_ID
        detail = get_timeline_detail(timeline_id, tenant)

        if not detail:
            return {
                "timeline_id": timeline_id,
                "error": "Timeline event detail not found"
            }

        result = {
            "timeline_id": timeline_id,
            "detail": detail.get("detail", {})
        }

        logger.info(f"Retrieved detail for timeline event {timeline_id}")
        return result

    except Exception as e:
        logger.error(f"Error getting timeline event detail: {str(e)}")
        return {"error": str(e)}


@patient_timeline_tools.tool()
async def get_timeline_event_metrics(
    timeline_id: str,
    tenant_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Get lab values and metrics for a specific timeline event.

    Use this tool when:
    - Patient asks "What were my lab values?"
    - Need to check if values are normal or abnormal
    - Tracking metric trends over time
    - Interpreting lab reports

    Args:
        timeline_id: Timeline event identifier (from list_patient_timeline_events)
        tenant_id: Tenant identifier (optional)

    Returns:
        - timeline_id: Timeline event identifier
        - total_metrics: Number of metrics
        - metrics: List of metrics, each containing:
          - metric_name: Short name (e.g., "WBC", "HGB")
          - metric_full_name: Full name (e.g., "White Blood Cell Count")
          - metric_value: Measured value
          - metric_unit: Unit of measurement
          - normal_range_min: Minimum normal value
          - normal_range_max: Maximum normal value
          - metric_status: Status (normal/high/low)
          - metric_trend: Trend compared to previous (up/down/stable)

    Example:
        # Get metrics for a lab report
        metrics = get_timeline_event_metrics(timeline_id)

        # Check for abnormal values
        abnormal = [m for m in metrics['metrics'] if m['metric_status'] != 'normal']
        print(f"Found {len(abnormal)} abnormal values")
    """
    try:
        tenant = tenant_id or DEFAULT_TENANT_ID
        detail = get_timeline_detail(timeline_id, tenant)

        if not detail:
            return {
                "timeline_id": timeline_id,
                "error": "Timeline event not found"
            }

        metrics = detail.get("metrics", [])

        result = {
            "timeline_id": timeline_id,
            "total_metrics": len(metrics),
            "metrics": [
                {
                    "metric_name": m.get("metric_name"),
                    "metric_full_name": m.get("metric_full_name"),
                    "metric_value": m.get("metric_value"),
                    "metric_unit": m.get("metric_unit"),
                    "normal_range_min": m.get("normal_range_min"),
                    "normal_range_max": m.get("normal_range_max"),
                    "metric_status": m.get("metric_status"),
                    "metric_trend": m.get("metric_trend")
                }
                for m in metrics
            ]
        }

        logger.info(f"Retrieved {len(metrics)} metrics for timeline event {timeline_id}")
        return result

    except Exception as e:
        logger.error(f"Error getting timeline event metrics: {str(e)}")
        return {"error": str(e)}
