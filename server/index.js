const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const db = require('./db');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const HashChain = require('./hashchain');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const { encryptEmbedding, decryptEmbedding } = require('./encryption');
const matchingClient = require('./matching_client');

const app = express();
const PORT = process.env.PORT || 3000;

// CORS: Allow Vercel frontends + localhost in dev
const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    process.env.DASHBOARD_URL,
    process.env.PLAYGROUND_URL,
].filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, curl, server-to-server)
        if (!origin || allowedOrigins.some(o => origin.startsWith(o))) {
            callback(null, true);
        } else {
            callback(new Error(`CORS: Origin ${origin} not allowed`), false);
        }
    }
}));
app.use(bodyParser.json({ limit: '1mb' }));

// --- Structured Request Logging ---
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        const log = {
            timestamp: new Date().toISOString(),
            method: req.method,
            path: req.path,
            status: res.statusCode,
            duration_ms: duration,
            ip: req.ip,
        };
        // Log as JSON for structured log aggregation
        if (res.statusCode >= 400) {
            console.error(JSON.stringify(log));
        } else {
            console.log(JSON.stringify(log));
        }
    });
    next();
});

// --- Middleware: Rate Limiter ---
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: 'Too many requests, please try again later.' }
});
app.use(limiter);

// Stricter rate limit for registration (prevents Sybil spam)
const registerLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5, // 5 registrations per 15 min per IP
    message: { error: 'Registration rate limit exceeded. Try again later.' },
    keyGenerator: (req) => req.ip, // Per-IP
});

// --- Serve Model File for Frontend ---
const path = require('path');
app.get('/model/mobilefacenet.onnx', (req, res) => {
    try {
        res.sendFile(path.join(__dirname, '../model/mobilefacenet.onnx'), {
            headers: {
                'Content-Type': 'application/octet-stream',
                'Cache-Control': 'public, max-age=86400' // Cache for 1 day
            }
        });
    } catch (err) {
        res.status(404).json({ error: 'Model file not found' });
    }
});

// --- JWT Signing Keys (ES256) ---
const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', {
    namedCurve: 'prime256v1',
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
});

console.log("Server Public Key:\n", publicKey);

// --- Hash Chain (v3.0) ---
const chain = new HashChain(db, { privateKey, publicKey });

// ============================================================================
// ROUTES
// ============================================================================

// 1. Health Check
app.get('/', async (req, res) => {
    let matchingStatus = 'unknown';
    try {
        const mHealth = await matchingClient.health();
        matchingStatus = mHealth.status;
    } catch { matchingStatus = 'unreachable'; }

    res.json({
        status: 'ok',
        service: 'V-Face Registry',
        version: '4.0.0',
        protocol: 'signed-log',
        architecture: 'microservices',
        matching: matchingStatus,
    });
});

// 2. Register Identity
// POST /register { fingerprint, public_key, embedding?, metadata? }
app.post('/register', registerLimiter, [
    body('fingerprint').isString().isLength({ min: 64, max: 64 }).matches(/^[a-f0-9]+$/),
    body('public_key').isString().notEmpty(),
    body('embedding').optional().isString()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { fingerprint, public_key, embedding, metadata } = req.body;

    // Encrypt embedding for commitment derivation (stays on API server)
    const encryptedEmbedding = embedding ? encryptEmbedding(embedding) : null;

    // Generate commitment: SHA256(encrypted_embedding || nonce)
    let commitment = null;
    let commitmentNonce = null;
    if (encryptedEmbedding) {
        commitmentNonce = crypto.randomBytes(32).toString('hex');
        commitment = crypto.createHash('sha256')
            .update(encryptedEmbedding + commitmentNonce)
            .digest('hex');
    }

    // Enroll in matching service (Sybil check + Qdrant storage)
    // The matching service decrypts, checks for duplicates, stores in Qdrant, zeroes memory
    let matchingResult = null;
    if (encryptedEmbedding) {
        try {
            matchingResult = await matchingClient.enroll(
                fingerprint,
                encryptedEmbedding,
                public_key,
                metadata
            );
        } catch (matchErr) {
            // If matching service says duplicate (409), propagate it
            if (matchErr.statusCode === 409) {
                return res.status(409).json({ error: matchErr.message });
            }
            console.error('Matching service enrollment failed:', matchErr.message);
            // Non-fatal: still register metadata, vector can be retried
        }
    }

    // Append to hash chain (tamper-evident log)
    let chainEntry = null;
    if (commitment) {
        try {
            chainEntry = await chain.appendEntry(commitment, fingerprint);
        } catch (chainErr) {
            console.error('Hash chain append failed:', chainErr.message);
        }
    }

    const stmt = db.prepare(
        'INSERT INTO fingerprints (fingerprint, public_key, embedding, commitment, commitment_nonce, chain_index, chain_signature, created_at, metadata) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    const chainIndex = chainEntry ? chainEntry.index : null;
    const chainSignature = chainEntry ? chainEntry.signature : null;
    stmt.run(fingerprint, public_key, encryptedEmbedding, commitment, commitmentNonce, chainIndex, chainSignature, Date.now(), JSON.stringify(metadata || {}), function (err) {
        if (err) {
            if (err.message.includes('UNIQUE constraint failed')) {
                return res.status(409).json({ error: 'Identity already registered' });
            }
            return res.status(500).json({ error: err.message });
        }
        res.json({
            success: true,
            id: this.lastID,
            commitment,
            chainIndex,
            chainSignature: chainSignature || null,
            entryHash: chainEntry ? chainEntry.entryHash : null,
            vectorStored: !!matchingResult,
        });
    });
    stmt.finalize();
});

// 3. Check Identity
// POST /check { fingerprint }
app.post('/check', [
    body('fingerprint').isString().isLength({ min: 64, max: 64 }).matches(/^[a-f0-9]+$/)
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { fingerprint } = req.body;

    db.get('SELECT public_key, embedding, commitment, chain_index, chain_signature, created_at, revoked, metadata FROM fingerprints WHERE fingerprint = ?', [fingerprint], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });

        if (!row) {
            return res.json({ exists: false });
        }

        // Decrypt embedding for response
        let decryptedEmbedding = null;
        if (row.embedding) {
            try {
                decryptedEmbedding = decryptEmbedding(row.embedding);
            } catch (e) {
                console.error('Embedding decryption failed:', e.message);
            }
        }

        res.json({
            exists: true,
            revoked: !!row.revoked,
            public_key: row.public_key,
            createdAt: row.created_at,
            embedding: decryptedEmbedding,
            commitment: row.commitment,
            chainIndex: row.chain_index,
            chainSignature: row.chain_signature,
            metadata: JSON.parse(row.metadata || '{}')
        });
    });
});

// 4. Revoke Identity (Secure — signature verified)
// POST /revoke { fingerprint, signature, message }
app.post('/revoke', [
    body('fingerprint').isString().isLength({ min: 64, max: 64 }),
    body('signature').isString().notEmpty(),
    body('message').isObject()
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { fingerprint, signature, message } = req.body;
    const { action, timestamp, nonce } = message;

    // Verify message content
    if (action !== 'revoke' || message.fingerprint !== fingerprint) {
        return res.status(400).json({ error: 'Invalid message action or fingerprint mismatch' });
    }

    // Verify timestamp (±5 minutes)
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - timestamp) > 300) {
        return res.status(400).json({ error: 'Timestamp out of bounds (replay protection)' });
    }

    // Verify nonce (replay protection)
    db.get('SELECT nonce FROM nonces WHERE nonce = ?', [nonce], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (row) return res.status(409).json({ error: 'Nonce already used' });

        // Verify identity ownership (signature)
        db.get('SELECT public_key, revoked FROM fingerprints WHERE fingerprint = ?', [fingerprint], async (err, identityRow) => {
            if (err) return res.status(500).json({ error: err.message });
            if (!identityRow) return res.status(404).json({ error: 'Identity not found' });
            if (identityRow.revoked) return res.status(409).json({ error: 'Identity already revoked' });

            try {
                // Verify signature using the stored public key (PEM format)
                const verify = crypto.createVerify('SHA256');
                verify.update(JSON.stringify(message));
                const isValid = verify.verify(identityRow.public_key, signature, 'hex');

                if (!isValid) {
                    return res.status(403).json({ error: 'Signature invalid or does not match owner' });
                }

                // Revoke vector in matching service
                try {
                    await matchingClient.deleteVector(fingerprint);
                } catch (e) {
                    console.error('Matching service revocation failed:', e.message);
                    // Non-fatal: continue with metadata revocation
                }

                // Commit revocation in metadata DB
                db.serialize(() => {
                    const nonceStmt = db.prepare('INSERT INTO nonces (nonce, expires_at) VALUES (?, ?)');
                    nonceStmt.run(nonce, now + 300);
                    nonceStmt.finalize();

                    const revokeStmt = db.prepare('UPDATE fingerprints SET revoked = 1, revoked_at = ? WHERE fingerprint = ?');
                    revokeStmt.run(Date.now(), fingerprint, function (err) {
                        if (err) return res.status(500).json({ error: err.message });
                        res.json({ success: true, message: 'Identity securely revoked' });
                    });
                    revokeStmt.finalize();
                });

            } catch (sigErr) {
                console.error(sigErr);
                return res.status(400).json({ error: 'Signature verification failed' });
            }
        });
    });
});

// 5. Request Consent
// POST /consent/request { fingerprint, company_id, scope, duration }
app.post('/consent/request', [
    body('fingerprint').isString().isLength({ min: 64, max: 64 }),
    body('company_id').isString().notEmpty(),
    body('scope').isArray(),
    body('duration').isInt({ min: 60 })
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { fingerprint, company_id, scope, duration } = req.body;
    const request_id = crypto.randomUUID();

    // Verify fingerprint exists
    db.get('SELECT fingerprint FROM fingerprints WHERE fingerprint = ? AND revoked = 0', [fingerprint], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'Identity not found or revoked' });

        // Store pending request
        const stmt = db.prepare('INSERT INTO pending_consents (request_id, fingerprint, company_id, scope, duration, created_at) VALUES (?, ?, ?, ?, ?, ?)');
        stmt.run(request_id, fingerprint, company_id, JSON.stringify(scope), duration, Date.now(), function (err) {
            if (err) return res.status(500).json({ error: err.message });

            res.json({
                status: 'pending_user_approval',
                request_id,
                message: 'Ask user to approve this request'
            });
        });
        stmt.finalize();
    });
});

// 6. Approve Consent
// POST /consent/approve { request_id, fingerprint }
app.post('/consent/approve', [
    body('request_id').isString().isUUID(),
    body('fingerprint').isString().isLength({ min: 64, max: 64 })
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { request_id, fingerprint } = req.body;

    // Look up pending request
    db.get('SELECT * FROM pending_consents WHERE request_id = ? AND status = ?', [request_id, 'pending'], (err, pendingRow) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!pendingRow) return res.status(404).json({ error: 'Pending consent request not found' });
        if (pendingRow.fingerprint !== fingerprint) {
            return res.status(403).json({ error: 'Fingerprint does not match consent request' });
        }

        // Verify identity exists
        db.get('SELECT * FROM fingerprints WHERE fingerprint = ? AND revoked = 0', [fingerprint], (err, identityRow) => {
            if (err || !identityRow) return res.status(400).json({ error: 'Invalid or revoked identity' });

            const scope = JSON.parse(pendingRow.scope);
            const durationSec = pendingRow.duration;

            // Generate JWT
            const payload = {
                iss: 'https://registry.v-face.org',
                sub: identityRow.public_key,
                aud: pendingRow.company_id,
                vf_fp: fingerprint,
                vf_scope: scope,
                vf_model_v: 'mobilefacenet_128d'
            };

            const token = jwt.sign(payload, privateKey, {
                algorithm: 'ES256',
                expiresIn: durationSec,
                jwtid: crypto.randomUUID()
            });

            // Update pending → approved
            const updateStmt = db.prepare('UPDATE pending_consents SET status = ? WHERE request_id = ?');
            updateStmt.run('approved', request_id);
            updateStmt.finalize();

            // Log active consent
            const consentId = crypto.randomUUID();
            const expiresAt = Date.now() + durationSec * 1000;
            const consentStmt = db.prepare('INSERT INTO active_consents (consent_id, fingerprint, company_id, scope, expires_at, issued_at) VALUES (?, ?, ?, ?, ?, ?)');
            consentStmt.run(consentId, fingerprint, pendingRow.company_id, pendingRow.scope, expiresAt, Date.now());
            consentStmt.finalize();

            res.json({ success: true, token });
        });
    });
});

// 7. Verify Consent Token
// POST /verify { token }
app.post('/verify', (req, res) => {
    const { token } = req.body;
    if (!token) return res.status(400).json({ valid: false, reason: 'Missing token' });

    try {
        const decoded = jwt.verify(token, publicKey, { algorithms: ['ES256'] });
        const fingerprint = decoded.vf_fp;

        // Registry lookup (fail closed)
        db.get('SELECT revoked FROM fingerprints WHERE fingerprint = ?', [fingerprint], (err, row) => {
            if (err) {
                console.error('Registry Error:', err);
                return res.status(500).json({ valid: false, reason: 'registry_unavailable' });
            }
            if (!row) return res.json({ valid: false, reason: 'identity_not_found' });
            if (row.revoked) return res.json({ valid: false, reason: 'identity_revoked' });

            res.json({ valid: true, claims: decoded });
        });

    } catch (err) {
        return res.json({ valid: false, reason: err.message });
    }
});

// 8. Similarity Search (delegates to matching service → Qdrant HNSW)
// POST /search { encrypted_embedding, threshold? }
app.post('/search', [
    body('encrypted_embedding').isString().notEmpty(),
    body('threshold').optional().isFloat({ min: 0, max: 1 }),
    body('top_k').optional().isInt({ min: 1, max: 100 }),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { encrypted_embedding, threshold = 0.85, top_k = 1 } = req.body;

    try {
        const result = await matchingClient.search(encrypted_embedding, threshold, top_k);
        res.json(result);
    } catch (err) {
        console.error('Search error:', err);
        res.status(500).json({ error: 'Search failed: ' + err.message });
    }
});

// ============================================================================
// HASH CHAIN ENDPOINTS (v3.0 — replaces blockchain)
// ============================================================================

// 9. Chain Root — current chain tip (public, cacheable)
app.get('/chain/root', async (req, res) => {
    try {
        const root = await chain.getRoot();
        res.json(root);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 10. Chain Proof — inclusion proof for a specific entry
app.get('/chain/proof/:index', async (req, res) => {
    const index = parseInt(req.params.index, 10);
    if (isNaN(index) || index < 1) {
        return res.status(400).json({ error: 'Invalid index' });
    }

    try {
        const entry = await chain.getEntry(index);
        if (!entry) {
            return res.status(404).json({ error: 'Entry not found' });
        }
        res.json({
            entry,
            publicKey: publicKey,
            verifyInstructions: {
                step1: 'Recompute entryHash = SHA256(index|commitment|fingerprint|timestamp|prevHash)',
                step2: 'Verify signature using the publicKey and entryHash',
                step3: 'Verify prevHash matches the entryHash of the previous entry',
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 11. Chain Snapshot — full chain export for public audit
app.get('/chain/snapshot', async (req, res) => {
    try {
        const snapshot = await chain.exportSnapshot();
        res.json(snapshot);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 12. Chain Verify — server self-verification of integrity
app.get('/chain/verify', async (req, res) => {
    try {
        const result = await chain.verifyChain();
        res.json({
            ...result,
            verifiedAt: new Date().toISOString(),
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Similarity search helpers removed — delegated to matching service (Qdrant HNSW)

// ============================================================================
// START SERVER
// ============================================================================

app.listen(PORT, () => {
    console.log(`🚀 V-Face Registry API running on port ${PORT}`);
});
