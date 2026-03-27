"""
Knowledge Graph API endpoints - Generate knowledge subgraphs from ES documents,
map patient trajectories, and manage graph history.
Used by the standalone Knowledge Graph Explorer page.
"""
import hashlib
import json
import logging
from http import HTTPStatus
from typing import Any, Optional

from fastapi import APIRouter, HTTPException, Header
from fastapi.responses import JSONResponse
from openai import OpenAI
from pydantic import BaseModel, Field

from consts.const import ES_HOST, ES_API_KEY
from database.patient_db import get_patient_timeline, get_timeline_detail
from services.knowledge_graph_service import KnowledgeGraphService
from services.trajectory_service import TrajectoryService
from services.health_map_service import HealthMapService
from utils.auth_utils import get_current_user_id
from utils.config_utils import tenant_config_manager
from utils.patient_auth_utils import get_patient_id_from_user_id

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/knowledge-graph", tags=["Knowledge Graph"])
PORTAL_DOCTOR = "doctor"
PORTAL_PATIENT = "patient"


class KGGenerateRequest(BaseModel):
    query: str = Field(..., description="Medical query to build the knowledge graph around")
    patient_id: Optional[int] = Field(None, description="Optional patient ID for trajectory mapping")
    include_predictions: bool = Field(True, description="Whether to run PPS")
    include_anomalies: bool = Field(True, description="Whether to run APD")
    portal_type: str = Field(PORTAL_DOCTOR, description="Portal scope for the generated graph")


class KGPredictRequest(BaseModel):
    subgraph: dict = Field(..., description="Existing subgraph data")
    patient_id: int = Field(..., description="Patient ID for trajectory analysis")


def _get_llm_client(tenant_id: str):
    """Resolve LLM client from tenant config."""
    from consts.const import MODEL_CONFIG_MAPPING
    from utils.config_utils import get_model_name_from_config

    model_config = tenant_config_manager.get_model_config(
        MODEL_CONFIG_MAPPING["llm"], tenant_id=tenant_id)
    if not model_config:
        raise HTTPException(status_code=HTTPStatus.BAD_REQUEST, detail="No LLM model configured")

    client = OpenAI(
        api_key=model_config.get("api_key", ""),
        base_url=model_config.get("base_url", ""),
    )
    model_name = get_model_name_from_config(model_config)
    return client, model_name


def _search_documents(query: str, tenant_id: str):
    """Search ES knowledge base for relevant documents."""
    from nexent.vector_database.elasticsearch_core import ElasticSearchCore
    from database.knowledge_db import get_knowledge_info_by_tenant_id

    records = get_knowledge_info_by_tenant_id(tenant_id)
    index_names = [r["index_name"] for r in records if r.get("index_name")]
    if not index_names:
        return []

    es_core = ElasticSearchCore(host=ES_HOST, api_key=ES_API_KEY)
    return es_core.accurate_search(index_names, query, top_k=8)


@router.post("/generate")
async def generate_knowledge_graph(
    request: KGGenerateRequest,
    authorization: Optional[str] = Header(None),
):
    """Generate a knowledge subgraph for a medical query."""
    user_id, tenant_id = get_current_user_id(authorization)
    if not user_id or not tenant_id:
        raise HTTPException(status_code=HTTPStatus.UNAUTHORIZED, detail="Unauthorized")

    try:
        # 1. Get LLM client
        llm_client, model_name = _get_llm_client(tenant_id)

        # 2. Search ES for documents
        documents = _search_documents(request.query, tenant_id)
        if not documents:
            return JSONResponse(content={
                "success": False,
                "error": "No relevant documents found in knowledge base",
            })

        # 3. Generate subgraph via DKSG
        kg_service = KnowledgeGraphService(
            llm_client=llm_client,
            model_name=model_name,
        )
        subgraph = kg_service.generate_subgraph(query=request.query, documents=documents)
        if not subgraph.get("nodes"):
            return JSONResponse(content={
                "success": False,
                "error": "未能从检索结果中生成结构化知识图谱，请尝试缩短或明确查询后重试",
            })

        # 4. Map patient trajectory if requested
        if request.patient_id:
            subgraph = _enrich_with_trajectory(
                subgraph, request.patient_id, tenant_id,
                llm_client, model_name,
                request.include_predictions, request.include_anomalies,
            )

        # 5. Cache the result
        portal_type = _normalize_portal_type(request.portal_type)
        cache_id = _cache_subgraph(
            query=request.query,
            subgraph=subgraph,
            tenant_id=tenant_id,
            portal_type=portal_type,
            patient_id=request.patient_id,
            user_id=user_id,
            source="doctor_explorer" if portal_type == PORTAL_DOCTOR else "knowledge_graph",
        )
        subgraph["cache_id"] = cache_id

        return JSONResponse(content={
            "success": True,
            "knowledge_graph": subgraph,
            "cache_id": cache_id,
        })

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Knowledge graph generation failed: {e}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": str(e)},
        )


@router.post("/patient-map/generate")
async def generate_patient_health_map(
    authorization: Optional[str] = Header(None),
):
    """Generate a patient-scoped health map directly from patient timeline data."""
    user_id, tenant_id = get_current_user_id(authorization)
    if not user_id or not tenant_id:
        raise HTTPException(status_code=HTTPStatus.UNAUTHORIZED, detail="Unauthorized")

    patient_id = get_patient_id_from_user_id(user_id, tenant_id, authorization)
    if not patient_id:
        raise HTTPException(status_code=HTTPStatus.NOT_FOUND, detail="Patient not found")

    try:
        # Use HealthMapService to build directly from timeline data
        llm_client, model_name = _get_llm_client(tenant_id)

        service = HealthMapService(llm_client=llm_client, model_name=model_name)
        health_map = service.generate_health_map(int(patient_id), tenant_id)

        if not health_map or not health_map.get("events"):
            return JSONResponse(content={
                "success": True,
                "generated": False,
                "empty_state": "insufficient_patient_data",
                "message": "暂无可生成的健康资料",
            })

        # Cache using existing mechanism
        cache_id = _cache_subgraph(
            query=health_map.get("primary_diagnosis") or "patient_health_map",
            subgraph=health_map,
            tenant_id=tenant_id,
            portal_type=PORTAL_PATIENT,
            patient_id=int(patient_id),
            user_id=user_id,
            source="patient_health_map_v2",
        )
        health_map["cache_id"] = cache_id

        return JSONResponse(content={
            "success": True,
            "generated": True,
            "health_map": health_map,
            "cache_id": cache_id,
        })
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Patient health map generation failed: {e}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": str(e)},
        )


@router.post("/predict")
async def predict_trajectory(
    request: KGPredictRequest,
    authorization: Optional[str] = Header(None),
):
    """Run PPS + APD on an existing subgraph with patient data."""
    user_id, tenant_id = get_current_user_id(authorization)
    if not user_id or not tenant_id:
        raise HTTPException(status_code=HTTPStatus.UNAUTHORIZED, detail="Unauthorized")

    try:
        llm_client, model_name = _get_llm_client(tenant_id)
        subgraph = _enrich_with_trajectory(
            request.subgraph, request.patient_id, tenant_id,
            llm_client, model_name, True, True,
        )
        return JSONResponse(content={"success": True, "knowledge_graph": subgraph})

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Trajectory prediction failed: {e}", exc_info=True)
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})


@router.get("/history")
async def list_graph_history(
    authorization: Optional[str] = Header(None),
    limit: int = 20,
    offset: int = 0,
    portal_type: Optional[str] = None,
):
    """List previously generated knowledge graphs for this tenant."""
    user_id, tenant_id = get_current_user_id(authorization)
    if not user_id or not tenant_id:
        raise HTTPException(status_code=HTTPStatus.UNAUTHORIZED, detail="Unauthorized")

    from database.knowledge_graph_db import list_cached_subgraphs
    items = list_cached_subgraphs(tenant_id, limit=limit, offset=offset)
    if portal_type:
        patient_id = None
        normalized_portal = _normalize_portal_type(portal_type)
        if normalized_portal == PORTAL_PATIENT:
            patient_id = get_patient_id_from_user_id(user_id, tenant_id, authorization)
            if not patient_id:
                return JSONResponse(content={"success": True, "items": []})
        items = _filter_history_items(items, normalized_portal, patient_id)
    return JSONResponse(content={"success": True, "items": items})


@router.get("/history/{cache_id}")
async def get_graph_by_cache_id(
    cache_id: str,
    authorization: Optional[str] = Header(None),
    portal_type: Optional[str] = None,
):
    """Retrieve a previously cached knowledge graph."""
    user_id, tenant_id = get_current_user_id(authorization)
    if not user_id or not tenant_id:
        raise HTTPException(status_code=HTTPStatus.UNAUTHORIZED, detail="Unauthorized")

    from database.knowledge_graph_db import get_cached_subgraph
    result = get_cached_subgraph(cache_id, tenant_id)
    if not result:
        raise HTTPException(status_code=404, detail="Knowledge graph not found")
    if portal_type:
        patient_id = None
        normalized_portal = _normalize_portal_type(portal_type)
        if normalized_portal == PORTAL_PATIENT:
            patient_id = get_patient_id_from_user_id(user_id, tenant_id, authorization)
            if not patient_id:
                raise HTTPException(status_code=404, detail="Knowledge graph not found")
        if not _is_record_visible(result, normalized_portal, patient_id):
            raise HTTPException(status_code=404, detail="Knowledge graph not found")

    # Detect health map v2 format vs legacy knowledge graph format
    subgraph_json = result.get("subgraph_json") or result
    if isinstance(subgraph_json, str):
        try:
            subgraph_json = json.loads(subgraph_json)
        except (json.JSONDecodeError, TypeError):
            subgraph_json = result

    card_type = subgraph_json.get("card_type") if isinstance(subgraph_json, dict) else None
    if card_type == "patient_health_map":
        return JSONResponse(content={"success": True, "health_map": result})

    return JSONResponse(content={"success": True, "knowledge_graph": result})


@router.delete("/history/{cache_id}")
async def delete_graph_history(
    cache_id: str,
    authorization: Optional[str] = Header(None),
    portal_type: Optional[str] = None,
):
    """Soft-delete a cached knowledge graph history record."""
    user_id, tenant_id = get_current_user_id(authorization)
    if not user_id or not tenant_id:
        raise HTTPException(status_code=HTTPStatus.UNAUTHORIZED, detail="Unauthorized")

    from database.knowledge_graph_db import get_cached_subgraph, delete_cached_subgraph

    record = get_cached_subgraph(cache_id, tenant_id)
    if not record:
        raise HTTPException(status_code=HTTPStatus.NOT_FOUND, detail="Knowledge graph not found")

    if portal_type:
        patient_id = None
        normalized_portal = _normalize_portal_type(portal_type)
        if normalized_portal == PORTAL_PATIENT:
            patient_id = get_patient_id_from_user_id(user_id, tenant_id, authorization)
            if not patient_id:
                raise HTTPException(status_code=HTTPStatus.NOT_FOUND, detail="Knowledge graph not found")
        if not _is_record_visible(record, normalized_portal, patient_id):
            raise HTTPException(status_code=HTTPStatus.NOT_FOUND, detail="Knowledge graph not found")

    success = delete_cached_subgraph(cache_id, tenant_id)
    if not success:
        raise HTTPException(status_code=HTTPStatus.NOT_FOUND, detail="Knowledge graph not found")

    return JSONResponse(content={"success": True, "cache_id": cache_id})


# ──────────────────────────────────────────────
# Internal helpers
# ──────────────────────────────────────────────

def _enrich_with_trajectory(
    subgraph: dict,
    patient_id: int,
    tenant_id: str,
    llm_client,
    model_name: str,
    include_predictions: bool,
    include_anomalies: bool,
) -> dict:
    """Add patient trajectory, predictions, and anomaly detection to subgraph."""
    timelines = get_patient_timeline(patient_id, tenant_id)
    if not timelines:
        return subgraph

    detailed_events = []
    for tl in timelines:
        detail = get_timeline_detail(tl["timeline_id"], tenant_id)
        detailed_events.append(detail if detail else tl)

    traj_service = TrajectoryService(llm_client=llm_client, model_name=model_name)

    # Map trajectory
    patient_position = traj_service.map_patient_trajectory(subgraph, detailed_events)
    subgraph["patient_position"] = patient_position

    # Mark patient position nodes
    current_ids = set(patient_position.get("current_nodes", []))
    for node in subgraph.get("nodes", []):
        node["isPatientPosition"] = node["id"] in current_ids

    # PPS
    if include_predictions and patient_position.get("current_nodes"):
        subgraph["predictions"] = traj_service.predict_paths(subgraph, patient_position)

    # APD
    if include_anomalies and patient_position.get("visit_history"):
        anomalies = traj_service.detect_anomalies(subgraph, patient_position)
        subgraph["anomalies"] = anomalies
        anomaly_ids = {a.get("node_id") for a in anomalies}
        for node in subgraph.get("nodes", []):
            node["isAnomaly"] = node["id"] in anomaly_ids

    return subgraph


def _normalize_portal_type(portal_type: Optional[str]) -> str:
    normalized = (portal_type or PORTAL_DOCTOR).strip().lower()
    return PORTAL_PATIENT if normalized == PORTAL_PATIENT else PORTAL_DOCTOR


def _extract_graph_meta(payload: Any) -> dict:
    if isinstance(payload, str):
        try:
            payload = json.loads(payload)
        except json.JSONDecodeError:
            return {}
    if not isinstance(payload, dict):
        return {}
    meta = payload.get("_meta")
    return meta if isinstance(meta, dict) else {}


def _attach_graph_meta(
    subgraph: dict,
    portal_type: str,
    patient_id: Optional[int],
    user_id: Optional[str],
    source: str,
) -> dict:
    enriched = dict(subgraph)
    enriched["_meta"] = {
        "portal_type": portal_type,
        "patient_id": patient_id,
        "user_id": user_id,
        "source": source,
    }
    return enriched


def _build_cache_id(tenant_id: str, query: str, portal_type: str, patient_id: Optional[int]) -> str:
    raw_key = f"{tenant_id}:{portal_type}:{patient_id or 'none'}:{query}"
    return hashlib.md5(raw_key.encode()).hexdigest()[:16]


def _cache_subgraph(
    query: str,
    subgraph: dict,
    tenant_id: str,
    portal_type: str,
    patient_id: Optional[int],
    user_id: Optional[str],
    source: str,
) -> str:
    """Cache a subgraph and return its cache ID."""
    scoped_subgraph = _attach_graph_meta(subgraph, portal_type, patient_id, user_id, source)
    cache_id = _build_cache_id(tenant_id, query, portal_type, patient_id)
    try:
        from database.knowledge_graph_db import cache_subgraph
        cache_subgraph(
            cache_id=cache_id,
            query=query,
            subgraph_json=scoped_subgraph,
            tenant_id=tenant_id,
        )
    except Exception as e:
        logger.warning(f"Failed to cache subgraph: {e}")
    return cache_id


def _filter_history_items(items: list[dict], portal_type: str, patient_id: Optional[str]) -> list[dict]:
    return [item for item in items if _is_record_visible(item, portal_type, patient_id)]


def _is_record_visible(record: dict, portal_type: str, patient_id: Optional[str]) -> bool:
    meta = _extract_graph_meta(record.get("subgraph_json") or record)
    meta_portal = record.get("portal_type") or meta.get("portal_type")
    meta_patient_id = record.get("patient_id") or meta.get("patient_id")

    if portal_type == PORTAL_PATIENT:
        return meta_portal == PORTAL_PATIENT and str(meta_patient_id) == str(patient_id)

    if meta_portal is None:
        return True
    return meta_portal == PORTAL_DOCTOR
