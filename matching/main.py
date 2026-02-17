"""
V-Face Matching Service

Isolated FastAPI microservice for biometric vector operations.
This is the ONLY service that decrypts and handles raw embeddings.

Endpoints:
  POST /enroll   — Decrypt embedding, store in Qdrant, zero memory
  POST /search   — Decrypt embedding, search Qdrant, return match
  POST /delete   — Soft-delete vector in Qdrant (revocation)
  GET  /health   — Service health + Qdrant collection stats
"""

import os
import time
import logging
from contextlib import asynccontextmanager

import numpy as np
from fastapi import FastAPI, HTTPException, Header
from pydantic import BaseModel

from qdrant_store import get_client, ensure_collection, upsert_embedding, search_similar, delete_vector, get_collection_info
from crypto_utils import decrypt_embedding

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s %(message)s")
logger = logging.getLogger("matching")

MATCHING_SECRET = os.getenv("MATCHING_SECRET", "dev-secret-change-me")
SIMILARITY_THRESHOLD = float(os.getenv("SIMILARITY_THRESHOLD", "0.85"))

# Global Qdrant client
qdrant = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize Qdrant collection on startup with retry."""
    global qdrant
    qdrant = get_client()

    # Retry until Qdrant is reachable (cloud instances may take a moment)
    max_retries = 10
    for attempt in range(max_retries):
        try:
            ensure_collection(qdrant)
            logger.info("Matching Service ready")
            break
        except Exception as e:
            if attempt < max_retries - 1:
                wait = 2 * (attempt + 1)
                logger.warning(f"Qdrant not ready (attempt {attempt+1}/{max_retries}): {e}. Retrying in {wait}s...")
                import asyncio
                await asyncio.sleep(wait)
            else:
                logger.error(f"Qdrant unreachable after {max_retries} attempts. Starting in degraded mode.")

    yield
    logger.info("Matching Service shutting down")


app = FastAPI(
    title="V-Face Matching Service",
    version="1.0.0",
    docs_url=None,   # No public Swagger
    redoc_url=None,
    lifespan=lifespan,
)


# ============================================================================
# Auth
# ============================================================================

def verify_secret(x_matching_secret: str = Header(None)):
    """Internal auth — shared secret between API and matching service."""
    if x_matching_secret != MATCHING_SECRET:
        raise HTTPException(status_code=401, detail="Unauthorized")


# ============================================================================
# Request / Response Models
# ============================================================================

class EnrollRequest(BaseModel):
    fingerprint: str           # 64-char hex fingerprint
    encrypted_embedding: str   # AES-256-GCM encrypted payload
    user_id: str | None = None
    metadata: dict | None = None


class EnrollResponse(BaseModel):
    success: bool
    fingerprint: str
    vector_dim: int


class SearchRequest(BaseModel):
    encrypted_embedding: str   # AES-256-GCM encrypted query embedding
    threshold: float | None = None
    top_k: int = 1


class SearchResponse(BaseModel):
    matched: bool
    results: list[dict]
    search_time_ms: float


class DeleteRequest(BaseModel):
    fingerprint: str


# ============================================================================
# Endpoints
# ============================================================================

@app.post("/enroll", response_model=EnrollResponse)
def enroll(req: EnrollRequest, x_matching_secret: str = Header(None)):
    verify_secret(x_matching_secret)

    try:
        # 1. Decrypt embedding (only place raw vectors exist)
        embedding = decrypt_embedding(req.encrypted_embedding)

        # 2. Validate dimension
        if len(embedding) != 128:
            raise HTTPException(400, f"Expected 128-d, got {len(embedding)}-d")

        # 3. L2 normalize for cosine similarity
        vec = np.array(embedding, dtype=np.float32)
        norm = np.linalg.norm(vec)
        if norm > 0:
            vec = vec / norm

        # 4. Check for duplicate (Sybil check)
        duplicates = search_similar(qdrant, vec.tolist(), threshold=SIMILARITY_THRESHOLD, top_k=1)
        if duplicates:
            raise HTTPException(
                409,
                f"Similar identity already exists (score: {duplicates[0]['score']}, "
                f"fingerprint: {duplicates[0]['fingerprint'][:8]}...)"
            )

        # 5. Store in Qdrant
        payload = {
            "user_id": req.user_id or req.fingerprint,
            "status": "active",
            "enrolled_at": int(time.time()),
        }
        if req.metadata:
            payload["metadata"] = req.metadata

        upsert_embedding(qdrant, req.fingerprint, vec.tolist(), payload)

        # 6. Zero memory
        vec.fill(0)
        del embedding

        logger.info(f"Enrolled: {req.fingerprint[:8]}...")
        return EnrollResponse(success=True, fingerprint=req.fingerprint, vector_dim=128)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Enroll failed: {e}")
        raise HTTPException(500, f"Enrollment failed: {str(e)}")


@app.post("/search", response_model=SearchResponse)
def search(req: SearchRequest, x_matching_secret: str = Header(None)):
    verify_secret(x_matching_secret)

    try:
        start = time.time()

        # 1. Decrypt query embedding
        embedding = decrypt_embedding(req.encrypted_embedding)

        # 2. L2 normalize
        vec = np.array(embedding, dtype=np.float32)
        norm = np.linalg.norm(vec)
        if norm > 0:
            vec = vec / norm

        # 3. Search Qdrant
        threshold = req.threshold or SIMILARITY_THRESHOLD
        results = search_similar(qdrant, vec.tolist(), threshold=threshold, top_k=req.top_k)

        # 4. Zero memory
        vec.fill(0)
        del embedding

        elapsed = (time.time() - start) * 1000

        return SearchResponse(
            matched=len(results) > 0,
            results=results,
            search_time_ms=round(elapsed, 2),
        )

    except Exception as e:
        import traceback
        logger.error(f"Search failed: {e}\n{traceback.format_exc()}")
        raise HTTPException(500, f"Search failed: {str(e)}")


@app.post("/delete")
def delete(req: DeleteRequest, x_matching_secret: str = Header(None)):
    verify_secret(x_matching_secret)

    try:
        delete_vector(qdrant, req.fingerprint)
        logger.info(f"Revoked vector: {req.fingerprint[:8]}...")
        return {"success": True, "fingerprint": req.fingerprint}
    except Exception as e:
        logger.error(f"Delete failed: {e}")
        raise HTTPException(500, f"Delete failed: {str(e)}")


@app.get("/health")
def health():
    try:
        info = get_collection_info(qdrant)
        return {
            "status": "ok",
            "service": "V-Face Matching Service",
            "version": "1.0.0",
            "qdrant": info,
        }
    except Exception as e:
        return {"status": "degraded", "error": str(e)}
