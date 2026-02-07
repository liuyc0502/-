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
    """List patient's timeline events (reports, procedures). Filter by date range or event_type."""
    try:
        tenant = tenant_id or DEFAULT_TENANT_ID
        timeline = get_patient_timeline(patient_id, tenant)

        if not timeline:
            return {"patient_id": patient_id, "total_events": 0, "events": [], "message": "No timeline events found"}

        filtered_events = []
        for event in timeline:
            event_date = event.get("stage_date", "")

            if start_date and event_date < start_date:
                continue
            if end_date and event_date > end_date:
                continue

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
    """Get detailed information for a timeline event (pathology findings, clinical notes, etc)."""
    try:
        tenant = tenant_id or DEFAULT_TENANT_ID
        detail = get_timeline_detail(timeline_id, tenant)

        if not detail:
            return {"timeline_id": timeline_id, "error": "Timeline event detail not found"}

        result = {"timeline_id": timeline_id, "detail": detail.get("detail", {})}

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
    """Get lab values and metrics for a timeline event."""
    try:
        tenant = tenant_id or DEFAULT_TENANT_ID
        detail = get_timeline_detail(timeline_id, tenant)

        if not detail:
            return {"timeline_id": timeline_id, "error": "Timeline event not found"}

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
