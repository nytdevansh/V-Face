const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const db = require('./db');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { ethers } = require('ethers');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const { encryptEmbedding, decryptEmbedding } = require('./encryption');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json({ limit: '1mb' }));

// --- Middleware: Rate Limiter ---
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: 'Too many requests, please try again later.' }
});
app.use(limiter);

// --- JWT Signing Keys (ES256) ---
const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', {
    namedCurve: 'prime256v1',
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
});

console.log("Server Public Key:\n", publicKey);

// ============================================================================
// ROUTES
// ============================================================================

// 1. Health Check
app.get('/', (req, res) => {
    res.json({ status: 'ok', service: 'V-Face Registry', version: '2.0.0' });
});

// 2. Register Identity
// POST /register { fingerprint, public_key, embedding?, metadata? }
app.post('/register', [
    body('fingerprint').isString().isLength({ min: 64, max: 64 }).matches(/^[a-f0-9]+$/),
    body('public_key').isString().notEmpty(),
    body('embedding').optional().isString()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { fingerprint, public_key, embedding, metadata } = req.body;

    // Sybil resistance: check for similar embeddings before registering
    if (embedding) {
        try {
            const embeddingVector = JSON.parse(embedding);
            const sybilMatch = await findSimilarEmbedding(embeddingVector, 0.92);
            if (sybilMatch) {
                return res.status(409).json({
                    error: 'Similar identity already registered (Sybil resistance)',
                    match_fingerprint: sybilMatch.fingerprint,
                    similarity: sybilMatch.similarity
                });
            }
        } catch (e) {
            // Embedding parse failed — skip Sybil check, proceed with registration
            console.warn('Sybil check skipped — embedding parse error:', e.message);
        }
    }

    // Encrypt embedding before storage
    const encryptedEmbedding = embedding ? encryptEmbedding(embedding) : null;

    const stmt = db.prepare('INSERT INTO fingerprints (fingerprint, public_key, embedding, created_at, metadata) VALUES (?, ?, ?, ?, ?)');
    stmt.run(fingerprint, public_key, encryptedEmbedding, Date.now(), JSON.stringify(metadata || {}), function (err) {
        if (err) {
            if (err.message.includes('UNIQUE constraint failed')) {
                return res.status(409).json({ error: 'Identity already registered' });
            }
            return res.status(500).json({ error: err.message });
        }
        res.json({ success: true, id: this.lastID });
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

    db.get('SELECT public_key, embedding, created_at, revoked, metadata FROM fingerprints WHERE fingerprint = ?', [fingerprint], (err, row) => {
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
                const recoveredAddress = ethers.verifyMessage(JSON.stringify(message), signature);

                if (recoveredAddress.toLowerCase() !== identityRow.public_key.toLowerCase()) {
                    return res.status(403).json({ error: 'Signature invalid or does not match owner' });
                }

                // Commit revocation
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

// 8. Similarity Search (NEW)
// POST /search { embedding, threshold? }
app.post('/search', [
    body('embedding').isArray({ min: 1 }),
    body('threshold').optional().isFloat({ min: 0, max: 1 })
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { embedding, threshold = 0.85 } = req.body;

    try {
        const matches = await findSimilarEmbeddings(embedding, threshold);
        res.json({ matches, threshold, total_checked: matches._totalChecked });
        delete matches._totalChecked;
    } catch (err) {
        console.error('Search error:', err);
        res.status(500).json({ error: 'Search failed: ' + err.message });
    }
});

// ============================================================================
// SIMILARITY SEARCH HELPERS
// ============================================================================

/**
 * Compute cosine similarity between two vectors.
 */
function cosineSimilarity(a, b) {
    if (a.length !== b.length) return 0;
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Find all embeddings above a similarity threshold.
 * @param {number[]} queryEmbedding - Query vector
 * @param {number} threshold - Minimum cosine similarity
 * @returns {Promise<Array<{fingerprint: string, similarity: number, public_key: string}>>}
 */
function findSimilarEmbeddings(queryEmbedding, threshold) {
    return new Promise((resolve, reject) => {
        db.all('SELECT fingerprint, public_key, embedding FROM fingerprints WHERE revoked = 0 AND embedding IS NOT NULL', [], (err, rows) => {
            if (err) return reject(err);

            const matches = [];
            for (const row of rows) {
                try {
                    const decrypted = decryptEmbedding(row.embedding);
                    const stored = JSON.parse(decrypted);
                    const sim = cosineSimilarity(queryEmbedding, stored);

                    if (sim >= threshold) {
                        matches.push({
                            fingerprint: row.fingerprint,
                            public_key: row.public_key,
                            similarity: Math.round(sim * 10000) / 10000
                        });
                    }
                } catch (e) {
                    // Skip corrupted/unparseable embeddings
                    continue;
                }
            }

            // Sort by similarity descending
            matches.sort((a, b) => b.similarity - a.similarity);
            matches._totalChecked = rows.length;
            resolve(matches);
        });
    });
}

/**
 * Find a single similar embedding above threshold (for Sybil check).
 */
function findSimilarEmbedding(queryEmbedding, threshold) {
    return new Promise((resolve, reject) => {
        db.all('SELECT fingerprint, embedding FROM fingerprints WHERE revoked = 0 AND embedding IS NOT NULL', [], (err, rows) => {
            if (err) return reject(err);

            for (const row of rows) {
                try {
                    const decrypted = decryptEmbedding(row.embedding);
                    const stored = JSON.parse(decrypted);
                    const sim = cosineSimilarity(queryEmbedding, stored);

                    if (sim >= threshold) {
                        return resolve({
                            fingerprint: row.fingerprint,
                            similarity: Math.round(sim * 10000) / 10000
                        });
                    }
                } catch (e) {
                    continue;
                }
            }

            resolve(null);
        });
    });
}

// ============================================================================
// START SERVER
// ============================================================================

app.listen(PORT, () => {
    console.log(`🚀 V-Face Registry API running on port ${PORT}`);
});
