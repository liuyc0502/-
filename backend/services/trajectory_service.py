"""
Trajectory Service - Patient trajectory mapping, Predictive Path Scoring (PPS),
and Anomaly Path Detection (APD).
"""
import json
import logging
from typing import Any, Dict, List, Optional

from nexent.core.utils.observer import MessageObserver, ProcessType

from prompts.knowledge_graph_prompts import (
    TRAJECTORY_MAPPING_PROMPT,
    PREDICTIVE_PATH_SCORING_PROMPT,
    ANOMALY_ASSESSMENT_PROMPT,
)
from utils.llm_json_utils import extract_json_object

logger = logging.getLogger(__name__)


class TrajectoryService:
    """Maps patient timelines onto knowledge graphs and runs predictions."""

    def __init__(
        self,
        observer: Optional[MessageObserver] = None,
        llm_client=None,
        model_name: str = "",
    ):
        self.observer = observer
        self.llm_client = llm_client
        self.model_name = model_name

    def map_patient_trajectory(
        self,
        subgraph: Dict[str, Any],
        timeline_events: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """
        Map patient timeline events onto knowledge subgraph nodes.

        Args:
            subgraph: Knowledge subgraph with nodes and edges
            timeline_events: Patient timeline records from patient_db

        Returns:
            Patient position data with trajectory and current nodes
        """
        graph_nodes_text = json.dumps(
            [{"id": n["id"], "label": n["label"], "type": n["type"]}
             for n in subgraph.get("nodes", [])],
            ensure_ascii=False,
        )

        events_text = self._format_timeline_events(timeline_events)

        prompt = TRAJECTORY_MAPPING_PROMPT.format(
            graph_nodes=graph_nodes_text,
            timeline_events=events_text,
        )

        try:
            response = self.llm_client.chat.completions.create(
                model=self.model_name,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.1,
                max_tokens=2048,
            )
            raw_text = response.choices[0].message.content or ""
            mapping = self._parse_json(raw_text)

            # Validate node IDs
            valid_ids = {n["id"] for n in subgraph.get("nodes", [])}
            trajectory = []
            for entry in mapping.get("trajectory", []):
                valid_node_ids = [nid for nid in entry.get("activated_node_ids", []) if nid in valid_ids]
                if valid_node_ids:
                    trajectory.append({
                        "date": entry.get("date", ""),
                        "node_ids": valid_node_ids,
                    })

            current_nodes = [nid for nid in mapping.get("current_nodes", []) if nid in valid_ids]

            return {
                "current_nodes": current_nodes,
                "visit_history": trajectory,
            }
        except Exception as e:
            logger.error(f"Trajectory mapping failed: {e}", exc_info=True)
            return {"current_nodes": [], "visit_history": []}

    def predict_paths(
        self,
        subgraph: Dict[str, Any],
        patient_position: Dict[str, Any],
    ) -> List[Dict[str, Any]]:
        """
        Predictive Path Scoring (PPS) - predict likely next developments.

        Returns list of predictions sorted by probability.
        """
        graph_structure = json.dumps({
            "nodes": [{"id": n["id"], "label": n["label"], "type": n["type"]}
                      for n in subgraph.get("nodes", [])],
            "edges": [{"source": e["source"], "target": e["target"],
                       "type": e["type"], "weight": e["weight"]}
                      for e in subgraph.get("edges", [])],
        }, ensure_ascii=False)

        prompt = PREDICTIVE_PATH_SCORING_PROMPT.format(
            graph_structure=graph_structure,
            current_position=json.dumps(patient_position.get("current_nodes", []), ensure_ascii=False),
            patient_trajectory=json.dumps(patient_position.get("visit_history", []), ensure_ascii=False),
        )

        try:
            response = self.llm_client.chat.completions.create(
                model=self.model_name,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.2,
                max_tokens=2048,
            )
            raw_text = response.choices[0].message.content or ""
            result = self._parse_json(raw_text)
            predictions = result.get("predictions", [])

            # Validate and emit
            validated = []
            for pred in predictions[:5]:
                validated.append({
                    "target_node": pred.get("target_node", {}),
                    "probability": max(0.0, min(1.0, float(pred.get("probability", 0)))),
                    "reasoning": pred.get("reasoning", ""),
                    "timeframe": pred.get("timeframe", ""),
                })

            if self.observer and validated:
                self.observer.add_message(
                    "", ProcessType.TRAJECTORY_PREDICTION,
                    json.dumps({"predictions": validated}, ensure_ascii=False),
                )

            return validated
        except Exception as e:
            logger.error(f"Path prediction failed: {e}", exc_info=True)
            return []

    def detect_anomalies(
        self,
        subgraph: Dict[str, Any],
        patient_position: Dict[str, Any],
    ) -> List[Dict[str, Any]]:
        """
        Anomaly Path Detection (APD) - detect deviations from typical paths.

        Returns list of anomalies with clinical significance.
        """
        graph_structure = json.dumps({
            "nodes": [{"id": n["id"], "label": n["label"], "type": n["type"]}
                      for n in subgraph.get("nodes", [])],
            "edges": [{"source": e["source"], "target": e["target"],
                       "type": e["type"], "weight": e["weight"]}
                      for e in subgraph.get("edges", [])],
        }, ensure_ascii=False)

        # Derive typical paths from graph edges with high weights
        typical_paths = self._derive_typical_paths(subgraph)

        prompt = ANOMALY_ASSESSMENT_PROMPT.format(
            graph_structure=graph_structure,
            patient_trajectory=json.dumps(patient_position.get("visit_history", []), ensure_ascii=False),
            typical_paths=json.dumps(typical_paths, ensure_ascii=False),
        )

        try:
            response = self.llm_client.chat.completions.create(
                model=self.model_name,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.1,
                max_tokens=2048,
            )
            raw_text = response.choices[0].message.content or ""
            result = self._parse_json(raw_text)
            anomalies = result.get("anomalies", [])

            validated = []
            for anom in anomalies:
                score = max(0.0, min(1.0, float(anom.get("anomaly_score", 0))))
                if score >= 0.3:  # only report meaningful anomalies
                    validated.append({
                        "node_id": anom.get("node_id", ""),
                        "expected_path": anom.get("expected_path", ""),
                        "actual_path": anom.get("actual_path", ""),
                        "anomaly_score": round(score, 3),
                        "clinical_significance": anom.get("clinical_significance", ""),
                    })

            if self.observer and validated:
                self.observer.add_message(
                    "", ProcessType.TRAJECTORY_ANOMALY,
                    json.dumps({"anomalies": validated}, ensure_ascii=False),
                )

            return validated
        except Exception as e:
            logger.error(f"Anomaly detection failed: {e}", exc_info=True)
            return []

    # ──────────────────────────────────────────────
    # Internal helpers
    # ──────────────────────────────────────────────

    def _format_timeline_events(self, events: List[Dict[str, Any]]) -> str:
        """Format timeline events into readable text for LLM."""
        parts = []
        for ev in events:
            date = ev.get("stage_date", "未知日期")
            stage_type = ev.get("stage_type", "")
            title = ev.get("stage_title", "")
            diagnosis = ev.get("diagnosis", "")
            detail = ev.get("detail", {})
            pathology = detail.get("pathology_findings", "") if isinstance(detail, dict) else ""
            medications = detail.get("medications", "") if isinstance(detail, dict) else ""

            line = f"- {date} [{stage_type}] {title}"
            if diagnosis:
                line += f" | 诊断: {diagnosis}"
            if pathology:
                line += f" | 病理: {pathology}"
            if medications:
                line += f" | 用药: {medications}"
            parts.append(line)
        return "\n".join(parts) if parts else "无时间轴事件"

    def _derive_typical_paths(self, subgraph: Dict[str, Any]) -> List[str]:
        """Derive typical progression paths from graph edges with high weights."""
        node_map = {n["id"]: n["label"] for n in subgraph.get("nodes", [])}
        paths = []
        for edge in subgraph.get("edges", []):
            if edge.get("type") == "progresses_to" and edge.get("weight", 0) >= 0.5:
                src = node_map.get(edge["source"], edge["source"])
                tgt = node_map.get(edge["target"], edge["target"])
                paths.append(f"{src} → {tgt} (置信度: {edge['weight']})")
        return paths if paths else ["无明显典型路径（基于当前图谱）"]

    def _parse_json(self, text: str) -> Dict[str, Any]:
        """Extract the first valid JSON object from an LLM response."""
        return extract_json_object(text) or {}
