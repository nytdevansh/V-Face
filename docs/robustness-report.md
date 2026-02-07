# Phase 3: Adversarial & Robustness Verification Report

## 1. Executive Summary
**Current Status:** `FAIL (Expected)`
**Method:** Strict Hash Equality (SHA-256 of Quantized Embedding)
**Finding:** The current identity enforcement layer is **critically brittle**.
Any minor modification to the input image (brightness, compression, rotation) results in a completely different fingerprint hash, causing valid users to be rejected (False Negatives).

---

## 2. Stage 1: Deterministic Stability Testing
We tested the "Generic Stability" of the fingerprinting process by applying standard image transformations to a base face image.

| Transformation | parameter | Result | Expectation (Ideal) | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Base Image** | N/A | `97b6...` | `97b6...` | ✅ |
| **Brightness** | +5% | **MISMATCH** | MATCH | ❌ |
| **Brightness** | -5% | **MISMATCH** | MATCH | ❌ |
| **Resize** | 95% | **MISMATCH** | MATCH | ❌ |
| **JPEG Quality** | 90 | **MISMATCH** | MATCH | ❌ |
| **Rotation** | 1° | **MISMATCH** | MATCH | ❌ |

### Diagnosis
The system currently uses **Strict Equality** logic:
1.  Quantize Embedding (Float32 -> Int8)
2.  Hash (SHA-256)
3.  Compare Hash

This removes all "fuzzy" tolerance. A single bit flip in the quantized vector completely changes the SHA-256 hash.

### Recommendation (Critical)
To move to **Stage 2 (False Positive Resistance)**, we **MUST** abandon Strict Hash Equality for the decision layer.

**Proposed Architecture Shift:**
1.  **Storage:** Store the *Quantized Embedding Vector* (not just the hash).
2.  **Verification:**
    *   Compute **Cosine Similarity** between Input Vector and Stored Vector.
    *   Apply a **Threshold** (e.g., > 0.85).
3.  **Privacy:** Use an encrypted or obscure storage format, or trusted execution environment (TEE), as raw embeddings are sensitive.

---

## 3. Next Steps
1.  **Refactor Server to Store Embeddings**: Update `fingerprints` table to store `embedding_vector` (BLOB or JSON).
2.  **Implement Similarity Search**: Write a cosine similarity function in the Registry API (or use a vector extension if moving to Postgres/pgvector, but for SQLite MVP, a custom function or JS-side check is feasible).
3.  **Re-run Stage 1**: Confirm that brightness/resize changes still yield >0.9 similarity.
