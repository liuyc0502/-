"""
Care Plan MCP Tools

Tools for managing patient care plans, medications, tasks, and compliance.
"""

import json
import logging
from typing import Optional, List
from fastmcp import FastMCP

logger = logging.getLogger(__name__)


def register_care_plan_tools(mcp: FastMCP):
    """Register all care plan tools to the MCP service."""

    @mcp.tool(
        name="care_plan_query",
        description="Query patient's care plans including medications, tasks, and precautions."
    )
    async def care_plan_query(
        patient_id: int,
        plan_id: Optional[int] = None,
        status: Optional[str] = None
    ) -> str:
        """Query care plans for a patient."""
        try:
            from services.care_plan_service import get_care_plan_service, list_care_plans_service
            from utils.auth_utils import get_default_tenant_id

            tenant_id = get_default_tenant_id()

            if plan_id:
                plan = await get_care_plan_service(plan_id, tenant_id)
                plans = [plan] if plan else []
            else:
                plans = await list_care_plans_service(patient_id, tenant_id, status)

            result = [{
                "plan_id": p.get("plan_id"),
                "plan_name": p.get("plan_name"),
                "start_date": p.get("start_date"),
                "end_date": p.get("end_date"),
                "status": p.get("status"),
                "medication_count": len(p.get("medications", [])),
                "task_count": len(p.get("tasks", []))
            } for p in plans]

            return json.dumps({"success": True, "care_plans": result}, ensure_ascii=False, default=str)
        except Exception as e:
            logger.error(f"care_plan_query failed: {str(e)}")
            return json.dumps({"success": False, "error": str(e)}, ensure_ascii=False)

    @mcp.tool(
        name="today_care_plan",
        description="Get today's care plan for a patient with completion status."
    )
    async def today_care_plan(
        patient_id: int,
        record_date: Optional[str] = None
    ) -> str:
        """Get today's care plan."""
        try:
            from services.care_plan_service import get_today_plan_service
            from utils.auth_utils import get_default_tenant_id

            tenant_id = get_default_tenant_id()
            today_plan = await get_today_plan_service(patient_id, tenant_id, record_date)

            return json.dumps({
                "success": True,
                "today_plan": {
                    "date": today_plan.get("date"),
                    "medications": [{
                        "name": m.get("medication_name"),
                        "dosage": m.get("dosage"),
                        "frequency": m.get("frequency"),
                        "completed": m.get("completed", False)
                    } for m in today_plan.get("medications", [])],
                    "tasks": [{
                        "name": t.get("task_name"),
                        "type": t.get("task_type"),
                        "completed": t.get("completed", False)
                    } for t in today_plan.get("tasks", [])],
                    "precautions": today_plan.get("precautions", [])
                }
            }, ensure_ascii=False, default=str)
        except Exception as e:
            logger.error(f"today_care_plan failed: {str(e)}")
            return json.dumps({"success": False, "error": str(e)}, ensure_ascii=False)

    @mcp.tool(
        name="care_plan_compliance_analyzer",
        description="Analyze patient's care plan compliance rate over time."
    )
    async def care_plan_compliance_analyzer(
        patient_id: int,
        end_date: Optional[str] = None
    ) -> str:
        """Analyze care plan compliance."""
        try:
            from services.care_plan_service import get_weekly_progress_service
            from utils.auth_utils import get_default_tenant_id

            tenant_id = get_default_tenant_id()
            progress = await get_weekly_progress_service(patient_id, tenant_id, end_date)

            return json.dumps({
                "success": True,
                "compliance_analysis": {
                    "overall_completion_rate": progress.get("overall_completion_rate", 0),
                    "medication_compliance_rate": progress.get("medication_compliance_rate", 0),
                    "task_completion_rate": progress.get("task_completion_rate", 0),
                    "daily_breakdown": progress.get("daily_stats", [])
                }
            }, ensure_ascii=False, default=str)
        except Exception as e:
            logger.error(f"care_plan_compliance_analyzer failed: {str(e)}")
            return json.dumps({"success": False, "error": str(e)}, ensure_ascii=False)

    @mcp.tool(
        name="medication_interaction_checker",
        description="Check for potential drug interactions between medications."
    )
    async def medication_interaction_checker(
        medications: List[str],
        patient_id: Optional[int] = None
    ) -> str:
        """Check for drug interactions."""
        try:
            all_medications = list(medications)

            if patient_id:
                from services.care_plan_service import list_care_plans_service, get_care_plan_service
                from utils.auth_utils import get_default_tenant_id

                tenant_id = get_default_tenant_id()
                plans = await list_care_plans_service(patient_id, tenant_id, status="active")

                if plans:
                    plan = await get_care_plan_service(plans[0].get("plan_id"), tenant_id)
                    if plan:
                        for med in plan.get("medications", []):
                            med_name = med.get("medication_name")
                            if med_name and med_name not in all_medications:
                                all_medications.append(med_name)

            # Note: Real implementation would call external drug interaction API
            return json.dumps({
                "success": True,
                "medications_checked": all_medications,
                "interactions": [],
                "warnings": [],
                "note": "Drug interaction checking requires integration with a medical drug database."
            }, ensure_ascii=False)
        except Exception as e:
            logger.error(f"medication_interaction_checker failed: {str(e)}")
            return json.dumps({"success": False, "error": str(e)}, ensure_ascii=False)
