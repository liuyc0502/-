import sys
import types


sys.path.insert(0, "/opt")
sys.path.insert(0, "/opt/backend")


observer_module = types.ModuleType("nexent.core.utils.observer")
observer_module.MessageObserver = object
observer_module.ProcessType = types.SimpleNamespace(
    KNOWLEDGE_GRAPH_START="knowledge_graph_start",
    KNOWLEDGE_GRAPH_ENTITIES="knowledge_graph_entities",
    KNOWLEDGE_GRAPH_RELATIONS="knowledge_graph_relations",
    KNOWLEDGE_GRAPH_COMPLETE="knowledge_graph_complete",
)

sys.modules.setdefault("nexent", types.ModuleType("nexent"))
sys.modules.setdefault("nexent.core", types.ModuleType("nexent.core"))
sys.modules.setdefault("nexent.core.utils", types.ModuleType("nexent.core.utils"))
sys.modules["nexent.core.utils.observer"] = observer_module


from backend.services.knowledge_graph_service import KnowledgeGraphService


def test_parse_json_from_llm_handles_nested_wrapper_payload():
    service = KnowledgeGraphService()
    payload = """
模型分析如下：
```json
{
  "data": {
    "knowledge_graph": {
      "nodes": [{"id": "n1", "label": "感冒", "type": "Disease"}],
      "relationships": []
    }
  }
}
```
"""

    result = service._parse_json_from_llm(payload)

    assert result == {
        "nodes": [{"id": "n1", "label": "感冒", "type": "Disease"}],
        "edges": [],
    }


def test_parse_json_from_llm_accepts_nodes_without_edges():
    service = KnowledgeGraphService()
    payload = '{"nodes": [{"id": "n1", "label": "咳嗽", "type": "PathologicalFeature"}]}'

    result = service._parse_json_from_llm(payload)

    assert result == {
        "nodes": [{"id": "n1", "label": "咳嗽", "type": "PathologicalFeature"}],
        "edges": [],
    }


def test_validate_and_build_coerces_invalid_weight_and_properties():
    service = KnowledgeGraphService()
    raw_graph = {
        "nodes": [
            {"id": "n1", "label": "感冒", "type": "Disease", "properties": "上呼吸道感染"},
            {"id": "n2", "label": "发热", "type": "PathologicalFeature"},
        ],
        "edges": [
            {"source": "n1", "target": "n2", "type": "associated_with", "weight": "high"},
        ],
    }

    result = service._validate_and_build(raw_graph, documents=[])

    assert result["nodes"][0]["properties"] == {"value": "上呼吸道感染"}
    assert result["edges"][0]["weight"] == 0.5
