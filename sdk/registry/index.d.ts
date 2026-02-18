/**
 * V-Face Registry — TypeScript Definitions
 * HTTP client for the V-Face Registry API server
 */

export interface RegistrationResult {
    success: boolean;
    id?: number;
}

export interface CheckResult {
    exists: boolean;
    revoked?: boolean;
    public_key?: string;
    createdAt?: number;
    embedding?: string;
}

export interface RevokeResult {
    success: boolean;
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

/**
 * Registry API client for V-Face Registry server
 */
export class Registry {
    constructor(apiUrl?: string);

    /**
     * Register a biometric identity.
     */
    register(
        fingerprint: string,
        publicKey: string,
        embedding?: string,
        metadata?: any
    ): Promise<RegistrationResult>;

    /**
     * Check if a fingerprint is registered.
     */
    check(fingerprint: string): Promise<CheckResult>;

    /**
     * Revoke an identity with signed proof of ownership.
     */
    revoke(fingerprint: string, signature: string, message: any): Promise<RevokeResult>;

    /**
     * Request consent from identity owner.
     */
    requestConsent(
        fingerprint: string,
        companyId: string,
        scope: string[],
        duration: number
    ): Promise<ConsentRequest>;

    /**
     * Approve a consent request and receive a JWT token.
     */
    approveConsent(requestId: string, fingerprint: string): Promise<ConsentApproval>;

    /**
     * Verify a consent JWT token.
     */
    verify(token: string): Promise<TokenVerification>;

    /**
     * Search for similar embeddings (cosine similarity).
     */
    search(embedding: number[], threshold?: number): Promise<SearchResult>;
}

/**
 * Custom error class for Registry API errors
 */
export class RegistryError extends Error {
    statusCode: number;
    name: 'RegistryError';
    constructor(message: string, statusCode: number);
}
