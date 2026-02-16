/**
 * V-Face E2E Integration Tests
 * 
 * Tests the full register → check → consent → revoke flow
 * against a live server instance.
 * 
 * Prerequisites:
 *   1. Start the server: cd server && node index.js
 *   2. Run: npx mocha test/integration.test.js --timeout 10000
 */
import { expect } from 'chai';
import { Registry, RegistryError } from '../registry/index.js';
import { generateFingerprint } from '../fingerprint/index.js';
import crypto from 'crypto';

const REGISTRY_URL = process.env.VFACE_REGISTRY_URL || 'http://localhost:3000';

describe('V-Face E2E Integration', function () {
    this.timeout(10000);

    let registry;
    let testFingerprint;
    let testEmbedding;
    const testPublicKey = '0x' + crypto.randomBytes(20).toString('hex');

    before(async function () {
        registry = new Registry(REGISTRY_URL);

        // Check server is running
        try {
            const res = await fetch(REGISTRY_URL);
            const data = await res.json();
            if (data.status !== 'ok') throw new Error('Server not healthy');
        } catch (e) {
            this.skip('Server not running at ' + REGISTRY_URL + '. Start with: cd server && node index.js');
        }

        // Generate deterministic test embedding + fingerprint
        testEmbedding = new Float32Array(128);
        const seed = Date.now();
        let s = seed;
        for (let i = 0; i < 128; i++) {
            s = (s * 9301 + 49297) % 233280;
            testEmbedding[i] = (s / 233280) * 2 - 1;
        }
        // L2 normalize
        let norm = 0;
        for (let i = 0; i < 128; i++) norm += testEmbedding[i] ** 2;
        norm = Math.sqrt(norm);
        for (let i = 0; i < 128; i++) testEmbedding[i] /= norm;

        testFingerprint = await generateFingerprint(testEmbedding);
    });

    // ========================================================================
    // 1. REGISTRATION
    // ========================================================================

    describe('Registration', function () {
        it('should register a new identity', async function () {
            const embeddingJson = JSON.stringify(Array.from(testEmbedding));
            const result = await registry.register(testFingerprint, testPublicKey, embeddingJson);

            expect(result.success).to.be.true;
            expect(result.id).to.be.a('number');
        });

        it('should reject duplicate registration', async function () {
            try {
                const embeddingJson = JSON.stringify(Array.from(testEmbedding));
                await registry.register(testFingerprint, testPublicKey, embeddingJson);
                expect.fail('Should have thrown');
            } catch (err) {
                expect(err).to.be.instanceOf(RegistryError);
                expect(err.statusCode).to.equal(409);
            }
        });

        it('should reject Sybil registration (very similar embedding)', async function () {
            // Create a near-identical embedding (add tiny noise)
            const sybilEmbedding = new Float32Array(testEmbedding);
            for (let i = 0; i < 128; i++) {
                sybilEmbedding[i] += (Math.random() - 0.5) * 0.001; // Tiny noise
            }
            // Re-normalize
            let norm = 0;
            for (let i = 0; i < 128; i++) norm += sybilEmbedding[i] ** 2;
            norm = Math.sqrt(norm);
            for (let i = 0; i < 128; i++) sybilEmbedding[i] /= norm;

            const sybilFingerprint = await generateFingerprint(sybilEmbedding);
            const embeddingJson = JSON.stringify(Array.from(sybilEmbedding));

            try {
                await registry.register(sybilFingerprint, testPublicKey, embeddingJson);
                expect.fail('Should have thrown Sybil error');
            } catch (err) {
                expect(err).to.be.instanceOf(RegistryError);
                expect(err.statusCode).to.equal(409);
                expect(err.message).to.include('Similar identity');
            }
        });
    });

    // ========================================================================
    // 2. CHECK
    // ========================================================================

    describe('Check', function () {
        it('should find a registered identity', async function () {
            const result = await registry.check(testFingerprint);

            expect(result.exists).to.be.true;
            expect(result.revoked).to.be.false;
            expect(result.public_key).to.equal(testPublicKey);
            expect(result.createdAt).to.be.a('number');
        });

        it('should return exists:false for unknown fingerprint', async function () {
            const unknownFp = 'a'.repeat(64);
            const result = await registry.check(unknownFp);

            expect(result.exists).to.be.false;
        });
    });

    // ========================================================================
    // 3. SIMILARITY SEARCH
    // ========================================================================

    describe('Similarity Search', function () {
        it('should find matches above threshold', async function () {
            const result = await registry.search(Array.from(testEmbedding), 0.5);

            expect(result.matches).to.be.an('array');
            expect(result.matches.length).to.be.greaterThan(0);
            expect(result.matches[0].fingerprint).to.equal(testFingerprint);
            expect(result.matches[0].similarity).to.be.greaterThan(0.9);
        });

        it('should return empty for very high threshold', async function () {
            // Random embedding that won't match anything
            const randomEmb = Array.from({ length: 128 }, () => Math.random() * 2 - 1);
            const result = await registry.search(randomEmb, 0.99);

            // May or may not have matches, but shouldn't error
            expect(result.matches).to.be.an('array');
        });
    });

    // ========================================================================
    // 4. CONSENT FLOW
    // ========================================================================

    describe('Consent Flow', function () {
        let requestId;

        it('should create a pending consent request', async function () {
            const result = await registry.requestConsent(testFingerprint, 'test-company', ['auth:login'], 3600);

            expect(result.status).to.equal('pending_user_approval');
            expect(result.request_id).to.be.a('string');
            requestId = result.request_id;
        });

        it('should approve consent and return JWT', async function () {
            const result = await registry.approveConsent(requestId, testFingerprint);

            expect(result.success).to.be.true;
            expect(result.token).to.be.a('string');
            expect(result.token.split('.')).to.have.lengthOf(3); // JWT format
        });

        it('should verify a valid token', async function () {
            // First get a fresh token
            const consentReq = await registry.requestConsent(testFingerprint, 'verify-test', ['auth:login'], 3600);
            const approval = await registry.approveConsent(consentReq.request_id, testFingerprint);

            const result = await registry.verify(approval.token);

            expect(result.valid).to.be.true;
            expect(result.claims.aud).to.equal('verify-test');
            expect(result.claims.vf_fp).to.equal(testFingerprint);
        });

        it('should reject an invalid token', async function () {
            const result = await registry.verify('invalid.jwt.token');

            expect(result.valid).to.be.false;
            expect(result.reason).to.be.a('string');
        });

        it('should reject consent for non-existent fingerprint', async function () {
            try {
                await registry.requestConsent('b'.repeat(64), 'test-company', ['auth:login'], 3600);
                expect.fail('Should have thrown');
            } catch (err) {
                expect(err).to.be.instanceOf(RegistryError);
                expect(err.statusCode).to.equal(404);
            }
        });
    });
});
