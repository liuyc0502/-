"""
Patient Management MCP Tools

Tools for searching, viewing, and managing patient information.
"""

import json
import logging
from typing import Optional
from fastmcp import FastMCP

logger = logging.getLogger(__name__)


def register_patient_tools(mcp: FastMCP):
    """Register all patient management tools to the MCP service."""

    @mcp.tool(
        name="patient_search",
        description="Search patients by name, medical record number, diagnosis or other criteria."
    )
    async def patient_search(
        search_query: str,
        filter_type: Optional[str] = None,
        limit: int = 20
    ) -> str:
        """Search patients with multiple criteria."""
        try:
            from services.patient_service import list_patients_service
            from utils.auth_utils import get_default_tenant_id

            tenant_id = get_default_tenant_id()
            patients = await list_patients_service(
                tenant_id=tenant_id,
                search_query=search_query,
                filter_type=filter_type,
                limit=limit,
                offset=0
            )

            result = [{
                "patient_id": p.get("patient_id"),
                "name": p.get("name"),
                "gender": p.get("gender"),
                "age": p.get("age"),
                "medical_record_no": p.get("medical_record_no"),
                "diagnosis": p.get("diagnosis")
            } for p in patients]

            return json.dumps({"success": True, "count": len(result), "patients": result}, ensure_ascii=False, default=str)
        except Exception as e:
            logger.error(f"patient_search failed: {str(e)}")
            return json.dumps({"success": False, "error": str(e)}, ensure_ascii=False)

    @mcp.tool(
        name="patient_profile_summary",
        description="Generate a comprehensive summary of a patient's medical profile."
    )
    async def patient_profile_summary(patient_id: int) -> str:
        """Generate patient profile summary."""
        try:
            from services.patient_service import (
                get_patient_info, get_patient_timeline_service, get_patient_todos_service
            )
            from utils.auth_utils import get_default_tenant_id

            tenant_id = get_default_tenant_id()
            patient = await get_patient_info(patient_id, tenant_id)
            if not patient:
                return json.dumps({"success": False, "error": "Patient not found"})

            timelines = await get_patient_timeline_service(patient_id, tenant_id)
            todos = await get_patient_todos_service(patient_id, tenant_id, status="pending")

            summary = {
                "basic_info": {
                    "name": patient.get("name"),
                    "gender": patient.get("gender"),
                    "age": patient.get("age"),
                    "medical_record_no": patient.get("medical_record_no")
                },
                "medical_info": {
                    "diagnosis": patient.get("diagnosis"),
                    "allergies": patient.get("allergies", []),
                    "past_medical_history": patient.get("past_medical_history", [])
                },
                "timeline_count": len(timelines),
                "pending_todos": [{"title": t.get("todo_title"), "due_date": t.get("due_date")} for t in todos]
            }

            return json.dumps({"success": True, "summary": summary}, ensure_ascii=False, default=str)
        except Exception as e:
            logger.error(f"patient_profile_summary failed: {str(e)}")
            return json.dumps({"success": False, "error": str(e)}, ensure_ascii=False)

    @mcp.tool(
        name="patient_timeline_query",
        description="Query a patient's medical timeline with optional stage type filter."
    )
    async def patient_timeline_query(
        patient_id: int,
        stage_type: Optional[str] = None
    ) -> str:
        """Query patient timeline."""
        try:
            from services.patient_service import get_patient_timeline_service
            from utils.auth_utils import get_default_tenant_id

            tenant_id = get_default_tenant_id()
            timelines = await get_patient_timeline_service(patient_id, tenant_id)

            if stage_type:
                timelines = [t for t in timelines if t.get("stage_type") == stage_type]

            result = [{
                "timeline_id": t.get("timeline_id"),
                "stage_type": t.get("stage_type"),
                "stage_date": t.get("stage_date"),
                "stage_title": t.get("stage_title"),
                "diagnosis": t.get("diagnosis")
            } for t in timelines]

            return json.dumps({"success": True, "count": len(result), "timelines": result}, ensure_ascii=False, default=str)
        except Exception as e:
            logger.error(f"patient_timeline_query failed: {str(e)}")
            return json.dumps({"success": False, "error": str(e)}, ensure_ascii=False)

    @mcp.tool(
        name="patient_metrics_analyzer",
        description="Analyze patient's medical metrics to identify trends and abnormalities."
    )
    async def patient_metrics_analyzer(
        patient_id: int,
        timeline_id: Optional[int] = None
    ) -> str:
        """Analyze patient metrics."""
        try:
            from services.patient_service import get_patient_timeline_service, get_timeline_detail_service
            from utils.auth_utils import get_default_tenant_id

            tenant_id = get_default_tenant_id()

            if timeline_id:
                detail = await get_timeline_detail_service(timeline_id, tenant_id)
                all_metrics = detail.get("metrics", []) if detail else []
            else:
                timelines = await get_patient_timeline_service(patient_id, tenant_id)
                all_metrics = []
                for t in timelines:
                    detail = await get_timeline_detail_service(t.get("timeline_id"), tenant_id)
                    if detail and detail.get("metrics"):
                        all_metrics.extend(detail.get("metrics"))

            # Analyze metrics
            metric_groups = {}
            for m in all_metrics:
                name = m.get("metric_name")
                if name not in metric_groups:
                    metric_groups[name] = []
                metric_groups[name].append(m)

            analysis = {"total_metrics": len(all_metrics), "metrics_summary": [], "abnormal_metrics": []}
            for name, values in metric_groups.items():
                latest = values[-1] if values else {}
                analysis["metrics_summary"].append({
                    "name": name,
                    "latest_value": latest.get("metric_value"),
                    "status": latest.get("metric_status"),
                    "trend": latest.get("metric_trend")
                })
                if latest.get("metric_status") in ["high", "low", "abnormal"]:
                    analysis["abnormal_metrics"].append({"name": name, "status": latest.get("metric_status")})

            return json.dumps({"success": True, "analysis": analysis}, ensure_ascii=False, default=str)
        except Exception as e:
            logger.error(f"patient_metrics_analyzer failed: {str(e)}")
            return json.dumps({"success": False, "error": str(e)}, ensure_ascii=False)

    @mcp.tool(
        name="patient_todo_manager",
        description="Manage patient's todo items including follow-ups, medication reminders."
    )
    async def patient_todo_manager(
        patient_id: int,
        action: str = "list",
        todo_data: Optional[dict] = None,
        status_filter: Optional[str] = None
    ) -> str:
        """Manage patient todos."""
        try:
            from services.patient_service import (
                get_patient_todos_service, create_patient_todo_service, update_todo_status_service
            )
            from utils.auth_utils import get_default_tenant_id, get_default_user_id

            tenant_id = get_default_tenant_id()
            user_id = get_default_user_id()

            if action == "list":
                todos = await get_patient_todos_service(patient_id, tenant_id, status_filter)
                return json.dumps({
                    "success": True,
                    "todos": [{"todo_id": t.get("todo_id"), "title": t.get("todo_title"),
                              "type": t.get("todo_type"), "due_date": t.get("due_date"),
                              "status": t.get("status")} for t in todos]
                }, ensure_ascii=False, default=str)

            elif action == "create" and todo_data:
                todo_data["patient_id"] = patient_id
                result = await create_patient_todo_service(todo_data, tenant_id, user_id)
                return json.dumps({"success": True, "todo_id": result.get("todo_id")}, ensure_ascii=False)

            elif action == "update_status" and todo_data:
                await update_todo_status_service(todo_data["todo_id"], todo_data["status"], tenant_id, user_id)
                return json.dumps({"success": True, "message": "Status updated"}, ensure_ascii=False)

            return json.dumps({"success": False, "error": f"Unknown action: {action}"})
        except Exception as e:
            logger.error(f"patient_todo_manager failed: {str(e)}")
            return json.dumps({"success": False, "error": str(e)}, ensure_ascii=False)
