#!/usr/bin/env node

/**
 * V-Face Integration Test
 *
 * Tests the full microservices stack:
 *   1. API health check (with retry for startup)
 *   2. Register identity (→ matching service → Qdrant)
 *   3. Search with same embedding (→ match)
 *   4. Search with different embedding (→ no match)
 *   5. Chain verification
 *   6. Check identity
 *
 * Usage:
 *   ./scripts/run_test.sh        # recommended (cleans volumes, starts stack)
 *   node scripts/integration_test.js   # if stack is already running
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Auto-load .env file (same key as Docker containers)
const envPath = path.resolve(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    for (const line of envContent.split('\n')) {
        const match = line.match(/^(\w+)=(.+)$/);
        if (match && !process.env[match[1]]) {
            process.env[match[1]] = match[2].trim();
        }
    }
}

const API_URL = process.env.API_URL || 'http://localhost:3000';
const ENCRYPTION_KEY = process.env.VFACE_ENCRYPTION_KEY;

if (!ENCRYPTION_KEY) {
    console.error('❌ Set VFACE_ENCRYPTION_KEY in .env or environment');
    process.exit(1);
}

let passed = 0;
let failed = 0;

function assert(condition, label) {
    if (condition) {
        console.log(`  ✅ ${label}`);
        passed++;
    } else {
        console.log(`  ❌ ${label}`);
        failed++;
    }
}

function encryptEmbedding(embedding) {
    const key = Buffer.from(ENCRYPTION_KEY, 'hex');
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(embedding, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return `v1:${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

function generateFingerprint() {
    return crypto.randomBytes(32).toString('hex');
}

function generateEmbedding(seed) {
    const rng = crypto.createHash('sha256').update(seed).digest();
    const embedding = new Array(128);
    for (let i = 0; i < 128; i++) {
        embedding[i] = ((rng[i % 32] + i * 7) % 256 - 128) / 128.0;
    }
    const norm = Math.sqrt(embedding.reduce((s, v) => s + v * v, 0));
    return embedding.map(v => v / norm);
}

async function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

async function waitForAPI(maxRetries = 15, delayMs = 2000) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            const res = await fetch(`${API_URL}/`);
            const data = await res.json();
            if (data.status === 'ok' && data.matching === 'ok') {
                return data;
            }
            console.log(`  ⏳ API up but matching=${data.matching}, retrying (${i + 1}/${maxRetries})...`);
        } catch {
            console.log(`  ⏳ Waiting for API (${i + 1}/${maxRetries})...`);
        }
        await sleep(delayMs);
    }
    throw new Error('API did not become ready');
}

async function main() {
    console.log('='.repeat(60));
    console.log('V-Face Integration Test');
    console.log('='.repeat(60));
    console.log(`  Key: ${ENCRYPTION_KEY.slice(0, 8)}...`);
    console.log(`  API: ${API_URL}`);

    // 1. Health check (with retry)
    console.log('\n📡 Test 1: API Health Check');
    let healthData;
    try {
        healthData = await waitForAPI();
        assert(healthData.status === 'ok', `API status: ${healthData.status}`);
        assert(healthData.version === '4.0.0', `Version: ${healthData.version}`);
        assert(healthData.architecture === 'microservices', `Architecture: ${healthData.architecture}`);
        assert(healthData.matching === 'ok', `Matching: ${healthData.matching}`);
    } catch (e) {
        assert(false, `API unreachable: ${e.message}`);
        console.error('\n⛔ API not ready. Start with: ./scripts/run_test.sh');
        process.exit(1);
    }

    // 2. Register identity
    console.log('\n📝 Test 2: Register Identity');
    const fingerprint = generateFingerprint();
    const runId = Date.now().toString();
    const embeddingA = generateEmbedding('person-A-' + runId);
    const encryptedA = encryptEmbedding(JSON.stringify(embeddingA));
    const { publicKey: pubKey } = crypto.generateKeyPairSync('ec', {
        namedCurve: 'prime256v1',
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });

    try {
        const res = await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                fingerprint,
                public_key: pubKey,
                embedding: JSON.stringify(embeddingA),
            }),
        });
        const data = await res.json();
        if (res.status !== 200) {
            console.log(`  ⚠️  Response: ${JSON.stringify(data)}`);
        }
        assert(data.success === true, `Registration: ${data.success ? 'ok' : data.error || 'failed'}`);
        assert(typeof data.commitment === 'string', `Commitment: ${data.commitment?.slice(0, 16)}...`);
        assert(typeof data.chainIndex === 'number', `Chain index: ${data.chainIndex}`);
        assert(data.vectorStored === true, `Vector stored: ${data.vectorStored}`);
    } catch (e) {
        assert(false, `Registration failed: ${e.message}`);
    }

    // Small delay for Qdrant indexing
    await sleep(500);

    // 3. Search with same embedding (should match)
    console.log('\n🔍 Test 3: Search — Same Person');
    try {
        const res = await fetch(`${API_URL}/search`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                encrypted_embedding: encryptedA,
                threshold: 0.85,
            }),
        });
        const data = await res.json();
        if (res.status !== 200) {
            console.log(`  ⚠️  Response (${res.status}): ${JSON.stringify(data)}`);
        }
        assert(data.matched === true, `Matched: ${data.matched}`);
        if (data.results && data.results.length > 0) {
            assert(data.results[0].score > 0.85, `Score: ${data.results[0].score}`);
        }
        console.log(`  Search time: ${data.search_time_ms}ms`);
    } catch (e) {
        assert(false, `Search failed: ${e.message}`);
    }

    // 4. Search with different embedding (should not match)
    console.log('\n🔍 Test 4: Search — Different Person');
    const embeddingB = generateEmbedding('person-B-different-' + runId);
    const encryptedB = encryptEmbedding(JSON.stringify(embeddingB));
    try {
        const res = await fetch(`${API_URL}/search`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                encrypted_embedding: encryptedB,
                threshold: 0.85,
            }),
        });
        const data = await res.json();
        if (res.status !== 200) {
            console.log(`  ⚠️  Response (${res.status}): ${JSON.stringify(data)}`);
        }
        assert(data.matched === false, `Matched: ${data.matched}`);
        console.log(`  Search time: ${data.search_time_ms}ms`);
    } catch (e) {
        assert(false, `Search failed: ${e.message}`);
    }

    // 5. Chain verification
    console.log('\n🔗 Test 5: Hash Chain Verification');
    try {
        const res = await fetch(`${API_URL}/chain/verify`);
        const data = await res.json();
        assert(data.valid === true, `Chain valid: ${data.valid}${data.error ? ' (' + data.error + ')' : ''}`);
        assert(data.checked >= 1, `Entries checked: ${data.checked}`);
    } catch (e) {
        assert(false, `Chain verify failed: ${e.message}`);
    }

    // 6. Check identity
    console.log('\n👤 Test 6: Check Identity');
    try {
        const res = await fetch(`${API_URL}/check`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fingerprint }),
        });
        const data = await res.json();
        assert(data.exists === true, `Exists: ${data.exists}`);
        assert(data.revoked === false, `Revoked: ${data.revoked}`);
        assert(typeof data.chainIndex === 'number', `Chain index: ${data.chainIndex}`);
    } catch (e) {
        assert(false, `Check failed: ${e.message}`);
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    const total = passed + failed;
    if (failed === 0) {
        console.log(`🎉 ALL ${total} TESTS PASSED`);
    } else {
        console.log(`⚠️  ${passed}/${total} passed, ${failed} FAILED`);
    }
    console.log('='.repeat(60));

    process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => {
    console.error('Fatal:', err);
    process.exit(1);
});
