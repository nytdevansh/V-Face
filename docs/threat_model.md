# V-Face Threat Model & Linkability Analysis

## On-Chain Privacy

### What's stored on-chain
| Data | On-Chain? | Notes |
|------|-----------|-------|
| Raw face images | ❌ Never | Processed client-side only |
| Face embeddings | ❌ Never | Encrypted at rest on server |
| Biometric fingerprint | ❌ Never | Stays off-chain since v2.0 |
| **Commitment** | ✅ Opaque | `SHA256(encrypted_blob ∥ nonce)` |
| Owner address | ✅ | Wallet that anchored the commitment |

### Commitment Unlinkability
Each registration produces a unique commitment because:
```
commitment = SHA256(AES-256-GCM(embedding) || random_nonce_32_bytes)
```
- Same face → different encrypted blobs (AES-GCM uses random IV)
- Different random nonce per registration
- **Result**: Two commitments from the same face are computationally indistinguishable

## Fingerprint Linkability

### The Tradeoff

| Mode | Sybil Resistance | Cross-Service Privacy |
|------|-------------------|----------------------|
| **Global** (no salt) | ✅ Strong — same face = same fingerprint everywhere | ❌ Services can collude to track users |
| **Per-service** (with salt) | ⚠️ Within-service only | ✅ Different fingerprint per service |

### Current Default: Global
V-Face currently uses **globally stable** fingerprints (no salt). This is acceptable because:
1. The commitment scheme already provides on-chain unlinkability
2. Off-chain fingerprints are only shared with the registry server, not between services
3. Sybil resistance is the primary use case

### Opt-In Per-Service Mode
```javascript
// Global (default) — same hash everywhere
const fp = await generateFingerprint(embedding);

// Per-service — different hash per service
const fp = await generateFingerprint(embedding, "service-abc-salt");
```

## Attack Vectors

### 1. Server Compromise
**Risk**: Attacker accesses encrypted embeddings  
**Mitigation**: AES-256-GCM encryption at rest, key rotation via `key_rotation.js`

### 2. Re-identification via Embedding
**Risk**: Attacker with the encryption key can decrypt and compare embeddings  
**Mitigation**: Key rotation, future envelope encryption with HSM/KMS

### 3. Sybil Attack (Multiple Identities)
**Risk**: Same person registers multiple times  
**Mitigation**: Cosine similarity check (threshold 0.92) before registration

### 4. On-Chain Correlation
**Risk**: Observer links multiple commitments to the same identity  
**Mitigation**: Commitments are opaque and randomized; no on-chain linkability

### 5. Model Substitution
**Risk**: Attacker replaces ONNX model to produce predictable embeddings  
**Mitigation**: Model size check (≥1MB), SHA-256 hash verification, runtime dimension assertion
