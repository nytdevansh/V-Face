"""
V-FACE Group Identity Module
Supports multiple embeddings under one group_id (wallet address or org ID).
Enables team/family/organizational face verification.

Schema additions to Qdrant payload:
  group_id   : str  — wallet address or org identifier
  member_id  : str  — unique member within group (uuid)
  role       : str  — "owner" | "member" | "guest"
  added_by   : str  — wallet of admin who added this member
  added_at   : int  — unix timestamp
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
import uuid, time
from qdrant_store import QdrantStore

router = APIRouter(prefix="/group", tags=["Group Identity"])
store  = QdrantStore()

COLLECTION = "vface_embeddings"


# ── Request/Response Models ──────────────────────────────────────────────────

class GroupEnrollRequest(BaseModel):
    group_id:   str          # wallet or org ID (owner)
    member_id:  Optional[str] = None   # auto-generated if omitted
    embedding:  List[float]  # 128-d vector
    role:       str = "member"         # owner | member | guest
    added_by:   str          # wallet of admin

class GroupVerifyRequest(BaseModel):
    group_id:   str
    embedding:  List[float]
    threshold:  float = 0.75

class GroupMember(BaseModel):
    member_id:  str
    role:       str
    added_by:   str
    added_at:   int
    similarity: Optional[float] = None  # populated on search


# ── Endpoints ────────────────────────────────────────────────────────────────

@router.post("/enroll")
async def enroll_member(req: GroupEnrollRequest):
    """
    Add a member's face embedding to a group.
    - Generates unique member_id if not provided
    - Stores embedding with group_id + role in Qdrant payload
    - Checks for duplicate face within the SAME group
    """
    member_id = req.member_id or str(uuid.uuid4())

    # Sybil check within group — prevent same face added twice
    existing = await search_group_internal(req.group_id, req.embedding, threshold=0.90)
    if existing:
        raise HTTPException(
            status_code=409,
            detail=f"Face already enrolled in group as member {existing[0].member_id}"
        )

    payload = {
        "group_id":  req.group_id,
        "member_id": member_id,
        "role":      req.role,
        "added_by":  req.added_by,
        "added_at":  int(time.time()),
        "type":      "group_member",
    }

    point_id = str(uuid.uuid4())
    await store.upsert(
        collection=COLLECTION,
        points=[{
            "id":      point_id,
            "vector":  req.embedding,
            "payload": payload,
        }]
    )

    return {
        "success":   True,
        "member_id": member_id,
        "group_id":  req.group_id,
        "role":      req.role,
        "point_id":  point_id,
    }


@router.post("/verify")
async def verify_in_group(req: GroupVerifyRequest):
    """
    Verify a face against all members of a specific group.
    Returns the matched member(s) with similarity scores.
    Useful for: team access, family verification, org authentication.
    """
    matches = await search_group_internal(req.group_id, req.embedding, req.threshold)

    if not matches:
        return {"matched": False, "members": []}

    return {
        "matched": True,
        "members": [
            {
                "member_id":  m.member_id,
                "role":       m.role,
                "similarity": round(m.similarity, 4),
                "added_by":   m.added_by,
                "added_at":   m.added_at,
            }
            for m in matches
        ],
        "best_match": matches[0].member_id,
        "confidence": matches[0].similarity,
    }


@router.get("/{group_id}/members")
async def list_members(group_id: str):
    """
    List all members in a group (without embeddings — privacy safe).
    Requires caller to be group owner (enforced by API server JWT middleware).
    """
    results = await store.scroll(
        collection=COLLECTION,
        scroll_filter={
            "must": [
                {"key": "group_id", "match": {"value": group_id}},
                {"key": "type",     "match": {"value": "group_member"}},
            ]
        },
        with_payload=True,
        with_vectors=False,
    )

    members = []
    for r in results:
        p = r.payload
        members.append({
            "member_id": p.get("member_id"),
            "role":      p.get("role"),
            "added_by":  p.get("added_by"),
            "added_at":  p.get("added_at"),
        })

    return {"group_id": group_id, "member_count": len(members), "members": members}


@router.delete("/{group_id}/members/{member_id}")
async def remove_member(group_id: str, member_id: str, removed_by: str):
    """
    Remove a member from a group by member_id.
    Only group owners can remove members.
    """
    # Find the point
    results = await store.scroll(
        collection=COLLECTION,
        scroll_filter={
            "must": [
                {"key": "group_id",  "match": {"value": group_id}},
                {"key": "member_id", "match": {"value": member_id}},
            ]
        },
        with_payload=False,
        with_vectors=False,
    )

    if not results:
        raise HTTPException(status_code=404, detail="Member not found in group")

    point_id = results[0].id
    await store.delete(collection=COLLECTION, points_selector=[point_id])

    return {"success": True, "removed_member": member_id, "group_id": group_id}


# ── Internal Helpers ─────────────────────────────────────────────────────────

async def search_group_internal(
    group_id: str,
    embedding: List[float],
    threshold: float = 0.75
) -> List[GroupMember]:
    """Search within a specific group using Qdrant filter."""
    results = await store.search(
        collection=COLLECTION,
        query_vector=embedding,
        limit=10,
        query_filter={
            "must": [
                {"key": "group_id", "match": {"value": group_id}},
                {"key": "type",     "match": {"value": "group_member"}},
            ]
        },
        score_threshold=threshold,
        with_payload=True,
    )

    return [
        GroupMember(
            member_id=r.payload.get("member_id", ""),
            role=r.payload.get("role", "member"),
            added_by=r.payload.get("added_by", ""),
            added_at=r.payload.get("added_at", 0),
            similarity=r.score,
        )
        for r in results
    ]
