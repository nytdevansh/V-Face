/**
 * V-Face Embedding Encryption
 * AES-256-GCM encryption for embedding vectors at rest.
 */
const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * Get or generate encryption key from environment.
 * @returns {Buffer} 32-byte encryption key
 */
let _cachedKey = null;
function getEncryptionKey() {
    if (_cachedKey) return _cachedKey;

    const keyHex = process.env.VFACE_ENCRYPTION_KEY;
    if (!keyHex) {
        console.warn('⚠️  VFACE_ENCRYPTION_KEY not set — using derived key. Set this in production!');
        _cachedKey = crypto.scryptSync('vface-dev-key', 'vface-salt', 32);
    } else {
        _cachedKey = Buffer.from(keyHex, 'hex');
    }
    return _cachedKey;
}

/**
 * Encrypt an embedding string with AES-256-GCM.
 * @param {string} plaintext - JSON string of embedding vector
 * @returns {string} Encrypted payload as hex (iv:authTag:ciphertext)
 */
function encryptEmbedding(plaintext) {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');

    // Format: iv:authTag:ciphertext
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypt an embedding string encrypted with AES-256-GCM.
 * @param {string} encryptedPayload - Encrypted payload (iv:authTag:ciphertext)
 * @returns {string} Decrypted plaintext (JSON string of embedding)
 */
function decryptEmbedding(encryptedPayload) {
    if (!encryptedPayload || !encryptedPayload.includes(':')) {
        // Not encrypted (legacy data or null) — return as-is
        return encryptedPayload;
    }

    const key = getEncryptionKey();
    const parts = encryptedPayload.split(':');
    if (parts.length !== 3) {
        // Not in expected format, return as-is
        return encryptedPayload;
    }

    const [ivHex, authTagHex, ciphertext] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
}

module.exports = { encryptEmbedding, decryptEmbedding };
