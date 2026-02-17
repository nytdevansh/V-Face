/**
 * V-Face Matching Service Client
 * 
 * HTTP client for the Python matching service.
 * The Node.js API never handles raw embeddings — it delegates to this service.
 */

const MATCHING_URL = process.env.MATCHING_SERVICE_URL || 'http://localhost:8001';
const MATCHING_SECRET = process.env.MATCHING_SECRET || 'dev-secret-change-me';

const headers = {
    'Content-Type': 'application/json',
    'X-Matching-Secret': MATCHING_SECRET,
};

/**
 * Enroll an encrypted embedding in the vector database.
 * @param {string} fingerprint - 64-char hex
 * @param {string} encryptedEmbedding - AES-256-GCM payload
 * @param {string} [userId] - Optional user ID
 * @param {object} [metadata] - Optional metadata
 * @returns {Promise<{success: boolean, fingerprint: string, vector_dim: number}>}
 */
async function enroll(fingerprint, encryptedEmbedding, userId, metadata) {
    const res = await fetch(`${MATCHING_URL}/enroll`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            fingerprint,
            encrypted_embedding: encryptedEmbedding,
            user_id: userId || fingerprint,
            metadata: metadata || null,
        }),
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        const error = new Error(err.detail || 'Matching service enrollment failed');
        error.statusCode = res.status;
        throw error;
    }

    return res.json();
}

/**
 * Search for a matching identity.
 * @param {string} encryptedEmbedding - AES-256-GCM encrypted query embedding
 * @param {number} [threshold=0.85] - Cosine similarity threshold
 * @param {number} [topK=1] - Number of results
 * @returns {Promise<{matched: boolean, results: Array, search_time_ms: number}>}
 */
async function search(encryptedEmbedding, threshold = 0.85, topK = 1) {
    const res = await fetch(`${MATCHING_URL}/search`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            encrypted_embedding: encryptedEmbedding,
            threshold,
            top_k: topK,
        }),
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail || 'Matching service search failed');
    }

    return res.json();
}

/**
 * Delete/revoke a vector from the matching service.
 * @param {string} fingerprint - 64-char hex
 */
async function deleteVector(fingerprint) {
    const res = await fetch(`${MATCHING_URL}/delete`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ fingerprint }),
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail || 'Matching service delete failed');
    }

    return res.json();
}

/**
 * Check matching service health.
 */
async function health() {
    const res = await fetch(`${MATCHING_URL}/health`, { headers });
    return res.json();
}

module.exports = { enroll, search, deleteVector, health };
