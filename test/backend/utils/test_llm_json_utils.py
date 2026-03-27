from backend.utils.llm_json_utils import extract_json_object


class TestExtractJsonObject:
    def test_extracts_fenced_json_with_surrounding_text(self):
        text = """
        下面是结果说明。

        ```json
        {"nodes": [{"id": "n1", "label": "感冒", "type": "Disease"}], "edges": []}
        ```

        请继续下一步。
        """

        result = extract_json_object(text, required_keys=("nodes", "edges"))

        assert result == {
            "nodes": [{"id": "n1", "label": "感冒", "type": "Disease"}],
            "edges": [],
        }

    def test_skips_earlier_non_matching_object_and_keeps_braces_in_strings(self):
        text = """
        先给出模式说明：{"schema": "{example}"}

        实际结果：
        {
          "nodes": [
            {
              "id": "n1",
              "label": "感冒",
              "type": "Disease",
              "properties": {"description": "症状通常在 { 受凉后 } 出现"}
            }
          ],
          "edges": []
        }
        """

        result = extract_json_object(text, required_keys=("nodes", "edges"))

        assert result is not None
        assert result["nodes"][0]["properties"]["description"] == "症状通常在 { 受凉后 } 出现"

    def test_recovers_after_broken_prefix_object(self):
        text = """
        说明：{broken
        最终输出：
        {"trajectory": [{"date": "2026-03-27", "activated_node_ids": ["n1"]}], "current_nodes": ["n1"]}
        """

        result = extract_json_object(text)

        assert result == {
            "trajectory": [{"date": "2026-03-27", "activated_node_ids": ["n1"]}],
            "current_nodes": ["n1"],
        }

    def test_returns_none_when_no_json_object_exists(self):
        assert extract_json_object("没有结构化输出") is None
