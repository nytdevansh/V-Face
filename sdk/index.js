import { loadModel, generateEmbedding, cosineSimilarity } from './embedding/pipeline.js';
import { generateFingerprint } from './fingerprint/index.js';
import { Registry, RegistryError } from './registry/index.js';

/**
 * V-Face SDK — Unified API for biometric identity.
 * 
 * Combines the face embedding pipeline with the V-Face Registry API.
 * 
 * @example
 * const sdk = new VFaceSDK({ registryUrl: 'http://localhost:3000' });
 * await sdk.init();
 * 
 * const fingerprint = await sdk.getFingerprint(imageElement);
 * const result = await sdk.register(imageElement, '0xYourWalletAddress');
 */
export class VFaceSDK {
    /**
     * @param {Object} config
     * @param {string} [config.registryUrl] - Registry API URL (default: http://localhost:3000)
     * @param {string} [config.modelPath] - Path to ONNX model (default: /model/mobilefacenet.onnx)
     */
    constructor(config = {}) {
        this.registry = new Registry(config.registryUrl);
        this.modelPath = config.modelPath || '/model/mobilefacenet.onnx';
        this.isLoaded = false;
    }

    /**
     * Initialize the SDK (load face embedding model).
     */
    async init() {
        if (this.isLoaded) return;
        await loadModel(this.modelPath);
        this.isLoaded = true;
    }

    // ========================================================================
    // BIOMETRIC PIPELINE
    // ========================================================================

    /**
     * Process a face image and return its deterministic fingerprint.
     * Pipeline: Image → Embedding → L2 Normalize → Quantize → SHA-256
     * @param {HTMLImageElement|HTMLCanvasElement} imageSource
     * @returns {Promise<string>} 64-char hex fingerprint
     */
    async getFingerprint(imageSource) {
        if (!this.isLoaded) await this.init();
        const embedding = await generateEmbedding(imageSource);
        return generateFingerprint(embedding);
    }

    /**
     * Get the raw 128-d embedding vector from a face image.
     * @param {HTMLImageElement|HTMLCanvasElement} imageSource
     * @returns {Promise<Float32Array>} Raw 128-dimensional embedding
     */
    async getRawEmbedding(imageSource) {
        if (!this.isLoaded) await this.init();
        return generateEmbedding(imageSource);
    }

    // ========================================================================
    // REGISTRY OPERATIONS
    // ========================================================================

    /**
     * Full registration pipeline: image → embedding → fingerprint → register.
     * @param {HTMLImageElement|HTMLCanvasElement} imageSource - Face image
     * @param {string} publicKey - Wallet address
     * @param {Object} [metadata] - Optional metadata
     * @returns {Promise<{success: boolean, fingerprint: string, id?: number}>}
     */
    async register(imageSource, publicKey, metadata = null) {
        if (!this.isLoaded) await this.init();

        const embedding = await generateEmbedding(imageSource);
        const fingerprint = await generateFingerprint(embedding);
        const embeddingJson = JSON.stringify(Array.from(embedding));

        const result = await this.registry.register(fingerprint, publicKey, embeddingJson, metadata);
        return { ...result, fingerprint };
    }

    /**
     * Check if a fingerprint exists in the registry.
     * @param {string} fingerprint - 64-char hex fingerprint
     * @returns {Promise<{exists: boolean, revoked?: boolean, createdAt?: number}>}
     */
    async check(fingerprint) {
        return this.registry.check(fingerprint);
    }

    /**
     * Search for similar faces in the registry using cosine similarity.
     * @param {HTMLImageElement|HTMLCanvasElement} imageSource - Face image to search for
     * @param {number} [threshold=0.85] - Minimum cosine similarity
     * @returns {Promise<{matches: Array}>}
     */
    async search(imageSource, threshold = 0.85) {
        if (!this.isLoaded) await this.init();
        const embedding = await generateEmbedding(imageSource);
        return this.registry.search(Array.from(embedding), threshold);
    }

    /**
     * Revoke an identity.
     * @param {string} fingerprint - 64-char hex fingerprint
     * @param {string} signature - Signed revocation message
     * @param {Object} message - The message that was signed
     * @returns {Promise<{success: boolean}>}
     */
    async revoke(fingerprint, signature, message) {
        return this.registry.revoke(fingerprint, signature, message);
    }

    // ========================================================================
    // CONSENT OPERATIONS
    // ========================================================================

    /**
     * Request consent from an identity owner.
     * @param {string} fingerprint - 64-char hex fingerprint
     * @param {string} companyId - Requesting company identifier
     * @param {string[]} scope - Requested permissions
     * @param {number} duration - Duration in seconds
     * @returns {Promise<{status: string, request_id: string}>}
     */
    async requestConsent(fingerprint, companyId, scope, duration) {
        return this.registry.requestConsent(fingerprint, companyId, scope, duration);
    }

    /**
     * Approve a pending consent request.
     * @param {string} requestId - Pending consent request ID
     * @param {string} fingerprint - 64-char hex fingerprint
     * @returns {Promise<{success: boolean, token: string}>}
     */
    async approveConsent(requestId, fingerprint) {
        return this.registry.approveConsent(requestId, fingerprint);
    }

    /**
     * Verify a consent JWT token.
     * @param {string} token - JWT consent token
     * @returns {Promise<{valid: boolean, claims?: Object, reason?: string}>}
     */
    async verifyToken(token) {
        return this.registry.verify(token);
    }
}

// Re-export utilities
export { cosineSimilarity } from './embedding/pipeline.js';
export { generateFingerprint } from './fingerprint/index.js';
export { Registry, RegistryError } from './registry/index.js';
