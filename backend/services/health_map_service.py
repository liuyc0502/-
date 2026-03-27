"""
Health Map Service - Generates patient health maps directly from timeline data.
Unlike the knowledge graph pipeline, this service builds the health map from
structured patient records (PatientTimeline + PatientTimelineDetail + PatientMetrics)
without going through ES search or entity-relation extraction.
"""
import json
import logging
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from database.patient_db import get_patient_by_id, get_patient_timeline, get_timeline_detail
from prompts.health_map_prompts import (
    HEALTH_MAP_ALERT_PROMPT,
    HEALTH_MAP_PREDICTION_PROMPT,
    HEALTH_MAP_SUMMARY_PROMPT,
)
from utils.llm_json_utils import extract_json_object

logger = logging.getLogger(__name__)


class HealthMapService:
    """Generates patient health maps directly from patient timeline database records."""

    def __init__(self, llm_client=None, model_name: str = ""):
        self.llm_client = llm_client
        self.model_name = model_name

    def generate_health_map(
        self,
        patient_id: int,
        tenant_id: str,
    ) -> Optional[Dict[str, Any]]:
        """
        Main entry point: build a patient health map from timeline data.

        Returns:
            PatientHealthMapData dict, or None if no timeline data exists.
        """
        # 1. Get patient info
        patient = get_patient_by_id(patient_id, tenant_id)
        if not patient:
            logger.warning(f"Patient {patient_id} not found in tenant {tenant_id}")
            return None

        # 2. Get timeline stages
        timelines = get_patient_timeline(patient_id, tenant_id)
        if not timelines:
            return None

        # 3. Build events from timeline + details
        events: List[Dict[str, Any]] = []
        all_metrics: List[Dict[str, Any]] = []

        for tl in timelines:
            detail = get_timeline_detail(tl["timeline_id"], tenant_id)
            event = self._build_event(tl, detail)
            events.append(event)
            if detail and detail.get("metrics"):
                all_metrics.extend(detail["metrics"])

        if not events:
            return None

        # 4. Determine current stage and progress
        current_stage = self._determine_current_stage(events)
        journey_progress = self._calculate_progress(events)

        # 5. Build base health map (no LLM needed for core data)
        patient_name = patient.get("name")
        primary_diagnosis = patient.get("diagnosis") or self._extract_diagnosis(events)

        health_map: Dict[str, Any] = {
            "card_type": "patient_health_map",
            "patient_name": patient_name,
            "primary_diagnosis": primary_diagnosis,
            "current_stage": current_stage,
            "journey_progress": journey_progress,
            "events": events,
            "predictions": [],
            "alerts": [],
            "overall_summary": None,
            "generated_at": datetime.now().isoformat(),
            "cache_id": None,
        }

        # 6. Optional LLM enhancements (each independently, failures are non-fatal)
        timeline_summary = self._build_timeline_summary_text(events)

        health_map["overall_summary"] = self._generate_summary(
            patient_name, primary_diagnosis, timeline_summary
        )
        health_map["predictions"] = self._generate_predictions(
            primary_diagnosis, current_stage, timeline_summary
        )

        recent_metrics_text = self._build_metrics_text(all_metrics)
        health_map["alerts"] = self._generate_alerts(
            primary_diagnosis, current_stage, timeline_summary, recent_metrics_text
        )

        # 7. Add rule-based alerts
        rule_alerts = self._generate_rule_based_alerts(events)
        health_map["alerts"] = rule_alerts + health_map["alerts"]

        return health_map

    # ──────────────────────────────────────────────
    # Event building from DB records
    # ──────────────────────────────────────────────

    def _build_event(self, timeline: Dict, detail: Optional[Dict]) -> Dict[str, Any]:
        """Build a HealthMapEvent from a timeline record and its detail."""
        detail_data = detail.get("detail", {}) if detail else {}
        images = detail.get("images", []) if detail else []
        metrics_raw = detail.get("metrics", []) if detail else []

        # Parse medications
        medications = []
        raw_meds = detail_data.get("medications") if detail_data else None
        if raw_meds:
            if isinstance(raw_meds, str):
                try:
                    raw_meds = json.loads(raw_meds)
                except (json.JSONDecodeError, TypeError):
                    raw_meds = []
            if isinstance(raw_meds, list):
                medications = raw_meds

        # Parse suggestions
        suggestions = []
        raw_suggestions = detail_data.get("patient_suggestions") if detail_data else None
        if raw_suggestions:
            if isinstance(raw_suggestions, str):
                try:
                    raw_suggestions = json.loads(raw_suggestions)
                except (json.JSONDecodeError, TypeError):
                    raw_suggestions = []
            if isinstance(raw_suggestions, list):
                suggestions = raw_suggestions

        # Build metrics list
        metrics = []
        for m in metrics_raw:
            metrics.append({
                "name": m.get("metric_name") or m.get("metric_full_name", ""),
                "value": str(m.get("metric_value", "")),
                "unit": m.get("metric_unit", ""),
                "trend": m.get("metric_trend", "stable"),
                "status": m.get("metric_status", "normal"),
            })

        status = (timeline.get("status") or "completed").strip().lower()
        if status not in ("completed", "current", "pending"):
            status = "completed"

        return {
            "event_id": f"evt_{timeline.get('timeline_id', 0)}",
            "date": timeline.get("stage_date") or "",
            "stage_type": timeline.get("stage_type") or "",
            "title": timeline.get("stage_title") or "",
            "diagnosis": timeline.get("diagnosis"),
            "status": status,
            "is_current": status == "current",
            "summary": detail_data.get("patient_summary") if detail_data else None,
            "suggestions": suggestions,
            "medications": medications,
            "metrics": metrics,
            "has_reports": len(images) > 0,
        }

    # ──────────────────────────────────────────────
    # Progress and stage helpers
    # ──────────────────────────────────────────────

    def _determine_current_stage(self, events: List[Dict]) -> Optional[str]:
        """Find the current stage title from events."""
        for event in events:
            if event.get("is_current"):
                return event.get("title")
        # Fallback: last completed event
        completed = [e for e in events if e.get("status") == "completed"]
        if completed:
            return completed[-1].get("title")
        return events[-1].get("title") if events else None

    def _calculate_progress(self, events: List[Dict]) -> float:
        """Calculate journey progress as a ratio."""
        if len(events) <= 1:
            return 0.0
        current_idx = -1
        for i, event in enumerate(events):
            if event.get("is_current"):
                current_idx = i
                break
        if current_idx < 0:
            # Fallback: find last completed
            for i in range(len(events) - 1, -1, -1):
                if events[i].get("status") == "completed":
                    current_idx = i
                    break
        if current_idx < 0:
            return 0.0
        return round(current_idx / (len(events) - 1), 2)

    def _extract_diagnosis(self, events: List[Dict]) -> Optional[str]:
        """Extract primary diagnosis from event data."""
        for event in reversed(events):
            if event.get("diagnosis"):
                return event["diagnosis"]
        return None

    # ──────────────────────────────────────────────
    # Text builders for LLM prompts
    # ──────────────────────────────────────────────

    def _build_timeline_summary_text(self, events: List[Dict]) -> str:
        """Build a plain text summary of the timeline for LLM consumption."""
        lines = []
        for event in events:
            status_label = {"completed": "已完成", "current": "当前", "pending": "待进行"}.get(
                event["status"], ""
            )
            line = f"- [{status_label}] {event['date']} {event['stage_type']}：{event['title']}"
            if event.get("diagnosis"):
                line += f"（诊断：{event['diagnosis']}）"
            if event.get("summary"):
                line += f"\n  说明：{event['summary'][:200]}"
            if event.get("metrics"):
                metric_parts = [
                    f"{m['name']}={m['value']}{m.get('unit', '')}({m.get('trend', '')})"
                    for m in event["metrics"][:5]
                ]
                line += f"\n  指标：{', '.join(metric_parts)}"
            lines.append(line)
        return "\n".join(lines)

    def _build_metrics_text(self, all_metrics: List[Dict]) -> str:
        """Build a plain text summary of recent metrics."""
        if not all_metrics:
            return "暂无检查指标数据"
        # Take the most recent metrics (last ones in the list)
        recent = all_metrics[-10:]
        lines = []
        for m in recent:
            name = m.get("metric_name") or m.get("metric_full_name", "")
            value = m.get("metric_value", "")
            unit = m.get("metric_unit", "")
            trend = m.get("metric_trend", "")
            status = m.get("metric_status", "")
            lines.append(f"- {name}: {value}{unit} (趋势: {trend}, 状态: {status})")
        return "\n".join(lines)

    # ──────────────────────────────────────────────
    # LLM-powered enhancements (optional, non-fatal)
    # ──────────────────────────────────────────────

    def _call_llm(self, prompt: str, max_tokens: int = 1024) -> Optional[str]:
        """Call LLM and return raw text response. Returns None on failure."""
        if not self.llm_client:
            return None
        try:
            response = self.llm_client.chat.completions.create(
                model=self.model_name,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.3,
                max_tokens=max_tokens,
            )
            return response.choices[0].message.content or ""
        except Exception as e:
            logger.warning(f"Health map LLM call failed: {e}")
            return None

    def _parse_json_from_llm(self, text: str) -> Optional[Dict]:
        """Extract JSON from LLM response (handles markdown fences and prose)."""
        parsed = extract_json_object(text)
        if parsed is None:
            logger.warning(f"Failed to parse JSON from LLM response: {text[:200]}")
        return parsed

    def _generate_summary(
        self, patient_name: Optional[str], diagnosis: Optional[str], timeline_summary: str
    ) -> Optional[str]:
        """Generate patient-friendly overall summary via LLM."""
        prompt = HEALTH_MAP_SUMMARY_PROMPT.format(
            patient_name=patient_name or "患者",
            primary_diagnosis=diagnosis or "未明确",
            timeline_summary=timeline_summary,
        )
        result = self._call_llm(prompt, max_tokens=512)
        if result:
            # Clean up any markdown or extra formatting
            return result.strip().strip('"').strip("```").strip()
        return None

    def _generate_predictions(
        self, diagnosis: Optional[str], current_stage: Optional[str], timeline_summary: str
    ) -> List[Dict[str, Any]]:
        """Generate patient-friendly predictions via LLM."""
        prompt = HEALTH_MAP_PREDICTION_PROMPT.format(
            primary_diagnosis=diagnosis or "未明确",
            current_stage=current_stage or "未知",
            timeline_summary=timeline_summary,
        )
        result = self._call_llm(prompt, max_tokens=1024)
        parsed = self._parse_json_from_llm(result) if result else None
        if parsed and isinstance(parsed.get("predictions"), list):
            return parsed["predictions"][:3]
        return []

    def _generate_alerts(
        self,
        diagnosis: Optional[str],
        current_stage: Optional[str],
        timeline_summary: str,
        recent_metrics: str,
    ) -> List[Dict[str, Any]]:
        """Generate patient-friendly alerts via LLM."""
        prompt = HEALTH_MAP_ALERT_PROMPT.format(
            primary_diagnosis=diagnosis or "未明确",
            current_stage=current_stage or "未知",
            timeline_summary=timeline_summary,
            recent_metrics=recent_metrics,
        )
        result = self._call_llm(prompt, max_tokens=1024)
        parsed = self._parse_json_from_llm(result) if result else None
        if parsed and isinstance(parsed.get("alerts"), list):
            return parsed["alerts"][:3]
        return []

    # ──────────────────────────────────────────────
    # Rule-based alerts (no LLM needed)
    # ──────────────────────────────────────────────

    def _generate_rule_based_alerts(self, events: List[Dict]) -> List[Dict[str, Any]]:
        """Generate alerts based on simple rules (no LLM)."""
        alerts: List[Dict[str, Any]] = []

        # Rule 1: Last event was more than 6 months ago
        completed_events = [e for e in events if e.get("status") == "completed" and e.get("date")]
        if completed_events:
            last_date_str = completed_events[-1]["date"]
            try:
                last_date = datetime.strptime(last_date_str, "%Y-%m-%d")
                if datetime.now() - last_date > timedelta(days=180):
                    alerts.append({
                        "message": "您距离上次就诊已超过6个月",
                        "severity": "attention",
                        "action": "建议预约一次复查，了解最新的健康状况",
                    })
            except ValueError:
                pass

        # Rule 2: Any metric with status "error" or "warning" and trend "up" (worsening)
        for event in events:
            if not event.get("is_current"):
                continue
            for metric in event.get("metrics", []):
                if metric.get("status") in ("error", "warning") and metric.get("trend") == "up":
                    alerts.append({
                        "message": f"指标「{metric.get('name', '')}」有上升趋势，请留意",
                        "severity": "attention",
                        "action": "下次复查时可以向医生咨询该指标的变化",
                    })
                    break  # Only one metric alert per event

        return alerts
