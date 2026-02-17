# V-Face Threat Model (v3.0 — Signed Log)

## Data Exposure Summary

| Data | Location | Protection |
|------|----------|------------|
| Raw face images | Device only | Never transmitted |
| Face embeddings | Server (encrypted) | AES-256-GCM, key rotation |
| Biometric fingerprint | Server (hashed) | SHA-256, irreversible |
| Commitment | Server + hash chain | SHA256(ciphertext ∥ nonce) |
| Hash chain entries | Server DB | ECDSA-signed, append-only |

## Fingerprint Linkability

| Mode | Sybil Resistance | Cross-Service Privacy |
|------|-------------------|----------------------|
| **Global** (no salt) | ✅ Strong | ❌ Linkable across services |
| **Per-service** (with salt) | ⚠️ Within-service | ✅ Unlinkable |

**Default: Global.** Opt-in per-service via `generateFingerprint(embedding, salt)`.

## Attack Vectors

### 1. Server Compromise
**Risk**: Attacker reads encrypted embeddings  
**Mitigation**: AES-256-GCM, key versioning, rotation via `key_rotation.js`

### 2. Hash Chain Tampering
**Risk**: Server operator modifies historical entries  
**Detection**: Chain breaks — any entry modification changes all downstream hashes  
**Mitigation**: Periodic public snapshot of root hash (website, GitHub, Twitter)

### 3. Server Key Compromise
**Risk**: Attacker can forge new entries  
**Mitigation**: Key rotation, signed snapshots pinned to public records  
**Future**: Multi-server witnesses, HSM-backed signing keys

### 4. Sybil Attack
**Risk**: Same person registers multiple identities  
**Mitigation**: Cosine similarity check (threshold 0.92) before registration

### 5. Model Substitution
**Risk**: Attacker replaces ONNX model for predictable embeddings  
**Mitigation**: SHA-256 hash check, model size assertion (≥1MB), output dimension check

### 6. Replay Attack
**Risk**: Replaying old registration requests  
**Mitigation**: Nonce-based replay protection, timestamp bounds (±300s)

## Trust Model Comparison

| Property | Blockchain (v2) | Signed Log (v3) |
|----------|----------------|-----------------|
| Gas cost | Required | None |
| User wallet | Required | Not required |
| Tamper-evident | ✅ (consensus) | ✅ (hash chain + signatures) |
| Trustless | ✅ | ❌ (server-signed) |
| Public audit | ✅ (explorer) | ✅ (`/chain/snapshot`) |
| Cost per registration | ~112k gas | Zero |
| User friction | Wallet + gas | None |

For V-Face's use case (biometric identity for AI services), the signed log model provides **equivalent integrity guarantees** with zero user friction.
