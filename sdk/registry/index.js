/**
 * V-Face Registry Client
 * HTTP client for the V-Face Registry API server.
 */
export class Registry {
    constructor(apiUrl) {
        this.apiUrl = (apiUrl || 'http://localhost:3000').replace(/\/$/, '');
    }

    /**
     * Register a biometric identity.
     * @param {string} fingerprint - 64-char hex fingerprint
     * @param {string} publicKey - Wallet address or public key
     * @param {string} [embedding] - Base64 encoded embedding vector
     * @param {Object} [metadata] - Optional metadata
     * @returns {Promise<{success: boolean, id?: number}>}
     */
    async register(fingerprint, publicKey, embedding = null, metadata = null) {
        const body = { fingerprint, public_key: publicKey };
        if (embedding) body.embedding = embedding;
        if (metadata) body.metadata = metadata;

        const res = await fetch(`${this.apiUrl}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({ error: res.statusText }));
            throw new RegistryError(err.error || 'Registration failed', res.status);
        }

        return res.json();
    }

    /**
     * Check if a fingerprint is registered.
     * @param {string} fingerprint - 64-char hex fingerprint
     * @returns {Promise<{exists: boolean, revoked?: boolean, createdAt?: number, embedding?: string}>}
     */
    async check(fingerprint) {
        const res = await fetch(`${this.apiUrl}/check`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fingerprint })
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({ error: res.statusText }));
            throw new RegistryError(err.error || 'Check failed', res.status);
        }

        return res.json();
    }

    /**
     * Revoke an identity with signed proof of ownership.
     * @param {string} fingerprint - 64-char hex fingerprint
     * @param {string} signature - Signed message
     * @param {Object} message - The message that was signed { action, fingerprint, timestamp, nonce }
     * @returns {Promise<{success: boolean}>}
     */
    async revoke(fingerprint, signature, message) {
        const res = await fetch(`${this.apiUrl}/revoke`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fingerprint, signature, message })
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({ error: res.statusText }));
            throw new RegistryError(err.error || 'Revocation failed', res.status);
        }

        return res.json();
    }

    /**
     * Request consent from identity owner.
     * @param {string} fingerprint - 64-char hex fingerprint
     * @param {string} companyId - Requesting company identifier
     * @param {string[]} scope - Requested permissions
     * @param {number} duration - Duration in seconds
     * @returns {Promise<{status: string, request_id: string}>}
     */
    async requestConsent(fingerprint, companyId, scope, duration) {
        const res = await fetch(`${this.apiUrl}/consent/request`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fingerprint, company_id: companyId, scope, duration })
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({ error: res.statusText }));
            throw new RegistryError(err.error || 'Consent request failed', res.status);
        }

        return res.json();
    }

    /**
     * Approve a consent request and receive a JWT token.
     * @param {string} requestId - Pending consent request ID
     * @param {string} fingerprint - 64-char hex fingerprint
     * @returns {Promise<{success: boolean, token: string}>}
     */
    async approveConsent(requestId, fingerprint) {
        const res = await fetch(`${this.apiUrl}/consent/approve`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ request_id: requestId, fingerprint })
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({ error: res.statusText }));
            throw new RegistryError(err.error || 'Consent approval failed', res.status);
        }

        return res.json();
    }

    /**
     * Verify a consent JWT token.
     * @param {string} token - JWT consent token
     * @returns {Promise<{valid: boolean, claims?: Object, reason?: string}>}
     */
    async verify(token) {
        const res = await fetch(`${this.apiUrl}/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token })
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({ error: res.statusText }));
            throw new RegistryError(err.error || 'Verification failed', res.status);
        }

        return res.json();
    }

    /**
     * Search for similar embeddings (cosine similarity).
     * @param {number[]} embedding - Raw embedding vector
     * @param {number} [threshold=0.85] - Similarity threshold
     * @returns {Promise<{matches: Array<{fingerprint: string, similarity: number}>}>}
     */
    async search(embedding, threshold = 0.85) {
        const res = await fetch(`${this.apiUrl}/search`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ embedding: Array.from(embedding), threshold })
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({ error: res.statusText }));
            throw new RegistryError(err.error || 'Search failed', res.status);
        }

        return res.json();
    }
}

/**
 * Custom error class for Registry API errors.
 */
export class RegistryError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.name = 'RegistryError';
        this.statusCode = statusCode;
    }
}
