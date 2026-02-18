/**
 * V-Face Fingerprint Generator — TypeScript Definitions
 * Derives a deterministic, irreversible identifier from a face embedding
 */

/**
 * Generate a fingerprint from a face embedding.
 *
 * @param rawEmbedding - 128-d face embedding vector
 * @param salt - Optional service-specific salt for unlinkability.
 *               Without salt, fingerprint is globally stable (same face = same hash everywhere).
 *               With salt, fingerprint is service-specific (same face + different salts = different hashes).
 * @returns 64-character hex fingerprint
 * @throws {Error} If embedding dimension is not 128
 */
export function generateFingerprint(
    rawEmbedding: Float32Array | number[],
    salt?: string
): Promise<string>;
