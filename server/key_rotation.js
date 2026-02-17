#!/usr/bin/env node
/**
 * V-Face Key Rotation Script
 * 
 * Re-encrypts all stored embeddings with the current encryption key.
 * 
 * Usage:
 *   VFACE_ENCRYPTION_KEY=<new_key_hex> \
 *   VFACE_ENCRYPTION_KEY_V1=<old_key_hex> \
 *   node server/key_rotation.js
 * 
 * This script:
 *   1. Reads all rows with encrypted embeddings
 *   2. Decrypts each with its original key (detected from version prefix)
 *   3. Re-encrypts with the current key
 *   4. Updates the row in-place
 *   5. Re-computes commitment = SHA256(new_encrypted || nonce) if nonce exists
 *   6. Reports progress and any errors
 * 
 * Safety:
 *   - Wraps all updates in a transaction (all-or-nothing)
 *   - Dry-run mode available: KEY_ROTATION_DRY_RUN=1
 */

const sqlite3 = require('sqlite3').verbose();
const crypto = require('crypto');
const path = require('path');
const { reEncryptWithCurrentKey, CURRENT_KEY_VERSION } = require('./encryption');

const dbPath = process.env.DATABASE_PATH || path.resolve(__dirname, 'data', 'registry.db');
const dryRun = process.env.KEY_ROTATION_DRY_RUN === '1';

console.log('='.repeat(60));
console.log('V-Face Key Rotation');
console.log('='.repeat(60));
console.log(`Database: ${dbPath}`);
console.log(`Target key version: v${CURRENT_KEY_VERSION}`);
console.log(`Dry run: ${dryRun ? 'YES (no changes will be made)' : 'NO (changes will be applied)'}`);
console.log();

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Could not connect to database:', err.message);
        process.exit(1);
    }
});

function run() {
    return new Promise((resolve, reject) => {
        db.all(
            'SELECT fingerprint, embedding, commitment_nonce FROM fingerprints WHERE embedding IS NOT NULL',
            [],
            (err, rows) => {
                if (err) return reject(err);

                console.log(`Found ${rows.length} rows with embeddings`);
                if (rows.length === 0) {
                    console.log('Nothing to rotate.');
                    return resolve();
                }

                let rotated = 0;
                let skipped = 0;
                let errors = 0;

                const updates = [];

                for (const row of rows) {
                    try {
                        const { newPayload, oldVersion, newVersion } = reEncryptWithCurrentKey(row.embedding);

                        if (oldVersion === newVersion) {
                            skipped++;
                            continue;
                        }

                        // Re-compute commitment if nonce exists
                        let newCommitment = null;
                        if (row.commitment_nonce) {
                            newCommitment = crypto.createHash('sha256')
                                .update(newPayload + row.commitment_nonce)
                                .digest('hex');
                        }

                        updates.push({
                            fingerprint: row.fingerprint,
                            newPayload,
                            newCommitment,
                            oldVersion,
                            newVersion
                        });

                        rotated++;
                    } catch (e) {
                        console.error(`  ❌ Error rotating ${row.fingerprint}: ${e.message}`);
                        errors++;
                    }
                }

                console.log();
                console.log(`  Rotated: ${rotated}`);
                console.log(`  Skipped (already current): ${skipped}`);
                console.log(`  Errors: ${errors}`);

                if (errors > 0) {
                    console.error('\n❌ Aborting due to errors. Fix the issues and re-run.');
                    return reject(new Error('Rotation errors encountered'));
                }

                if (dryRun) {
                    console.log('\n🔍 Dry run complete. No changes were made.');
                    return resolve();
                }

                if (updates.length === 0) {
                    console.log('\n✅ All embeddings already at current key version.');
                    return resolve();
                }

                // Apply updates in a transaction
                console.log(`\n🔄 Applying ${updates.length} updates...`);

                db.serialize(() => {
                    db.run('BEGIN TRANSACTION');

                    for (const u of updates) {
                        if (u.newCommitment) {
                            db.run(
                                'UPDATE fingerprints SET embedding = ?, commitment = ? WHERE fingerprint = ?',
                                [u.newPayload, u.newCommitment, u.fingerprint]
                            );
                        } else {
                            db.run(
                                'UPDATE fingerprints SET embedding = ? WHERE fingerprint = ?',
                                [u.newPayload, u.fingerprint]
                            );
                        }
                    }

                    db.run('COMMIT', (err) => {
                        if (err) {
                            console.error('❌ Transaction failed:', err.message);
                            db.run('ROLLBACK');
                            return reject(err);
                        }
                        console.log(`\n✅ Key rotation complete. ${updates.length} embeddings re-encrypted.`);
                        resolve();
                    });
                });
            }
        );
    });
}

run()
    .catch((err) => {
        console.error('Fatal error:', err.message);
        process.exit(1);
    })
    .finally(() => {
        db.close();
    });
