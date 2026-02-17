/**
 * V-Face Embedding Encryption (v2)
 * AES-256-GCM encryption with key versioning for embedding vectors at rest.
 * 
 * Encrypted payload format: v{version}:{iv_hex}:{authTag_hex}:{ciphertext_hex}
 * Legacy format (v1):      {iv_hex}:{authTag_hex}:{ciphertext_hex}
 */
const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const CURRENT_KEY_VERSION = 1;

// ============================================================================
// Key Management
// ============================================================================

/**
 * Key registry: maps version numbers to 32-byte keys.
 * In production, these should come from a secure key store (e.g., AWS KMS, Vault).
 * 
 * To rotate keys:
 *   1. Set VFACE_ENCRYPTION_KEY to the new key
 *   2. Set VFACE_ENCRYPTION_KEY_V1 to the old key  
 *   3. Run: node server/key_rotation.js
 */
const keyCache = {};

function getKey(version) {
    if (keyCache[version]) return keyCache[version];

    // Check for versioned key env var first
    const versionedKeyHex = process.env[`VFACE_ENCRYPTION_KEY_V${version}`];
    if (versionedKeyHex) {
        keyCache[version] = Buffer.from(versionedKeyHex, 'hex');
        return keyCache[version];
    }

    // Fall back to main key for current version
    if (version === CURRENT_KEY_VERSION) {
        const keyHex = process.env.VFACE_ENCRYPTION_KEY;
        if (keyHex) {
            keyCache[version] = Buffer.from(keyHex, 'hex');
        } else {
            console.warn('⚠️  VFACE_ENCRYPTION_KEY not set — using derived key. Set this in production!');
            keyCache[version] = crypto.scryptSync('vface-dev-key', 'vface-salt', 32);
        }
        return keyCache[version];
    }

    throw new Error(`No key available for version ${version}`);
}

/**
 * Get the current encryption key.
 * @returns {Buffer} 32-byte key
 */
function getCurrentKey() {
    return getKey(CURRENT_KEY_VERSION);
}

// ============================================================================
// Encrypt / Decrypt
// ============================================================================

/**
 * Encrypt an embedding string with AES-256-GCM.
 * @param {string} plaintext - JSON string of embedding vector
 * @returns {string} Encrypted payload: v{version}:{iv}:{authTag}:{ciphertext}
 */
function encryptEmbedding(plaintext) {
    const key = getCurrentKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');

    // Versioned format: v{version}:{iv}:{authTag}:{ciphertext}
    return `v${CURRENT_KEY_VERSION}:${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypt an embedding string encrypted with AES-256-GCM.
 * Supports both versioned (v{n}:iv:tag:ct) and legacy (iv:tag:ct) formats.
 * @param {string} encryptedPayload
 * @returns {string} Decrypted plaintext (JSON string of embedding)
 */
function decryptEmbedding(encryptedPayload) {
    if (!encryptedPayload || !encryptedPayload.includes(':')) {
        return encryptedPayload;
    }

    let version, ivHex, authTagHex, ciphertext;
    const parts = encryptedPayload.split(':');

    if (parts[0].startsWith('v') && parts.length === 4) {
        // Versioned format: v{n}:{iv}:{authTag}:{ciphertext}
        version = parseInt(parts[0].slice(1), 10);
        [, ivHex, authTagHex, ciphertext] = parts;
    } else if (parts.length === 3) {
        // Legacy format: {iv}:{authTag}:{ciphertext} — treat as v1
        version = 1;
        [ivHex, authTagHex, ciphertext] = parts;
    } else {
        return encryptedPayload; // Unknown format, return as-is
    }

    const key = getKey(version);
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
}

/**
 * Re-encrypt a payload with the current key version.
 * Used for key rotation.
 * @param {string} encryptedPayload - Existing encrypted payload
 * @returns {{ newPayload: string, oldVersion: number, newVersion: number }}
 */
function reEncryptWithCurrentKey(encryptedPayload) {
    const plaintext = decryptEmbedding(encryptedPayload);
    const newPayload = encryptEmbedding(plaintext);

    // Extract old version
    const parts = encryptedPayload.split(':');
    const oldVersion = parts[0].startsWith('v') ? parseInt(parts[0].slice(1), 10) : 1;

    return {
        newPayload,
        oldVersion,
        newVersion: CURRENT_KEY_VERSION
    };
}

module.exports = {
    encryptEmbedding,
    decryptEmbedding,
    reEncryptWithCurrentKey,
    CURRENT_KEY_VERSION
};
