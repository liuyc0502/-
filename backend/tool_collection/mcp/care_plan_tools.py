"""
Care Plan Tools for Medical AI Agent
MCP-based tools for creating and managing patient care plans
"""

from fastmcp import FastMCP
from typing import Optional, List, Dict, Any
import logging
from datetime import datetime, timedelta

# Import services
from services.care_plan_service import (
    create_care_plan_service,
    get_care_plans_by_patient_service,
    get_care_plan_detail_service,
    update_care_plan_service,
    create_task_completion_service
)

logger = logging.getLogger(__name__)

# Create MCP server for care plan tools
care_plan_tools = FastMCP("care_plan")


@care_plan_tools.tool(
    name="create_care_plan",
    description="Create a rehabilitation/care plan for a patient including medications, tasks, and precautions. Use this when doctor needs to create a post-surgery recovery plan, chemotherapy schedule, or rehabilitation program."
)
async def create_care_plan_tool(
    patient_id: int,
    tenant_id: str,
    user_id: str,
    plan_name: str,
    plan_description: str,
    start_date: str,
    duration_days: int,
    medications: Optional[List[Dict]] = None,
    tasks: Optional[List[Dict]] = None,
    precautions: Optional[List[str]] = None
) -> Dict[str, Any]:
    """
    Create a care plan for patient

    Args:
        patient_id: Patient ID
        tenant_id: Tenant ID for data isolation
        user_id: Doctor/User ID
        plan_name: Plan name
        plan_description: Plan description
        start_date: Start date (YYYY-MM-DD format)
        duration_days: Duration in days
        medications: Medication list [{"name": str, "dosage": str, "frequency": str, ...}]
        tasks: Task list [{"title": str, "description": str, "frequency": str, ...}]
        precautions: Precaution list ["precaution 1", "precaution 2", ...]

    Returns:
        Created plan ID and summary
    """
    try:
        # Calculate end date
        start_dt = datetime.strptime(start_date, "%Y-%m-%d")
        end_dt = start_dt + timedelta(days=duration_days)
        end_date = end_dt.strftime("%Y-%m-%d")

        # Create care plan
        plan_data = {
            "patient_id": patient_id,
            "plan_name": plan_name,
            "plan_description": plan_description,
            "start_date": start_date,
            "end_date": end_date,
            "status": "active",
        }

        result = await create_care_plan_service(
            plan_data=plan_data,
            tenant_id=tenant_id,
            user_id=user_id
        )

        plan_id = result.get('plan_id')

        # Add medications if provided
        medication_count = 0
        if medications:
            from services.care_plan_service import add_medications_service
            for med in medications:
                med['plan_id'] = plan_id
            await add_medications_service(medications, tenant_id, user_id)
            medication_count = len(medications)

        # Add tasks if provided
        task_count = 0
        if tasks:
            from services.care_plan_service import add_tasks_service
            for task in tasks:
                task['plan_id'] = plan_id
            await add_tasks_service(tasks, tenant_id, user_id)
            task_count = len(tasks)

        # Add precautions if provided
        precaution_count = 0
        if precautions:
            from services.care_plan_service import add_precautions_service
            precaution_list = [{"plan_id": plan_id, "precaution_text": p} for p in precautions]
            await add_precautions_service(precaution_list, tenant_id, user_id)
            precaution_count = len(precautions)

        logger.info(f"Created care plan: {plan_id} for patient: {patient_id}")
        return {
            "success": True,
            "plan_id": plan_id,
            "plan_name": plan_name,
            "start_date": start_date,
            "end_date": end_date,
            "duration_days": duration_days,
            "summary": {
                "medications": medication_count,
                "tasks": task_count,
                "precautions": precaution_count,
            }
        }

    except Exception as e:
        logger.error(f"Error creating care plan: {str(e)}")
        return {"error": str(e)}


@care_plan_tools.tool(
    name="get_patient_care_plans",
    description="Get all care plans for a patient. Use this when doctor asks about patient's current or past rehabilitation plans."
)
async def get_patient_care_plans_tool(
    patient_id: int,
    tenant_id: str,
    status: Optional[str] = None
) -> Dict[str, Any]:
    """
    Get patient's care plans

    Args:
        patient_id: Patient ID
        tenant_id: Tenant ID for data isolation
        status: Filter by status (active/completed/paused)

    Returns:
        Care plan list with names, dates, completion progress, next tasks
    """
    try:
        plans = await get_care_plans_by_patient_service(
            patient_id=patient_id,
            tenant_id=tenant_id,
            status=status
        )

        formatted_plans = []
        for plan in plans:
            # Get plan details to calculate progress
            detail = await get_care_plan_detail_service(
                plan_id=plan.get('plan_id'),
                tenant_id=tenant_id
            )

            # Calculate completion progress
            total_tasks = len(detail.get('tasks', []))
            completed_tasks = len([t for t in detail.get('tasks', []) if t.get('completion_rate', 0) >= 100])
            progress_percentage = (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0

            # Get next task
            next_task = None
            for task in detail.get('tasks', []):
                if task.get('completion_rate', 0) < 100:
                    next_task = {
                        "task_title": task.get('task_title'),
                        "task_description": task.get('task_description'),
                        "frequency": task.get('frequency'),
                    }
                    break

            formatted_plans.append({
                "plan_id": plan.get('plan_id'),
                "plan_name": plan.get('plan_name'),
                "plan_description": plan.get('plan_description'),
                "start_date": plan.get('start_date'),
                "end_date": plan.get('end_date'),
                "status": plan.get('status'),
                "progress_percentage": round(progress_percentage, 1),
                "total_tasks": total_tasks,
                "completed_tasks": completed_tasks,
                "next_task": next_task,
            })

        logger.info(f"Retrieved {len(formatted_plans)} care plans for patient: {patient_id}")
        return {
            "patient_id": patient_id,
            "total_plans": len(formatted_plans),
            "care_plans": formatted_plans
        }

    except Exception as e:
        logger.error(f"Error getting patient care plans: {str(e)}")
        return {"error": str(e)}


@care_plan_tools.tool(
    name="update_care_plan_progress",
    description="Update care plan execution progress including task completion and medication records. Use this when doctor needs to record patient's adherence to the care plan."
)
async def update_care_plan_progress_tool(
    plan_id: int,
    tenant_id: str,
    user_id: str,
    task_completions: Optional[List[Dict]] = None,
    notes: Optional[str] = None
) -> Dict[str, Any]:
    """
    Update care plan progress

    Args:
        plan_id: Care plan ID
        tenant_id: Tenant ID for data isolation
        user_id: Doctor/User ID
        task_completions: Task completion records [{"task_id": int, "completion_date": str, "notes": str}, ...]
        notes: Additional notes

    Returns:
        Update confirmation and current progress summary
    """
    try:
        # Record task completions
        if task_completions:
            for completion in task_completions:
                completion['plan_id'] = plan_id
                await create_task_completion_service(
                    completion_data=completion,
                    tenant_id=tenant_id,
                    user_id=user_id
                )

        # Update plan notes if provided
        if notes:
            await update_care_plan_service(
                plan_id=plan_id,
                plan_data={"notes": notes},
                tenant_id=tenant_id,
                user_id=user_id
            )

        # Get updated plan details
        detail = await get_care_plan_detail_service(plan_id, tenant_id)

        # Calculate new progress
        total_tasks = len(detail.get('tasks', []))
        completed_tasks = len([t for t in detail.get('tasks', []) if t.get('completion_rate', 0) >= 100])
        progress_percentage = (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0

        logger.info(f"Updated care plan progress: {plan_id}")
        return {
            "success": True,
            "plan_id": plan_id,
            "plan_name": detail.get('plan_name'),
            "updated_tasks": len(task_completions) if task_completions else 0,
            "current_progress": {
                "progress_percentage": round(progress_percentage, 1),
                "completed_tasks": completed_tasks,
                "total_tasks": total_tasks,
            }
        }

    except Exception as e:
        logger.error(f"Error updating care plan progress: {str(e)}")
        return {"error": str(e)}


@care_plan_tools.tool(
    name="generate_care_plan_suggestions",
    description="Generate AI-powered care plan suggestions based on patient condition, diagnosis, and treatment stage. Use this to get recommended rehabilitation plans."
)
async def generate_care_plan_suggestions_tool(
    patient_id: int,
    tenant_id: str,
    diagnosis: str,
    treatment_stage: str
) -> Dict[str, Any]:
    """
    Generate care plan suggestions based on patient condition

    Args:
        patient_id: Patient ID
        tenant_id: Tenant ID for data isolation
        diagnosis: Diagnosis
        treatment_stage: Treatment stage (pre-surgery/post-surgery/chemotherapy/recovery)

    Returns:
        AI-generated care plan suggestions with medication recommendations, task suggestions, precautions, reference cases
    """
    try:
        from services.patient_service import get_patient_info

        # Get patient info
        patient = await get_patient_info(patient_id, tenant_id)

        if not patient:
            return {"error": "Patient not found"}

        age = patient.get('age')
        gender = patient.get('gender')

        # Generate suggestions based on diagnosis and treatment stage
        suggestions = {
            "diagnosis": diagnosis,
            "treatment_stage": treatment_stage,
            "patient_demographics": {
                "age": age,
                "gender": gender,
            }
        }

        # Medication suggestions
        medication_suggestions = []
        if treatment_stage == "post-surgery":
            medication_suggestions = [
                {
                    "medication_name": "抗生素（头孢类）",
                    "dosage": "1g",
                    "frequency": "每日2次",
                    "duration_days": 7,
                    "reason": "预防术后感染"
                },
                {
                    "medication_name": "止痛药（布洛芬）",
                    "dosage": "400mg",
                    "frequency": "每日3次，饭后服用",
                    "duration_days": 5,
                    "reason": "缓解术后疼痛"
                }
            ]
        elif treatment_stage == "chemotherapy":
            medication_suggestions = [
                {
                    "medication_name": "止吐药（昂丹司琼）",
                    "dosage": "8mg",
                    "frequency": "化疗前30分钟",
                    "duration_days": "化疗周期内",
                    "reason": "预防化疗引起的恶心呕吐"
                },
                {
                    "medication_name": "升白细胞药（粒细胞集落刺激因子）",
                    "dosage": "遵医嘱",
                    "frequency": "根据血常规结果",
                    "duration_days": "化疗周期内",
                    "reason": "预防白细胞减少"
                }
            ]

        suggestions["medication_suggestions"] = medication_suggestions

        # Task suggestions
        task_suggestions = []
        if treatment_stage == "post-surgery":
            task_suggestions = [
                {
                    "task_title": "伤口护理",
                    "description": "每日检查伤口，保持清洁干燥",
                    "frequency": "每日1次",
                    "importance": "high"
                },
                {
                    "task_title": "轻度活动",
                    "description": "术后第2天开始床边活动，逐步增加活动量",
                    "frequency": "每日2-3次",
                    "importance": "medium"
                },
                {
                    "task_title": "呼吸训练",
                    "description": "深呼吸和咳嗽训练，预防肺部并发症",
                    "frequency": "每日4-6次",
                    "importance": "high"
                }
            ]
        elif treatment_stage == "chemotherapy":
            task_suggestions = [
                {
                    "task_title": "血常规检查",
                    "description": "定期检查血常规，监测白细胞、血小板等指标",
                    "frequency": "每周1次",
                    "importance": "high"
                },
                {
                    "task_title": "营养补充",
                    "description": "高蛋白饮食，少量多餐",
                    "frequency": "每日",
                    "importance": "high"
                },
                {
                    "task_title": "适度运动",
                    "description": "散步或轻度有氧运动，增强体质",
                    "frequency": "每日30分钟",
                    "importance": "medium"
                }
            ]

        suggestions["task_suggestions"] = task_suggestions

        # Precautions
        precautions = []
        if treatment_stage == "post-surgery":
            precautions = [
                "避免剧烈运动，防止伤口裂开",
                "保持伤口清洁干燥，如有红肿、渗液及时就医",
                "按时服药，不可自行停药",
                "注意饮食清淡，避免辛辣刺激食物",
                "充足休息，保证睡眠质量"
            ]
        elif treatment_stage == "chemotherapy":
            precautions = [
                "化疗期间避免感染，少去人多场所",
                "出现发热（体温>38°C）立即就医",
                "多饮水，促进药物代谢",
                "如出现严重恶心呕吐、腹泻，及时联系医生",
                "保持口腔卫生，预防口腔溃疡"
            ]

        suggestions["precautions"] = precautions

        # Reference cases (search similar cases)
        from services.medical_case_service import search_cases
        similar_cases = await search_cases(
            tenant_id=tenant_id,
            search_query=f"{diagnosis} {treatment_stage}",
            limit=3
        )

        suggestions["reference_cases"] = [
            {
                "case_no": case.get('case_no'),
                "diagnosis": case.get('diagnosis'),
                "treatment_outcome": case.get('clinical_outcome', 'Good recovery'),
            }
            for case in similar_cases
        ]

        logger.info(f"Generated care plan suggestions for patient: {patient_id}")
        return suggestions

    except Exception as e:
        logger.error(f"Error generating care plan suggestions: {str(e)}")
        return {"error": str(e)}
