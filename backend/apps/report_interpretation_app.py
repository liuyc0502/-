import json
import logging
from http import HTTPStatus
from typing import Optional
from datetime import datetime

from fastapi import APIRouter, HTTPException, Header
from starlette.responses import JSONResponse

from database import report_interpretation_db
from utils.auth_utils import get_current_user_id

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/report-center/list/{patient_id}")
async def get_report_list(
    patient_id: int,
    authorization: Optional[str] = Header(None)
):
    try:
        user_id, tenant_id = get_current_user_id(authorization)
        if not user_id or not tenant_id:
            raise HTTPException(status_code=HTTPStatus.UNAUTHORIZED, detail="Unauthorized")

        interpretations = report_interpretation_db.list_interpretations_by_patient(patient_id, tenant_id)
        interp_map = {r['report_id']: r for r in interpretations}

        report_list = []

        lab_reports = report_interpretation_db.get_all_lab_reports(patient_id, tenant_id)
        for report in lab_reports:
            rid = f"lab_{report['report_id']}"
            interp = interp_map.get(rid)
            report_list.append({
                "report_id": rid,
                "report_type": "lab",
                "report_title": report.get('report_type') or "检验报告",
                "report_date": report.get('report_date', ''),
                "source_timeline_id": report.get('timeline_id'),
                "interpretation_status": "ready" if interp else "pending",
                "severity": interp.get('severity') if interp else None,
                "summary": interp.get('summary') if interp else None,
            })

        imaging_reports = report_interpretation_db.get_all_imaging_reports(patient_id, tenant_id)
        for report in imaging_reports:
            rid = f"imaging_{report['report_id']}"
            interp = interp_map.get(rid)
            report_list.append({
                "report_id": rid,
                "report_type": "imaging",
                "report_title": report.get('imaging_type') or "影像报告",
                "report_date": report.get('imaging_date', ''),
                "source_timeline_id": report.get('timeline_id'),
                "interpretation_status": "ready" if interp else "pending",
                "severity": interp.get('severity') if interp else None,
                "summary": interp.get('summary') if interp else None,
            })

        report_list.sort(key=lambda x: x.get('report_date', ''), reverse=True)
        return JSONResponse(status_code=HTTPStatus.OK, content=report_list)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting report list: {str(e)}")
        raise HTTPException(status_code=HTTPStatus.INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/report-center/{patient_id}/interpretation/{report_id}")
async def get_interpretation(
    patient_id: int,
    report_id: str,
    authorization: Optional[str] = Header(None)
):
    try:
        user_id, tenant_id = get_current_user_id(authorization)
        if not user_id or not tenant_id:
            raise HTTPException(status_code=HTTPStatus.UNAUTHORIZED, detail="Unauthorized")

        interp = report_interpretation_db.get_interpretation_by_report(patient_id, report_id, tenant_id)
        if not interp:
            raise HTTPException(status_code=HTTPStatus.NOT_FOUND, detail="Interpretation not found")

        result = json.loads(interp['interpretation_json']) if interp.get('interpretation_json') else {}
        return JSONResponse(status_code=HTTPStatus.OK, content=result)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting interpretation: {str(e)}")
        raise HTTPException(status_code=HTTPStatus.INTERNAL_SERVER_ERROR, detail=str(e))


@router.post("/report-center/{patient_id}/interpret/{report_id}")
async def interpret_report(
    patient_id: int,
    report_id: str,
    authorization: Optional[str] = Header(None)
):
    """Trigger AI interpretation for a report (returns cached if exists)"""
    try:
        user_id, tenant_id = get_current_user_id(authorization)
        if not user_id or not tenant_id:
            raise HTTPException(status_code=HTTPStatus.UNAUTHORIZED, detail="Unauthorized")

        existing = report_interpretation_db.get_interpretation_by_report(patient_id, report_id, tenant_id)
        if existing and existing.get('interpretation_json'):
            return JSONResponse(status_code=HTTPStatus.OK, content=json.loads(existing['interpretation_json']))

        interpretation = await _generate_interpretation(patient_id, report_id, tenant_id, user_id)
        return JSONResponse(status_code=HTTPStatus.OK, content=interpretation)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error interpreting report: {str(e)}")
        raise HTTPException(status_code=HTTPStatus.INTERNAL_SERVER_ERROR, detail=str(e))


@router.post("/report-center/{patient_id}/reinterpret/{report_id}")
async def reinterpret_report(
    patient_id: int,
    report_id: str,
    authorization: Optional[str] = Header(None)
):
    try:
        user_id, tenant_id = get_current_user_id(authorization)
        if not user_id or not tenant_id:
            raise HTTPException(status_code=HTTPStatus.UNAUTHORIZED, detail="Unauthorized")

        report_interpretation_db.delete_interpretation_by_report(patient_id, report_id, tenant_id)
        interpretation = await _generate_interpretation(patient_id, report_id, tenant_id, user_id)
        return JSONResponse(status_code=HTTPStatus.OK, content=interpretation)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error reinterpreting report: {str(e)}")
        raise HTTPException(status_code=HTTPStatus.INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/report-center/{patient_id}/trends")
async def get_metric_trends(
    patient_id: int,
    authorization: Optional[str] = Header(None)
):
    try:
        user_id, tenant_id = get_current_user_id(authorization)
        if not user_id or not tenant_id:
            raise HTTPException(status_code=HTTPStatus.UNAUTHORIZED, detail="Unauthorized")

        items = report_interpretation_db.get_lab_report_items_for_trends(patient_id, tenant_id)

        groups: dict = {}
        for item in items:
            name = item.get('test_item_name', '')
            if not name:
                continue
            if name not in groups:
                groups[name] = {
                    "metric_name": name,
                    "metric_unit": item.get('test_unit', ''),
                    "normal_range": item.get('reference_range', ''),
                    "data_points": [],
                    "current_status": "normal"
                }

            try:
                value = float(item.get('test_result', '0').replace('>', '').replace('<', '').strip())
            except (ValueError, TypeError):
                continue

            abnormal_flag = item.get('abnormal_flag', '')
            is_abnormal = abnormal_flag in ('↑', '↓', 'high', 'low', 'critical')

            groups[name]["data_points"].append({
                "date": item.get('report_date', ''),
                "value": value,
                "report_title": item.get('report_type_name', '检验报告'),
                "is_abnormal": is_abnormal
            })

        trends = []
        for name, trend in groups.items():
            if not trend["data_points"]:
                continue
            trend["data_points"].sort(key=lambda x: x["date"])
            latest = trend["data_points"][-1]
            if latest["is_abnormal"]:
                trend["current_status"] = "abnormal"
            trends.append(trend)

        trends.sort(key=lambda x: (0 if x["current_status"] == "abnormal" else 1, x["metric_name"]))
        return JSONResponse(status_code=HTTPStatus.OK, content=trends)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting metric trends: {str(e)}")
        raise HTTPException(status_code=HTTPStatus.INTERNAL_SERVER_ERROR, detail=str(e))


async def _generate_interpretation(patient_id: int, report_id: str, tenant_id: str, user_id: str) -> dict:
    """
    Generate AI interpretation for a report.
    Builds report context, calls LLM with a patient-friendly prompt, and caches result.
    """
    report_type = report_id.split("_")[0] if "_" in report_id else "lab"
    raw_id = report_id.split("_", 1)[1] if "_" in report_id else report_id

    report_title = "报告"
    report_date = ""
    report_content = ""

    if report_type == "lab":
        report_data = report_interpretation_db.get_lab_report_with_items(int(raw_id), tenant_id)
        if report_data:
            report_title = report_data.get('report_type') or "检验报告"
            report_date = report_data.get('report_date', '')
            items = report_data.get('items', [])
            lines = []
            for item in items:
                line = f"- {item.get('test_item_name', '')}: {item.get('test_result', '')} {item.get('test_unit', '')}"
                if item.get('reference_range'):
                    line += f" (参考范围: {item['reference_range']})"
                if item.get('abnormal_flag') and item['abnormal_flag'] != '正常':
                    line += f" [{item['abnormal_flag']}]"
                lines.append(line)
            report_content = "\n".join(lines)
    elif report_type == "imaging":
        reports = report_interpretation_db.get_all_imaging_reports(patient_id, tenant_id)
        for r in reports:
            if str(r.get('report_id')) == raw_id:
                report_title = r.get('imaging_type') or "影像报告"
                report_date = r.get('imaging_date', '')
                parts = []
                if r.get('imaging_findings'):
                    parts.append(f"检查所见: {r['imaging_findings']}")
                if r.get('diagnostic_impression'):
                    parts.append(f"诊断印象: {r['diagnostic_impression']}")
                if r.get('recommendations'):
                    parts.append(f"建议: {r['recommendations']}")
                report_content = "\n".join(parts)
                break

    # Call LLM for interpretation
    interpretation = await _call_llm_for_interpretation(report_title, report_date, report_type, report_content, tenant_id)
    interpretation["report_id"] = report_id
    interpretation["report_type"] = report_type
    interpretation["report_title"] = report_title
    interpretation["report_date"] = report_date
    interpretation["generated_at"] = datetime.now().isoformat()

    # Cache to DB
    interpretation_json = json.dumps(interpretation, ensure_ascii=False)
    report_interpretation_db.save_interpretation({
        "patient_id": patient_id,
        "report_id": report_id,
        "report_type": report_type,
        "interpretation_json": interpretation_json,
        "severity": interpretation.get("severity", "green"),
        "summary": (interpretation.get("plain_summary") or "")[:200],
    }, tenant_id, user_id)

    return interpretation


async def _call_llm_for_interpretation(report_title: str, report_date: str, report_type: str, report_content: str, tenant_id: str) -> dict:
    """
    Call LLM to generate a patient-friendly interpretation.
    Uses OpenAI-compatible API via the project's model infrastructure.
    """
    from openai import AsyncOpenAI
    from consts.const import MODEL_CONFIG_MAPPING
    from utils.config_utils import get_model_name_from_config, tenant_config_manager

    model_config = tenant_config_manager.get_model_config(MODEL_CONFIG_MAPPING["llm"], tenant_id=tenant_id)
    model_name = get_model_name_from_config(model_config)

    system_prompt = """你是一名面向患者的医学报告解读助手。你的任务是将专业医学报告翻译成通俗易懂的大白话，让没有医学背景的普通人也能理解。

请严格按照以下JSON格式输出（不要包含markdown代码块标记）：
{
  "severity": "green/yellow/red",
  "severity_label": "情况正常/需要关注/建议尽快就医",
  "plain_summary": "用1-3句大白话总结报告的核心内容",
  "sections": [
    {
      "id": "conclusion",
      "title": "核心结论",
      "icon": "📋",
      "content": "用简单语言说明主要发现"
    },
    {
      "id": "findings",
      "title": "关键发现",
      "icon": "🔍",
      "items": [
        {"label": "指标名", "value": "数值", "explanation": "通俗解释", "status": "normal/abnormal/warning"}
      ]
    },
    {
      "id": "terms",
      "title": "术语解释",
      "icon": "📖",
      "content": "把报告中的专业词汇翻译成日常用语"
    },
    {
      "id": "attention",
      "title": "需要关注",
      "icon": "⚠️",
      "content": "异常项目和注意事项",
      "highlight": true/false
    }
  ],
  "next_steps": ["建议1", "建议2"],
  "disclaimer": "本解读由AI生成，仅供参考，不构成医疗建议。如有疑问，请咨询您的主治医生。"
}

严重程度判断标准：
- green: 所有指标正常或轻微偏差
- yellow: 有指标异常但不紧急
- red: 有指标严重异常，需要尽快就医"""

    user_prompt = f"""请解读以下{report_title}（日期: {report_date}）：

{report_content if report_content else "（报告内容暂无详细数据）"}

请用大白话解释，让患者能看懂。"""

    try:
        client = AsyncOpenAI(
            base_url=model_config.get("base_url", ""),
            api_key=model_config.get("api_key", ""),
        )

        response = await client.chat.completions.create(
            model=model_name,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.3,
        )

        content = response.choices[0].message.content.strip()
        # Strip markdown code block if present
        if content.startswith("```"):
            content = content.split("\n", 1)[1] if "\n" in content else content[3:]
            if content.endswith("```"):
                content = content[:-3]
            content = content.strip()

        interpretation = json.loads(content)
        return interpretation

    except Exception as e:
        logger.error(f"LLM interpretation call failed: {str(e)}")
        # Fallback structure
        return {
            "severity": "green",
            "severity_label": "待解读",
            "plain_summary": f"AI解读暂时不可用，请稍后重试。报告: {report_title}",
            "sections": [
                {"id": "conclusion", "title": "核心结论", "icon": "📋", "content": "AI解读服务暂时不可用，请稍后再试。"}
            ],
            "next_steps": ["请咨询您的主治医生了解报告详情"],
            "disclaimer": "本解读由AI生成，仅供参考，不构成医疗建议。如有疑问，请咨询您的主治医生。"
        }
