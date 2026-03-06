/**
 * V-Face Persistent Signing Keys
 * 
 * ECDSA P-256 key pair for JWT signing (ES256).
 * On first boot: generates key pair → writes PEM to disk.
 * On subsequent boots: loads from disk.
 * 
 * This fixes the critical bug where server restarts invalidated all JWTs.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const DEFAULT_KEY_PATH = path.join(__dirname, 'data', 'signing.pem');
const KEY_PATH = process.env.SIGNING_KEY_PATH || DEFAULT_KEY_PATH;

/**
 * Load or generate ECDSA P-256 key pair.
 * @returns {{ privateKey: string, publicKey: string }}
 */
function loadOrGenerateKeys() {
    // Try loading existing keys
    if (fs.existsSync(KEY_PATH)) {
        try {
            const keyData = JSON.parse(fs.readFileSync(KEY_PATH, 'utf8'));
            if (keyData.privateKey && keyData.publicKey) {
                // Validate the key is usable
                const testSign = crypto.createSign('SHA256');
                testSign.update('test');
                testSign.sign(keyData.privateKey);

                console.log('✅ Loaded persistent signing key from', KEY_PATH);
                return keyData;
            }
        } catch (err) {
            console.warn('⚠️  Existing signing key is corrupted, generating new one:', err.message);
        }
    }

    // Generate new key pair
    const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', {
        namedCurve: 'prime256v1',
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });

    // Ensure directory exists
    const keyDir = path.dirname(KEY_PATH);
    if (!fs.existsSync(keyDir)) {
        fs.mkdirSync(keyDir, { recursive: true });
    }

    // Write atomically: write to temp file then rename
    const tempPath = KEY_PATH + '.tmp';
    fs.writeFileSync(tempPath, JSON.stringify({ privateKey, publicKey }, null, 2), {
        mode: 0o600 // Owner read/write only
    });
    fs.renameSync(tempPath, KEY_PATH);

    console.log('🔑 Generated new persistent signing key at', KEY_PATH);
    return { privateKey, publicKey };
}

// Load once on require — singleton pattern
const keys = loadOrGenerateKeys();

module.exports = keys;
