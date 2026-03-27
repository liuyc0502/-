"""
Knowledge Graph Service - Dynamic Knowledge Subgraph Generation (DKSG)
Core algorithm for building knowledge subgraphs from Elasticsearch documents via LLM extraction.
"""
import json
import logging
import re
from typing import Any, Dict, List, Optional

from nexent.core.utils.observer import MessageObserver, ProcessType

from prompts.knowledge_graph_prompts import (
    ENTITY_RELATION_EXTRACTION_PROMPT,
    ENTITY_TYPES,
    RELATION_TYPES,
)
logger = logging.getLogger(__name__)


class KnowledgeGraphService:
    """Generates dynamic knowledge subgraphs via LLM extraction from ES documents."""

    def __init__(
        self,
        observer: Optional[MessageObserver] = None,
        llm_client=None,
        model_name: str = "",
    ):
        self.observer = observer
        self.llm_client = llm_client
        self.model_name = model_name

    def generate_subgraph(
        self,
        query: str,
        documents: List[Dict[str, Any]],
        patient_context: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Main DKSG algorithm entry point.

        Args:
            query: User's question
            documents: Retrieved ES documents (list of dicts with 'text'/'content' fields)
            patient_context: Optional patient timeline data for trajectory mapping

        Returns:
            Subgraph JSON with nodes, edges, and optional patient position / predictions
        """
        # Step 1: Emit start event
        if self.observer:
            self.observer.add_message(
                "", ProcessType.KNOWLEDGE_GRAPH_START,
                json.dumps({"query": query, "doc_count": len(documents)}, ensure_ascii=False),
            )

        # Step 2: Extract entities and relations via LLM
        doc_texts = self._prepare_document_texts(documents)
        raw_graph = self._extract_entities_relations(query, doc_texts)

        # Step 3: Validate and build subgraph
        subgraph = self._validate_and_build(raw_graph, documents)

        # Step 4: Emit entities event
        if self.observer:
            self.observer.add_message(
                "", ProcessType.KNOWLEDGE_GRAPH_ENTITIES,
                json.dumps({
                    "node_count": len(subgraph["nodes"]),
                    "nodes": subgraph["nodes"][:10],  # preview first 10
                }, ensure_ascii=False),
            )

        # Step 5: Emit relations event
        if self.observer:
            self.observer.add_message(
                "", ProcessType.KNOWLEDGE_GRAPH_RELATIONS,
                json.dumps({
                    "edge_count": len(subgraph["edges"]),
                    "edges": subgraph["edges"][:10],
                }, ensure_ascii=False),
            )

        # Step 6: Emit complete event
        subgraph["query"] = query
        subgraph["card_type"] = "knowledge_graph"
        subgraph["confidence"] = self._compute_graph_confidence(subgraph)

        if self.observer:
            self.observer.add_message(
                "", ProcessType.KNOWLEDGE_GRAPH_COMPLETE,
                json.dumps(subgraph, ensure_ascii=False),
            )

        return subgraph

    # ──────────────────────────────────────────────
    # Internal methods
    # ──────────────────────────────────────────────

    def _prepare_document_texts(self, documents: List[Dict[str, Any]]) -> str:
        """Concatenate retrieved documents into a single text block for LLM."""
        parts = []
        for i, doc in enumerate(documents[:10]):  # cap at 10 docs
            content = doc.get("text") or doc.get("content") or doc.get("document", {}).get("text", "")
            if content:
                title = doc.get("title") or doc.get("document", {}).get("title", f"文档{i+1}")
                parts.append(f"### {title}\n{content[:2000]}")
        return "\n\n".join(parts)

    def _extract_entities_relations(self, query: str, doc_texts: str) -> Dict[str, Any]:
        """Call LLM to extract entities and relationships from documents."""
        prompt = ENTITY_RELATION_EXTRACTION_PROMPT.format(
            query=query,
            documents=doc_texts,
        )

        try:
            response = self.llm_client.chat.completions.create(
                model=self.model_name,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.1,
                max_tokens=4096,
            )
            raw_text = response.choices[0].message.content or ""
            return self._parse_json_from_llm(raw_text)
        except Exception as e:
            logger.error(f"LLM entity extraction failed: {e}", exc_info=True)
            return {"nodes": [], "edges": []}

    def _parse_json_from_llm(self, text: str) -> Dict[str, Any]:
        """Extract graph JSON from LLM output, tolerating wrappers and key aliases."""
        if not text:
            logger.warning("Failed to parse JSON from empty LLM response, returning empty graph")
            return {"nodes": [], "edges": []}

        for candidate in self._iter_json_candidates(text):
            for parsed in self._iter_decoded_json_objects(candidate):
                normalized = self._normalize_graph_payload(parsed)
                if normalized is not None:
                    return normalized

        logger.warning("Failed to parse JSON from LLM response, returning empty graph")
        return {"nodes": [], "edges": []}

    def _iter_json_candidates(self, text: str) -> List[str]:
        """Yield likely JSON-bearing segments, prioritizing fenced code blocks."""
        candidates: List[str] = []
        seen = set()

        fence_matches = re.findall(r"```(?:json)?\s*([\s\S]*?)```", text, flags=re.IGNORECASE)
        for match in fence_matches:
            candidate = match.strip()
            if candidate and candidate not in seen:
                candidates.append(candidate)
                seen.add(candidate)

        cleaned = text.strip()
        if cleaned and cleaned not in seen:
            candidates.append(cleaned)

        return candidates

    def _iter_decoded_json_objects(self, text: str) -> List[Dict[str, Any]]:
        """Decode all JSON objects that can be recovered from text."""
        decoded: List[Dict[str, Any]] = []

        stripped = text.strip()
        if not stripped:
            return decoded

        try:
            parsed = json.loads(stripped)
        except json.JSONDecodeError:
            parsed = None
        if isinstance(parsed, dict):
            decoded.append(parsed)

        decoder = json.JSONDecoder()
        for i, ch in enumerate(stripped):
            if ch != "{":
                continue
            try:
                parsed, _ = decoder.raw_decode(stripped[i:])
            except json.JSONDecodeError:
                continue
            if isinstance(parsed, dict) and parsed not in decoded:
                decoded.append(parsed)

        return decoded

    def _normalize_graph_payload(self, payload: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        """Accept small schema variations and normalize to nodes/edges."""
        if not isinstance(payload, dict):
            return None

        for key in ("graph", "knowledge_graph", "subgraph", "data"):
            nested = payload.get(key)
            if isinstance(nested, dict):
                normalized_nested = self._normalize_graph_payload(nested)
                if normalized_nested is not None:
                    return normalized_nested

        nodes = payload.get("nodes")
        edges = payload.get("edges")
        if edges is None:
            edges = payload.get("relationships")
        if edges is None:
            edges = payload.get("links")
        if nodes is None:
            nodes = payload.get("entities")

        has_graph_keys = any(
            key in payload for key in ("nodes", "edges", "relationships", "links", "entities")
        )
        if not has_graph_keys:
            return None

        if nodes is None:
            nodes = []
        if not isinstance(nodes, list):
            return None
        if edges is None:
            edges = []
        if not isinstance(edges, list):
            return None

        return {"nodes": nodes, "edges": edges}

    def _validate_and_build(
        self, raw_graph: Dict[str, Any], documents: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Validate extracted entities/relations and build final subgraph."""
        nodes = []
        node_ids = set()

        for node in raw_graph.get("nodes", []):
            node_id = node.get("id", "")
            node_type = node.get("type", "")
            if not node_id or not node.get("label"):
                continue
            if node_type not in ENTITY_TYPES:
                node_type = "Disease"  # fallback
                node["type"] = node_type
            node_ids.add(node_id)
            properties = node.get("properties", {})
            if not isinstance(properties, dict):
                properties = {"value": properties}
            nodes.append({
                "id": node_id,
                "label": node["label"],
                "type": node_type,
                "properties": properties,
            })

        edges = []
        for edge in raw_graph.get("edges", []):
            source = edge.get("source", "")
            target = edge.get("target", "")
            edge_type = edge.get("type", "")
            if source not in node_ids or target not in node_ids:
                continue
            if edge_type not in RELATION_TYPES:
                edge_type = "associated_with"
            weight = self._coerce_edge_weight(edge.get("weight", 0.5))
            edges.append({
                "id": edge.get("id", f"e_{source}_{target}"),
                "source": source,
                "target": target,
                "type": edge_type,
                "weight": round(weight, 3),
            })

        return {"nodes": nodes, "edges": edges}

    def _coerce_edge_weight(self, value: Any) -> float:
        """Convert an LLM-provided weight into a safe 0-1 float."""
        try:
            numeric = float(value)
        except (TypeError, ValueError):
            numeric = 0.5
        return max(0.0, min(1.0, numeric))

    def _compute_graph_confidence(self, subgraph: Dict[str, Any]) -> float:
        """Compute overall graph confidence from edge weights."""
        edges = subgraph.get("edges", [])
        if not edges:
            return 0.0
        avg_weight = sum(e.get("weight", 0.5) for e in edges) / len(edges)
        # Factor in graph completeness (more nodes+edges = more confident)
        size_factor = min(1.0, (len(subgraph.get("nodes", [])) + len(edges)) / 20)
        return round(avg_weight * 0.7 + size_factor * 0.3, 3)
