import logging
import json
from typing import List, Optional

from database.client import get_db_session, as_dict
from database.db_models import KnowledgeGraphCache

logger = logging.getLogger(__name__)


def _extract_meta(subgraph_json: dict | str | None) -> dict:
    if isinstance(subgraph_json, str):
        try:
            subgraph_json = json.loads(subgraph_json)
        except json.JSONDecodeError:
            return {}
    if not isinstance(subgraph_json, dict):
        return {}
    meta = subgraph_json.get("_meta")
    return meta if isinstance(meta, dict) else {}


def cache_subgraph(cache_id: str, query: str, subgraph_json: dict, tenant_id: str) -> dict:
    """Cache a knowledge subgraph (upsert by cache_id)."""
    node_count = len(subgraph_json.get("nodes", []))
    edge_count = len(subgraph_json.get("edges", []))

    with get_db_session() as session:
        existing = session.query(KnowledgeGraphCache).filter(
            KnowledgeGraphCache.cache_id == cache_id,
            KnowledgeGraphCache.tenant_id == tenant_id,
        ).first()

        if existing:
            existing.query = query
            existing.subgraph_json = subgraph_json
            existing.node_count = node_count
            existing.edge_count = edge_count
            session.commit()
            logger.info(f"Updated cached subgraph: {cache_id}")
            return {"cache_id": cache_id}

        new_record = KnowledgeGraphCache(
            cache_id=cache_id,
            query=query,
            subgraph_json=subgraph_json,
            node_count=node_count,
            edge_count=edge_count,
            tenant_id=tenant_id,
            delete_flag='N',
        )
        session.add(new_record)
        session.commit()
        logger.info(f"Cached subgraph: {cache_id} for query: {query[:50]}")
        return {"cache_id": cache_id}


def get_cached_subgraph(cache_id: str, tenant_id: str) -> Optional[dict]:
    """Retrieve a cached subgraph by cache_id."""
    with get_db_session() as session:
        record = session.query(KnowledgeGraphCache).filter(
            KnowledgeGraphCache.cache_id == cache_id,
            KnowledgeGraphCache.tenant_id == tenant_id,
            KnowledgeGraphCache.delete_flag != 'Y',
        ).first()

        if record:
            return as_dict(record)
        return None


def list_cached_subgraphs(tenant_id: str, limit: int = 20, offset: int = 0) -> List[dict]:
    """List cached subgraphs for a tenant, ordered by most recent."""
    with get_db_session() as session:
        records = session.query(KnowledgeGraphCache).filter(
            KnowledgeGraphCache.tenant_id == tenant_id,
            KnowledgeGraphCache.delete_flag != 'Y',
        ).order_by(
            KnowledgeGraphCache.create_time.desc()
        ).offset(offset).limit(limit).all()

        items = []
        for record in records:
            meta = _extract_meta(record.subgraph_json)
            items.append({
                "cache_id": record.cache_id,
                "query": record.query,
                "node_count": record.node_count,
                "edge_count": record.edge_count,
                "create_time": record.create_time.isoformat() if record.create_time else None,
                "portal_type": meta.get("portal_type"),
                "patient_id": meta.get("patient_id"),
                "source": meta.get("source"),
            })
        return items


def delete_cached_subgraph(cache_id: str, tenant_id: str) -> bool:
    """Soft-delete a cached subgraph."""
    with get_db_session() as session:
        record = session.query(KnowledgeGraphCache).filter(
            KnowledgeGraphCache.cache_id == cache_id,
            KnowledgeGraphCache.tenant_id == tenant_id,
        ).first()

        if not record:
            return False

        record.delete_flag = 'Y'
        session.commit()
        logger.info(f"Soft-deleted cached subgraph: {cache_id}")
        return True
