/**
 * V-Face SDK — TypeScript Definitions
 * Unified API for biometric identity and consent management
 */

export interface VFaceConfig {
    registryUrl?: string;
    modelPath?: string;
}

export interface RegistrationResult {
    success: boolean;
    fingerprint: string;
    id?: number;
}

export interface CheckResult {
    exists: boolean;
    revoked?: boolean;
    createdAt?: number;
    public_key?: string;
}

export interface SearchMatch {
    fingerprint: string;
    similarity: number;
}

export interface SearchResult {
    matches: SearchMatch[];
}

export interface ConsentRequest {
    status: string;
    request_id: string;
}

export interface ConsentApproval {
    success: boolean;
    token: string;
}

export interface TokenVerification {
    valid: boolean;
    claims?: Record<string, any>;
    reason?: string;
}

export interface RevokeResult {
    success: boolean;
}

/**
 * V-Face SDK — Unified API for biometric identity
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
    constructor(config?: VFaceConfig);

    /**
     * Initialize the SDK (load face embedding model).
     */
    init(): Promise<void>;

    /**
     * Process a face image and return its deterministic fingerprint.
     * Pipeline: Image → Embedding → L2 Normalize → Quantize → SHA-256
     */
    getFingerprint(imageSource: HTMLImageElement | HTMLCanvasElement): Promise<string>;

    /**
     * Get the raw 128-d embedding vector from a face image.
     */
    getRawEmbedding(imageSource: HTMLImageElement | HTMLCanvasElement): Promise<Float32Array>;

    /**
     * Full registration pipeline: image → embedding → fingerprint → register.
     */
    register(
        imageSource: HTMLImageElement | HTMLCanvasElement,
        publicKey: string,
        metadata?: any
    ): Promise<RegistrationResult>;

    /**
     * Check if a fingerprint exists in the registry.
     */
    check(fingerprint: string): Promise<CheckResult>;

    /**
     * Search for similar faces in the registry using cosine similarity.
     */
    search(imageSource: HTMLImageElement | HTMLCanvasElement, threshold?: number): Promise<SearchResult>;

    /**
     * Revoke an identity.
     */
    revoke(fingerprint: string, signature: string, message: any): Promise<RevokeResult>;

    /**
     * Request consent from an identity owner.
     */
    requestConsent(
        fingerprint: string,
        companyId: string,
        scope: string[],
        duration: number
    ): Promise<ConsentRequest>;

    /**
     * Approve a pending consent request.
     */
    approveConsent(requestId: string, fingerprint: string): Promise<ConsentApproval>;

    /**
     * Verify a consent JWT token.
     */
    verifyToken(token: string): Promise<TokenVerification>;
}

// Embedding exports
export function cosineSimilarity(a: Float32Array | number[], b: Float32Array | number[]): number;

// Fingerprint exports
export function generateFingerprint(rawEmbedding: Float32Array | number[], salt?: string): Promise<string>;

// Registry exports
export class Registry {
    constructor(apiUrl?: string);

    register(fingerprint: string, publicKey: string, embedding?: string, metadata?: any): Promise<RegistrationResult>;
    check(fingerprint: string): Promise<CheckResult>;
    revoke(fingerprint: string, signature: string, message: any): Promise<RevokeResult>;
    search(embedding: number[], threshold?: number): Promise<SearchResult>;
    requestConsent(fingerprint: string, companyId: string, scope: string[], duration: number): Promise<ConsentRequest>;
    approveConsent(requestId: string, fingerprint: string): Promise<ConsentApproval>;
    verify(token: string): Promise<TokenVerification>;
}

export class RegistryError extends Error {
    statusCode: number;
    name: 'RegistryError';
    constructor(message: string, statusCode: number);
}
