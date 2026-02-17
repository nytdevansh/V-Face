const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = process.env.DATABASE_PATH || path.resolve(__dirname, 'data', 'registry.db');

// Ensure the directory exists before opening the DB
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Could not connect to database', err);
    } else {
        console.log('Connected to Registry database at', dbPath);
    }
});

// Initialize Schema
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS fingerprints (
        fingerprint TEXT PRIMARY KEY,
        public_key TEXT NOT NULL,
        embedding TEXT, -- AES-256-GCM encrypted embedding vector
        commitment TEXT, -- SHA256(encrypted_embedding || nonce) for on-chain anchoring
        commitment_nonce TEXT, -- Random nonce used in commitment derivation
        key_version INTEGER DEFAULT 1, -- Encryption key version used
        created_at INTEGER NOT NULL,
        revoked INTEGER DEFAULT 0,
        revoked_at INTEGER,
        metadata TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS active_consents (
        consent_id TEXT PRIMARY KEY,
        fingerprint TEXT NOT NULL,
        company_id TEXT NOT NULL,
        scope TEXT NOT NULL,
        expires_at INTEGER NOT NULL,
        issued_at INTEGER NOT NULL,
        FOREIGN KEY(fingerprint) REFERENCES fingerprints(fingerprint)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS nonces (
        nonce TEXT PRIMARY KEY,
        expires_at INTEGER NOT NULL
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS pending_consents (
        request_id TEXT PRIMARY KEY,
        fingerprint TEXT NOT NULL,
        company_id TEXT NOT NULL,
        scope TEXT NOT NULL,
        duration INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        status TEXT DEFAULT 'pending',
        FOREIGN KEY(fingerprint) REFERENCES fingerprints(fingerprint)
    )`);
});

module.exports = db;
