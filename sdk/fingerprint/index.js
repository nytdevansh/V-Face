/**
 * V-Face Fingerprint Generator
 * 
 * Derives a deterministic, irreversible identifier from a face embedding.
 * 
 * LINKABILITY WARNING:
 * Without a salt, the fingerprint is GLOBALLY STABLE — the same face always
 * produces the same fingerprint. This enables cross-service tracking.
 * 
 * For per-service unlinkability, pass a service-specific salt:
 *   generateFingerprint(embedding, "service-abc-salt")
 * 
 * Tradeoff:
 *   - No salt:   Strong Sybil resistance, but linkable across services
 *   - With salt: Unlinkable across services, but Sybil check requires the salt
 */

/**
 * Generate a fingerprint from a face embedding.
 * 
 * @param {Float32Array|number[]} rawEmbedding - 128-d face embedding vector
 * @param {string} [salt] - Optional service-specific salt for unlinkability.
 *                           Without salt, fingerprint is globally stable (same face = same hash everywhere).
 *                           With salt, fingerprint is service-specific (same face + different salts = different hashes).
 * @returns {Promise<string>} 64-character hex fingerprint
 */
export async function generateFingerprint(rawEmbedding, salt) {
    if (rawEmbedding.length !== 128) {
        throw new Error(`Invalid embedding dimension. Expected 128, got ${rawEmbedding.length}`);
    }

    const normalized = l2Normalize(rawEmbedding);
    const quantized = quantize(normalized);
    const serialized = JSON.stringify(quantized);

    // If salt provided, include it in the hash for per-service unlinkability
    const hashInput = salt ? serialized + ':' + salt : serialized;
    const hash = await sha256(hashInput);

    return hash;
}

function l2Normalize(vector) {
    let sum = 0;
    for (const val of vector) sum += val * val;
    const magnitude = Math.sqrt(sum);
    if (magnitude === 0) return vector;
    return vector.map(val => val / magnitude);
}

function quantize(vector) {
    return Array.from(vector).map(val => Number(val.toFixed(4)));
}

async function sha256(message) {
    if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
        const msgBuffer = new TextEncoder().encode(message);
        const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } else {
        const crypto = await import('crypto');
        return crypto.createHash('sha256').update(message).digest('hex');
    }
}
