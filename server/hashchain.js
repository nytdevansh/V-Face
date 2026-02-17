/**
 * V-Face Hash Chain Engine (v3.0)
 * 
 * Append-only, server-signed hash chain for tamper-evident identity anchoring.
 * Replaces blockchain anchoring — zero gas, zero wallets, same integrity.
 * 
 * Data structure per entry:
 *   { index, commitment, fingerprint, timestamp, prevHash, entryHash, signature }
 * 
 * Hash chain invariant:
 *   entryHash[i] = SHA256(index || commitment || fingerprint || timestamp || prevHash)
 *   prevHash[i]  = entryHash[i-1]
 *   prevHash[0]  = SHA256("vface-genesis-v3")
 * 
 * Tampering with any entry breaks the chain from that point forward.
 */

const crypto = require('crypto');

const GENESIS_SEED = 'vface-genesis-v3';

class HashChain {
    /**
     * @param {object} db - SQLite database instance
     * @param {object} keys - { privateKey: PEM, publicKey: PEM } for ECDSA P-256
     */
    constructor(db, keys) {
        this.db = db;
        this.privateKey = keys.privateKey;
        this.publicKey = keys.publicKey;
        this._genesisHash = crypto.createHash('sha256').update(GENESIS_SEED).digest('hex');
    }

    // =========================================================================
    // Core Operations
    // =========================================================================

    /**
     * Append a new entry to the hash chain.
     * @param {string} commitment - SHA256(encrypted_embedding || nonce)
     * @param {string} fingerprint - User's fingerprint hash
     * @returns {Promise<{ index: number, entryHash: string, signature: string, timestamp: number }>}
     */
    appendEntry(commitment, fingerprint) {
        return new Promise((resolve, reject) => {
            // Get the latest entry to chain from
            this._getLatestEntry().then(latest => {
                const prevHash = latest ? latest.entry_hash : this._genesisHash;
                const timestamp = Date.now();

                // Compute entry hash
                const entryHash = this._computeEntryHash({
                    index: (latest ? latest.idx + 1 : 1),
                    commitment,
                    fingerprint,
                    timestamp,
                    prevHash,
                });

                // Sign the entry hash
                const signature = this._sign(entryHash);

                // Insert into chain
                const stmt = this.db.prepare(
                    'INSERT INTO hash_chain (commitment, fingerprint, timestamp, prev_hash, entry_hash, signature) VALUES (?, ?, ?, ?, ?, ?)'
                );
                stmt.run(commitment, fingerprint, timestamp, prevHash, entryHash, signature, function (err) {
                    if (err) return reject(err);
                    resolve({
                        index: this.lastID,
                        entryHash,
                        signature,
                        timestamp,
                    });
                });
                stmt.finalize();
            }).catch(reject);
        });
    }

    /**
     * Get a single entry with its chain proof.
     * @param {number} index - Chain index
     * @returns {Promise<object|null>}
     */
    getEntry(index) {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT idx, commitment, fingerprint, timestamp, prev_hash, entry_hash, signature FROM hash_chain WHERE idx = ?',
                [index],
                (err, row) => {
                    if (err) return reject(err);
                    if (!row) return resolve(null);
                    resolve(this._formatEntry(row));
                }
            );
        });
    }

    /**
     * Get the current chain root (latest entry hash).
     * @returns {Promise<{ root: string, index: number, timestamp: number, totalEntries: number }>}
     */
    getRoot() {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT idx, entry_hash, timestamp FROM hash_chain ORDER BY idx DESC LIMIT 1',
                [],
                (err, row) => {
                    if (err) return reject(err);

                    this.db.get('SELECT COUNT(*) as count FROM hash_chain', [], (err2, countRow) => {
                        if (err2) return reject(err2);
                        resolve({
                            root: row ? row.entry_hash : this._genesisHash,
                            index: row ? row.idx : 0,
                            timestamp: row ? row.timestamp : null,
                            totalEntries: countRow.count,
                            genesis: this._genesisHash,
                        });
                    });
                }
            );
        });
    }

    /**
     * Verify chain integrity between two indices.
     * @param {number} [fromIndex=1] - Start index
     * @param {number} [toIndex] - End index (defaults to latest)
     * @returns {Promise<{ valid: boolean, checked: number, error?: string, brokenAt?: number }>}
     */
    verifyChain(fromIndex = 1, toIndex) {
        return new Promise((resolve, reject) => {
            const query = toIndex
                ? 'SELECT idx, commitment, fingerprint, timestamp, prev_hash, entry_hash, signature FROM hash_chain WHERE idx >= ? AND idx <= ? ORDER BY idx ASC'
                : 'SELECT idx, commitment, fingerprint, timestamp, prev_hash, entry_hash, signature FROM hash_chain WHERE idx >= ? ORDER BY idx ASC';
            const params = toIndex ? [fromIndex, toIndex] : [fromIndex];

            this.db.all(query, params, (err, rows) => {
                if (err) return reject(err);
                if (rows.length === 0) return resolve({ valid: true, checked: 0 });

                for (let i = 0; i < rows.length; i++) {
                    const row = rows[i];

                    // 1. Verify entry hash is correct
                    const expectedHash = this._computeEntryHash({
                        index: row.idx,
                        commitment: row.commitment,
                        fingerprint: row.fingerprint,
                        timestamp: row.timestamp,
                        prevHash: row.prev_hash,
                    });

                    if (expectedHash !== row.entry_hash) {
                        return resolve({
                            valid: false,
                            checked: i + 1,
                            error: 'Entry hash mismatch (data tampered)',
                            brokenAt: row.idx,
                        });
                    }

                    // 2. Verify signature
                    if (!this._verify(row.entry_hash, row.signature)) {
                        return resolve({
                            valid: false,
                            checked: i + 1,
                            error: 'Signature verification failed',
                            brokenAt: row.idx,
                        });
                    }

                    // 3. Verify chain linkage (prevHash matches previous entry)
                    if (i > 0 && row.prev_hash !== rows[i - 1].entry_hash) {
                        return resolve({
                            valid: false,
                            checked: i + 1,
                            error: 'Chain linkage broken (prev_hash mismatch)',
                            brokenAt: row.idx,
                        });
                    }

                    // 4. First entry should link to genesis or previous entry
                    if (i === 0 && fromIndex === 1 && row.prev_hash !== this._genesisHash) {
                        return resolve({
                            valid: false,
                            checked: 1,
                            error: 'Genesis link broken',
                            brokenAt: row.idx,
                        });
                    }
                }

                resolve({ valid: true, checked: rows.length });
            });
        });
    }

    /**
     * Export the full chain for public audit / snapshot.
     * @returns {Promise<{ genesis: string, entries: object[], root: string, exportedAt: string }>}
     */
    exportSnapshot() {
        return new Promise((resolve, reject) => {
            this.db.all(
                'SELECT idx, commitment, fingerprint, timestamp, prev_hash, entry_hash, signature FROM hash_chain ORDER BY idx ASC',
                [],
                (err, rows) => {
                    if (err) return reject(err);
                    const entries = rows.map(r => this._formatEntry(r));
                    resolve({
                        genesis: this._genesisHash,
                        entries,
                        root: rows.length > 0 ? rows[rows.length - 1].entry_hash : this._genesisHash,
                        totalEntries: rows.length,
                        exportedAt: new Date().toISOString(),
                        publicKey: this.publicKey,
                    });
                }
            );
        });
    }

    /**
     * Find a chain entry by fingerprint.
     * @param {string} fingerprint
     * @returns {Promise<object|null>}
     */
    findByFingerprint(fingerprint) {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT idx, commitment, fingerprint, timestamp, prev_hash, entry_hash, signature FROM hash_chain WHERE fingerprint = ? ORDER BY idx DESC LIMIT 1',
                [fingerprint],
                (err, row) => {
                    if (err) return reject(err);
                    if (!row) return resolve(null);
                    resolve(this._formatEntry(row));
                }
            );
        });
    }

    // =========================================================================
    // Internal Helpers
    // =========================================================================

    _computeEntryHash({ index, commitment, fingerprint, timestamp, prevHash }) {
        return crypto.createHash('sha256')
            .update(`${index}|${commitment}|${fingerprint}|${timestamp}|${prevHash}`)
            .digest('hex');
    }

    _sign(data) {
        const sign = crypto.createSign('SHA256');
        sign.update(data);
        return sign.sign(this.privateKey, 'hex');
    }

    _verify(data, signature) {
        try {
            const verify = crypto.createVerify('SHA256');
            verify.update(data);
            return verify.verify(this.publicKey, signature, 'hex');
        } catch {
            return false;
        }
    }

    _getLatestEntry() {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT idx, entry_hash FROM hash_chain ORDER BY idx DESC LIMIT 1',
                [],
                (err, row) => {
                    if (err) return reject(err);
                    resolve(row || null);
                }
            );
        });
    }

    _formatEntry(row) {
        return {
            index: row.idx,
            commitment: row.commitment,
            fingerprint: row.fingerprint,
            timestamp: row.timestamp,
            prevHash: row.prev_hash,
            entryHash: row.entry_hash,
            signature: row.signature,
        };
    }
}

module.exports = HashChain;
