"""
V-FACE Group Identity Module
Supports multiple embeddings under one group_id (wallet address or org ID).
Enables team/family/organizational face verification.

Payload fields for group members:
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
from sqlite_vec_store import get_client, group_enroll, group_search, group_list_members, group_remove_member

router = APIRouter(prefix="/group", tags=["Group Identity"])
client = get_client()

COLLECTION = "vface_embeddings"

# ── Request/Response Models ──────────────────────────────────────────────────

class GroupEnrollRequest(BaseModel):
    group_id:   str
    member_id:  Optional[str] = None
    embedding:  List[float]
    role:       str = "member"
    added_by:   str

class GroupVerifyRequest(BaseModel):
    group_id:   str
    embedding:  List[float]
    threshold:  float = 0.75

class GroupMember(BaseModel):
    member_id:  str
    role:       str
    added_by:   str
    added_at:   int
    similarity: Optional[float] = None

# ── Endpoints ────────────────────────────────────────────────────────────────

@router.post("/enroll")
def enroll_member(req: GroupEnrollRequest):
    member_id = req.member_id or str(uuid.uuid4())

    # Check for duplicate face in group
    existing = group_search(client, req.group_id, req.embedding, threshold=0.90)
    if existing:
        raise HTTPException(
            status_code=409,
            detail=f"Face already enrolled in group as member {existing[0]['member_id']}"
        )

    point_id = str(uuid.uuid4())
    payload = {
        "group_id":  req.group_id,
        "member_id": member_id,
        "role":      req.role,
        "added_by":  req.added_by,
        "added_at":  int(time.time()),
        "type":      "group_member",
    }

    group_enroll(client, point_id, req.embedding, payload)

    return {
        "success":   True,
        "member_id": member_id,
        "group_id":  req.group_id,
        "role":      req.role,
        "point_id":  point_id,
    }


@router.post("/verify")
def verify_in_group(req: GroupVerifyRequest):
    matches = group_search(client, req.group_id, req.embedding, req.threshold)

    if not matches:
        return {"matched": False, "members": []}

    return {
        "matched": True,
        "members": [
            {
                "member_id":  m["member_id"],
                "role":       m["role"],
                "similarity": m["similarity"],
                "added_by":   m["added_by"],
                "added_at":   m["added_at"],
            }
            for m in matches
        ],
        "best_match": matches[0]["member_id"],
        "confidence": matches[0]["similarity"],
    }


@router.get("/{group_id}/members")
def list_members(group_id: str):
    members = group_list_members(client, group_id)
    return {"group_id": group_id, "member_count": len(members), "members": members}


@router.delete("/{group_id}/members/{member_id}")
def remove_member(group_id: str, member_id: str, removed_by: str):
    success = group_remove_member(client, group_id, member_id)
    if not success:
        raise HTTPException(status_code=404, detail="Member not found in group")

    return {"success": True, "removed_member": member_id, "group_id": group_id}
