"""
V-Face Matching Service — Qdrant Vector Database Client

Manages the 'vface_embeddings' collection:
- 128-dimensional cosine similarity
- HNSW index for <10ms search at 10M+ scale
- Payload filtering by status (active/revoked)
"""

import os
import logging
from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance,
    VectorParams,
    PointStruct,
    Filter,
    FieldCondition,
    MatchValue,
    PayloadSchemaType,
)

logger = logging.getLogger("matching.qdrant")

QDRANT_URL = os.getenv("QDRANT_URL", "http://localhost:6333")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY")
COLLECTION_NAME = os.getenv("COLLECTION_NAME", "vface_embeddings")
VECTOR_DIM = int(os.getenv("VECTOR_DIM", "128"))


def get_client() -> QdrantClient:
    """Create a Qdrant client. Supports both local and Qdrant Cloud (with API key)."""
    kwargs = {"url": QDRANT_URL, "timeout": 30}
    if QDRANT_API_KEY:
        kwargs["api_key"] = QDRANT_API_KEY
    return QdrantClient(**kwargs)


def ensure_collection(client: QdrantClient):
    """Create the collection if it doesn't exist."""
    collections = [c.name for c in client.get_collections().collections]
    if COLLECTION_NAME not in collections:
        try:
            client.create_collection(
                collection_name=COLLECTION_NAME,
                vectors_config=VectorParams(
                    size=VECTOR_DIM,
                    distance=Distance.COSINE,
                ),
            )
            # Index on status field for filtered search
            client.create_payload_index(
                collection_name=COLLECTION_NAME,
                field_name="status",
                field_schema=PayloadSchemaType.KEYWORD,
            )
            logger.info(f"Created collection '{COLLECTION_NAME}' ({VECTOR_DIM}-d, cosine)")
        except Exception as e:
            if "already exists" in str(e):
                logger.info(f"Collection '{COLLECTION_NAME}' already exists (race condition handled)")
            else:
                raise
    else:
        logger.info(f"Collection '{COLLECTION_NAME}' already exists")


def upsert_embedding(client: QdrantClient, point_id: str, vector: list[float], payload: dict):
    """Store or update a vector in Qdrant."""
    # Qdrant uses unsigned integers or UUIDs for point IDs
    # We hash the fingerprint to a stable integer
    numeric_id = int.from_bytes(bytes.fromhex(point_id[:16]), "big")

    client.upsert(
        collection_name=COLLECTION_NAME,
        points=[
            PointStruct(
                id=numeric_id,
                vector=vector,
                payload={**payload, "fingerprint": point_id},
            )
        ],
    )
    return numeric_id


def search_similar(
    client: QdrantClient,
    query_vector: list[float],
    threshold: float = 0.85,
    top_k: int = 1,
) -> list[dict]:
    """Search for similar vectors among active identities."""
    results = client.query_points(
        collection_name=COLLECTION_NAME,
        query=query_vector,
        query_filter=Filter(
            must=[FieldCondition(key="status", match=MatchValue(value="active"))]
        ),
        limit=top_k,
        score_threshold=threshold,
        with_payload=True,
    )

    return [
        {
            "fingerprint": hit.payload.get("fingerprint"),
            "user_id": hit.payload.get("user_id"),
            "score": round(hit.score, 4),
        }
        for hit in results.points
    ]


def delete_vector(client: QdrantClient, fingerprint: str):
    """Remove a vector (revocation) — set status to revoked."""
    numeric_id = int.from_bytes(bytes.fromhex(fingerprint[:16]), "big")
    client.set_payload(
        collection_name=COLLECTION_NAME,
        payload={"status": "revoked"},
        points=[numeric_id],
    )
    return True


def get_collection_info(client: QdrantClient) -> dict:
    """Get collection stats."""
    info = client.get_collection(COLLECTION_NAME)
    return {
        "name": COLLECTION_NAME,
        "vectors_count": info.vectors_count,
        "points_count": info.points_count,
        "status": info.status.value,
        "config": {
            "size": info.config.params.vectors.size,
            "distance": info.config.params.vectors.distance.value,
        }
    }
