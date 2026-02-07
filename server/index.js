const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const db = require('./db');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { ethers } = require('ethers');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

// --- Middleware: Rate Limiter ---
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: { error: 'Too many requests, please try again later.' }
});

// Apply to all API routes
app.use(limiter);

// --- Encryption Setup (MVP) ---
// In production, load this from a secure file/env
const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', {
    namedCurve: 'prime256v1', // ES256
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
});

console.log("Server Public Key:\n", publicKey);

// --- Routes ---

// 1. Health Check
app.get('/', (req, res) => {
    res.json({ status: 'ok', service: 'V-Face Registry' });
});

// 2. Register Identity
// POST /register { fingerprint, public_key, embedding }
app.post('/register', [
    body('fingerprint').isString().isLength({ min: 64, max: 64 }).matches(/^[a-f0-9]+$/),
    body('public_key').isString().notEmpty(),
    body('embedding').optional().isString() // Base64 or JSON string of vector
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { fingerprint, public_key, embedding, metadata } = req.body;

    const stmt = db.prepare('INSERT INTO fingerprints (fingerprint, public_key, embedding, created_at, metadata) VALUES (?, ?, ?, ?, ?)');
    stmt.run(fingerprint, public_key, embedding || null, Date.now(), JSON.stringify(metadata || {}), function (err) {
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

// 3. Check Identity / Retrieve Encrypted Vector
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

        res.json({
            exists: true,
            revoked: !!row.revoked,
            createdAt: row.created_at,
            embedding: row.embedding, // Return stored embedding (should be encrypted in prod)
            metadata: JSON.parse(row.metadata || '{}')
        });
    });
});

// 4. Revoke Identity (Simplified for MVP)
// 4. Revoke Identity (Secure)
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

    // 1. Verify Message Content
    if (action !== 'revoke' || message.fingerprint !== fingerprint) {
        return res.status(400).json({ error: 'Invalid message action or fingerprint mismatch' });
    }

    // 2. Verify Timestamp (±5 minutes)
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - timestamp) > 300) {
        return res.status(400).json({ error: 'Timestamp out of bounds (replay protection)' });
    }

    // 3. Verify Nonce (Replay Protection)
    db.get('SELECT nonce FROM nonces WHERE nonce = ?', [nonce], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (row) return res.status(409).json({ error: 'Nonce already used' });

        // 4. Verify Identity Ownership (Signature)
        db.get('SELECT public_key, revoked FROM fingerprints WHERE fingerprint = ?', [fingerprint], async (err, identityRow) => {
            if (err) return res.status(500).json({ error: err.message });
            if (!identityRow) return res.status(404).json({ error: 'Identity not found' });
            if (identityRow.revoked) return res.status(409).json({ error: 'Identity already revoked' });

            try {
                // Reconstruct the message exactly as it was signed on frontend
                // Ideally, use EIP-712, but for MVP we use JSON.stringify(message) or specific format
                // We'll require the frontend to sign the JSON string of the message object
                const recoveredAddress = ethers.verifyMessage(JSON.stringify(message), signature);

                if (recoveredAddress.toLowerCase() !== identityRow.public_key.toLowerCase()) {
                    return res.status(403).json({ error: 'Signature invalid or does not match owner' });
                }

                // 5. Commit Revocation
                db.serialize(() => {
                    // Mark Nonce Used
                    const stmt = db.prepare('INSERT INTO nonces (nonce, expires_at) VALUES (?, ?)');
                    stmt.run(nonce, now + 300); // Expire nonce after 5 mins (or keep forever in strict mode)
                    stmt.finalize();

                    // Soft Delete Identity
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
app.post('/consent/request', (req, res) => {
    const { fingerprint, company_id, scope, duration } = req.body;

    const request_id = crypto.randomUUID();

    // Store pending request (in memory or separate table - not implemented for MVP)

    res.json({
        status: 'pending_user_approval',
        request_id: request_id,
        message: 'Ask user to approve this request'
    });
});

// 6. Approve Consent (Mock User Action)
// POST /consent/approve { request_id, fingerprint }
app.post('/consent/approve', (req, res) => {
    const { request_id, fingerprint, company_id, scope, duration } = req.body; // Mocking inputs for simplicity

    // Verify fingerprint exists
    db.get('SELECT * FROM fingerprints WHERE fingerprint = ? AND revoked = 0', [fingerprint], (err, row) => {
        if (err || !row) return res.status(400).json({ error: 'Invalid or revoked identity' });

        // Generate Token
        const payload = {
            iss: 'https://registry.v-face.org',
            sub: row.public_key,
            aud: company_id || 'demo_company',
            vf_fp: fingerprint,
            vf_scope: scope || ['auth:login'],
            vf_model_v: 'mobilefacenet_128d'
        };

        const token = jwt.sign(payload, privateKey, {
            algorithm: 'ES256',
            expiresIn: duration || '1h',
            jwtid: crypto.randomUUID()
        });

        // Log consent
        const stmt = db.prepare('INSERT INTO active_consents (consent_id, fingerprint, company_id, scope, expires_at, issued_at) VALUES (?, ?, ?, ?, ?, ?)');
        const expiresAt = Date.now() + (duration ? parseInt(duration) * 1000 : 3600000);
        stmt.run(crypto.randomUUID(), fingerprint, company_id || 'demo_company', JSON.stringify(scope), expiresAt, Date.now());
        stmt.finalize();

        res.json({
            success: true,
            token: token
        });
    });
});

// 7. Strict Token Verification (Registry-Aware)
// POST /verify { token }
app.post('/verify', (req, res) => {
    const { token } = req.body;
    if (!token) return res.status(400).json({ valid: false, reason: 'Missing token' });

    try {
        // 1. Verify Signature & Expiration (JWT Library)
        // options: { algorithms: ['ES256'] } enforces algorithm
        const decoded = jwt.verify(token, publicKey, { algorithms: ['ES256'] });

        // 2. Extract Claims
        const { sub: fingerprint, aud, vf_model_v } = decoded;

        // 3. Registry Lookout (Fail Closed)
        db.get('SELECT revoked, metadata FROM fingerprints WHERE fingerprint = ?', [fingerprint], (err, row) => {
            if (err) {
                console.error('Registry Error:', err);
                return res.status(500).json({ valid: false, reason: 'registry_unavailable' });
            }

            // 4. Identity Existence Check
            if (!row) {
                return res.json({ valid: false, reason: 'identity_not_found' });
            }

            // 5. Revocation Check
            if (row.revoked) {
                return res.json({ valid: false, reason: 'identity_revoked' });
            }

            // 6. Model Version Check (Optional but recommended)
            // if (vf_model_v !== CURRENT_MODEL_VERSION) ...

            // 7. Success
            res.json({
                valid: true,
                claims: decoded
            });
        });

    } catch (err) {
        return res.json({ valid: false, reason: err.message }); // e.g., 'jwt expired', 'invalid signature'
    }
});

app.listen(PORT, () => {
    console.log(`Registry API running on port ${PORT}`);
});
