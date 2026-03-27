import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "backend"))
sys.path.insert(0, str(ROOT / "sdk"))

from services.knowledge_graph_service import KnowledgeGraphService
from services.trajectory_service import TrajectoryService


def test_knowledge_graph_parser_accepts_fenced_json_with_trailing_text():
    service = KnowledgeGraphService()
    payload = {
        "nodes": [{"id": "n1", "label": "感冒", "type": "Disease", "properties": {}}],
        "edges": [],
    }
    text = f"先给出结果。\n```json\n{json.dumps(payload, ensure_ascii=False)}\n```\n以上是最终答案。"

    assert service._parse_json_from_llm(text) == payload


def test_knowledge_graph_parser_handles_braces_inside_string_values():
    service = KnowledgeGraphService()
    payload = {
        "nodes": [{
            "id": "n1",
            "label": "HER2",
            "type": "Biomarker",
            "properties": {"description": "IHC {3+} 时通常提示高表达"},
        }],
        "edges": [],
    }
    text = f"分析如下：{json.dumps(payload, ensure_ascii=False)}\n补充说明：见上。"

    assert service._parse_json_from_llm(text) == payload


def test_knowledge_graph_parser_skips_non_graph_object_and_normalizes_wrapper():
    service = KnowledgeGraphService()
    text = """
先给出说明对象：{"note": "ignore"}
最终答案：
{
  "data": {
    "knowledge_graph": {
      "nodes": [{"id": "n1", "label": "感冒", "type": "Disease"}],
      "relationships": [{"id": "e1", "source": "n1", "target": "n1", "type": "associated_with", "weight": 0.8}]
    }
  }
}
"""

    assert service._parse_json_from_llm(text) == {
        "nodes": [{"id": "n1", "label": "感冒", "type": "Disease"}],
        "edges": [{"id": "e1", "source": "n1", "target": "n1", "type": "associated_with", "weight": 0.8}],
    }


def test_trajectory_parser_skips_invalid_braces_and_parses_first_json_object():
    service = TrajectoryService()
    payload = {
        "trajectory": [{"date": "2026-01-15", "activated_node_ids": ["n1", "n2"]}],
        "current_nodes": ["n2"],
    }
    text = (
        "说明里可能会出现占位符 {not-json}。\n"
        f"真正结果：{json.dumps(payload, ensure_ascii=False)}\n"
        "结束。"
    )

    assert service._parse_json(text) == payload
