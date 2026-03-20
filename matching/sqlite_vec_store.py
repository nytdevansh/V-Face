"""
V-Face Matching Service — SQLite-vec Vector Store

Drop-in replacement for qdrant_store.py.
Uses sqlite-vec extension for in-process vector search — no external DB needed.

Manages the 'vface_embeddings' vec0 virtual table:
- 128-dimensional cosine similarity
- Metadata columns for filtering (status, model_version)
- Persistent on-disk storage via SQLite
"""

import os
import json
import struct
import logging

# Try pysqlite3 first (compiled with extension loading support), fall back to stdlib
try:
    import pysqlite3 as sqlite3
except ImportError:
    import sqlite3

import sqlite_vec

logger = logging.getLogger("matching.sqlite_vec")

VECTOR_DB_PATH = os.getenv("VECTOR_DB_PATH", "./data/vectors.db")
COLLECTION_NAME = os.getenv("COLLECTION_NAME", "vface_embeddings")
VECTOR_DIM = int(os.getenv("VECTOR_DIM", "128"))


def _serialize_f32(vector: list[float]) -> bytes:
    """Serialize a list of floats into compact raw bytes for sqlite-vec."""
    return struct.pack("%sf" % len(vector), *vector)


def _deserialize_f32(blob: bytes) -> list[float]:
    """Deserialize raw bytes back into a list of floats."""
    n = len(blob) // 4
    return list(struct.unpack("%sf" % n, blob))


def get_client() -> sqlite3.Connection:
    """Create a SQLite connection with sqlite-vec loaded."""
    # Ensure data directory exists
    db_dir = os.path.dirname(VECTOR_DB_PATH)
    if db_dir:
        os.makedirs(db_dir, exist_ok=True)

    db = sqlite3.connect(VECTOR_DB_PATH)

    # Load sqlite-vec extension
    try:
        db.enable_load_extension(True)
        sqlite_vec.load(db)
        db.enable_load_extension(False)
    except AttributeError:
        # macOS system Python may not support enable_load_extension
        # Fall back to loading via loadable_path
        db.load_extension(sqlite_vec.loadable_path())

    # Enable WAL mode for better concurrent read performance
    db.execute("PRAGMA journal_mode=WAL")
    db.row_factory = sqlite3.Row

    logger.info(f"SQLite-vec store opened: {VECTOR_DB_PATH}")
    return db


def ensure_collection(client: sqlite3.Connection):
    """Create the vec0 virtual table and payload table if they don't exist."""
    # Payload table — stores metadata for each embedding
    client.execute(f"""
        CREATE TABLE IF NOT EXISTS {COLLECTION_NAME}_payload (
            fingerprint TEXT PRIMARY KEY,
            user_id     TEXT,
            status      TEXT DEFAULT 'active',
            model_version TEXT DEFAULT 'mobilefacenet_v1',
            enrolled_at INTEGER,
            refreshed_at INTEGER,
            drift_score  REAL,
            metadata    TEXT,
            group_id    TEXT,
            member_id   TEXT,
            role        TEXT,
            added_by    TEXT,
            added_at    INTEGER,
            type        TEXT
        )
    """)

    # Vec0 virtual table — stores vectors with metadata columns for filtering
    client.execute(f"""
        CREATE VIRTUAL TABLE IF NOT EXISTS {COLLECTION_NAME}_vec USING vec0(
            fingerprint TEXT PRIMARY KEY,
            embedding   float[{VECTOR_DIM}],
            status      TEXT
        )
    """)

    client.commit()
    logger.info(f"Collection '{COLLECTION_NAME}' ensured ({VECTOR_DIM}-d, cosine)")


def upsert_embedding(
    client: sqlite3.Connection,
    point_id: str,
    vector: list[float],
    payload: dict,
    model_version: str = "mobilefacenet_v1",
):
    """Store or update a vector."""
    status = payload.get("status", "active")
    meta_json = json.dumps(payload.get("metadata")) if payload.get("metadata") else None

    # Upsert into payload table
    client.execute(f"""
        INSERT OR REPLACE INTO {COLLECTION_NAME}_payload
            (fingerprint, user_id, status, model_version, enrolled_at,
             refreshed_at, drift_score, metadata, group_id, member_id,
             role, added_by, added_at, type)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        point_id,
        payload.get("user_id"),
        status,
        model_version,
        payload.get("enrolled_at"),
        payload.get("refreshed_at"),
        payload.get("drift_score"),
        meta_json,
        payload.get("group_id"),
        payload.get("member_id"),
        payload.get("role"),
        payload.get("added_by"),
        payload.get("added_at"),
        payload.get("type"),
    ))

    # Upsert into vec0 table
    # vec0 doesn't support UPDATE — delete then insert
    client.execute(f"DELETE FROM {COLLECTION_NAME}_vec WHERE fingerprint = ?", (point_id,))
    client.execute(f"""
        INSERT INTO {COLLECTION_NAME}_vec (fingerprint, embedding, status)
        VALUES (?, ?, ?)
    """, (point_id, _serialize_f32(vector), status))

    client.commit()
    return point_id


def get_embedding(client: sqlite3.Connection, fingerprint: str) -> dict | None:
    """Retrieve an existing embedding by fingerprint."""
    row = client.execute(f"""
        SELECT v.embedding, p.*
        FROM {COLLECTION_NAME}_vec v
        JOIN {COLLECTION_NAME}_payload p ON v.fingerprint = p.fingerprint
        WHERE v.fingerprint = ?
    """, (fingerprint,)).fetchone()

    if not row:
        return None

    return {
        "vector": _deserialize_f32(row["embedding"]),
        "payload": {k: row[k] for k in row.keys() if k != "embedding"},
        "fingerprint": row["fingerprint"],
    }


def search_similar(
    client: sqlite3.Connection,
    query_vector: list[float],
    threshold: float = 0.85,
    top_k: int = 1,
) -> list[dict]:
    """Search for similar vectors among active identities using cosine distance."""
    # KNN search via vec0 with metadata filter on status
    rows = client.execute(f"""
        SELECT
            v.fingerprint,
            v.distance
        FROM {COLLECTION_NAME}_vec v
        WHERE v.embedding MATCH ?
          AND v.k = ?
          AND v.status = 'active'
    """, (_serialize_f32(query_vector), top_k * 5)).fetchall()
    # Fetch extra candidates since we'll filter by threshold

    results = []
    for row in rows:
        # vec0 MATCH returns L2 distance by default — compute cosine similarity manually
        cosine_dist = client.execute(
            "SELECT vec_distance_cosine(?, ?)",
            (_serialize_f32(query_vector), client.execute(
                f"SELECT embedding FROM {COLLECTION_NAME}_vec WHERE fingerprint = ?",
                (row["fingerprint"],)
            ).fetchone()["embedding"])
        ).fetchone()[0]

        # cosine_distance ranges [0, 2]; similarity = 1 - distance
        similarity = 1.0 - cosine_dist

        if similarity >= threshold:
            # Get user_id from payload table
            payload_row = client.execute(f"""
                SELECT user_id FROM {COLLECTION_NAME}_payload WHERE fingerprint = ?
            """, (row["fingerprint"],)).fetchone()

            results.append({
                "fingerprint": row["fingerprint"],
                "user_id": payload_row["user_id"] if payload_row else None,
                "score": round(similarity, 4),
            })

        if len(results) >= top_k:
            break

    # Sort by score descending
    results.sort(key=lambda x: x["score"], reverse=True)
    return results[:top_k]


def delete_vector(client: sqlite3.Connection, fingerprint: str):
    """Soft-delete a vector (revocation) — set status to revoked."""
    client.execute(f"""
        UPDATE {COLLECTION_NAME}_payload SET status = 'revoked' WHERE fingerprint = ?
    """, (fingerprint,))

    # Update status in vec0 table (delete + re-insert with new status)
    vec_row = client.execute(f"""
        SELECT embedding FROM {COLLECTION_NAME}_vec WHERE fingerprint = ?
    """, (fingerprint,)).fetchone()

    if vec_row:
        client.execute(f"DELETE FROM {COLLECTION_NAME}_vec WHERE fingerprint = ?", (fingerprint,))
        client.execute(f"""
            INSERT INTO {COLLECTION_NAME}_vec (fingerprint, embedding, status) VALUES (?, ?, 'revoked')
        """, (fingerprint, vec_row["embedding"]))

    client.commit()
    return True


def get_collection_info(client: sqlite3.Connection) -> dict:
    """Get collection stats."""
    total = client.execute(f"SELECT COUNT(*) as cnt FROM {COLLECTION_NAME}_payload").fetchone()["cnt"]
    active = client.execute(f"""
        SELECT COUNT(*) as cnt FROM {COLLECTION_NAME}_payload WHERE status = 'active'
    """).fetchone()["cnt"]

    vec_version = client.execute("SELECT vec_version()").fetchone()[0]

    return {
        "name": COLLECTION_NAME,
        "vectors_count": total,
        "active_count": active,
        "status": "ok",
        "backend": f"sqlite-vec {vec_version}",
        "config": {
            "size": VECTOR_DIM,
            "distance": "cosine",
        },
    }


# ─── Group Identity Helpers ─────────────────────────────────────────────────

def group_enroll(
    client: sqlite3.Connection,
    point_id: str,
    vector: list[float],
    payload: dict,
):
    """Enroll a group member — stores vector + group metadata."""
    return upsert_embedding(client, point_id, vector, payload)


def group_search(
    client: sqlite3.Connection,
    group_id: str,
    query_vector: list[float],
    threshold: float = 0.75,
    top_k: int = 10,
) -> list[dict]:
    """Search for similar vectors within a specific group."""
    # Get all group members' fingerprints
    members = client.execute(f"""
        SELECT fingerprint FROM {COLLECTION_NAME}_payload
        WHERE group_id = ? AND type = 'group_member'
    """, (group_id,)).fetchall()

    if not members:
        return []

    results = []
    query_blob = _serialize_f32(query_vector)

    for member in members:
        fp = member["fingerprint"]
        vec_row = client.execute(f"""
            SELECT embedding FROM {COLLECTION_NAME}_vec WHERE fingerprint = ?
        """, (fp,)).fetchone()

        if not vec_row:
            continue

        cosine_dist = client.execute(
            "SELECT vec_distance_cosine(?, ?)",
            (query_blob, vec_row["embedding"])
        ).fetchone()[0]

        similarity = 1.0 - cosine_dist

        if similarity >= threshold:
            payload_row = client.execute(f"""
                SELECT * FROM {COLLECTION_NAME}_payload WHERE fingerprint = ?
            """, (fp,)).fetchone()

            results.append({
                "fingerprint": fp,
                "member_id": payload_row["member_id"],
                "role": payload_row["role"],
                "added_by": payload_row["added_by"],
                "added_at": payload_row["added_at"],
                "similarity": round(similarity, 4),
            })

    # Sort by similarity descending
    results.sort(key=lambda x: x["similarity"], reverse=True)
    return results[:top_k]


def group_list_members(client: sqlite3.Connection, group_id: str) -> list[dict]:
    """List all members in a group."""
    rows = client.execute(f"""
        SELECT member_id, role, added_by, added_at
        FROM {COLLECTION_NAME}_payload
        WHERE group_id = ? AND type = 'group_member'
    """, (group_id,)).fetchall()

    return [dict(row) for row in rows]


def group_remove_member(client: sqlite3.Connection, group_id: str, member_id: str) -> bool:
    """Remove a member from a group."""
    row = client.execute(f"""
        SELECT fingerprint FROM {COLLECTION_NAME}_payload
        WHERE group_id = ? AND member_id = ?
    """, (group_id, member_id)).fetchone()

    if not row:
        return False

    fp = row["fingerprint"]
    client.execute(f"DELETE FROM {COLLECTION_NAME}_vec WHERE fingerprint = ?", (fp,))
    client.execute(f"DELETE FROM {COLLECTION_NAME}_payload WHERE fingerprint = ?", (fp,))
    client.commit()
    return True
