# 📋 V-Face — Current Project Status

> **Last Updated**: February 17, 2026

---

## 🏷️ Overview

**V-Face** is a privacy-preserving biometric identity protocol for AI agents & Web3. Client-side face processing (MobileFaceNet ONNX) + server-signed hash chain + Qdrant vector search — zero gas, zero wallets, 10M+ scale.

| Field | Value |
|-------|-------|
| **Version** | `4.0.0` (API), `1.0.0` (Matching Service) |
| **License** | GPL-3.0 |
| **Stage** | ✅ **Alpha — Integration Verified** |
| **Architecture** | Microservices: Node.js API → Python Matching → Qdrant |
| **Blockchain** | Deprecated (contract kept for reference) |

---

## ✅ What's Built & Verified

### Microservices Stack (`docker-compose.yml`)
- **API Service** (Node.js :3000) — auth, routing, consent, hash chain
- **Matching Service** (Python/FastAPI :8001) — embedding decryption, Qdrant CRUD, Sybil check
- **Qdrant** (:6333) — 128-d HNSW vector index, <5ms search

### Integration Test Results (16/16 ✅)
```
✅ API Health       — v4.0.0, matching: ok
✅ Register         — vector stored in Qdrant
✅ Search (same)    — score: 1.0, 4.7ms
✅ Search (diff)    — no match, 3.8ms
✅ Chain Verify     — valid, 1 entry checked
✅ Identity Check   — exists, not revoked
```

### Hash Chain (`server/hashchain.js`)
- Append-only with ECDSA P-256 server signatures
- 4 public endpoints: `/chain/root`, `/chain/proof/:index`, `/chain/snapshot`, `/chain/verify`

### SDK (`@v-face/sdk` v0.1.0-alpha)
- MobileFaceNet ONNX (128-d, validated: same-person ≥0.96, cross-person ≤0.19)
- Fingerprint derivation, optional per-service salt

### Security
- AES-256-GCM encryption with key versioning
- Strict CORS, rate limiting, JWT ES256, nonce replay protection
- Internal network isolation (matching + Qdrant never public)
- 25/25 Hardhat contract tests passing

---

## ⚠️ Known Issues

| Issue | Severity | Fix |
|-------|----------|-----|
| Server signing key regenerated on restart | 🟡 Medium | Persist via env var or mounted file |
| SDK not published to npm | 🟡 Medium | `npm publish` when ready |
| No CI/CD pipeline | 🟡 Medium | GitHub Actions workflow |

---

## 🚀 Quick Start

```bash
# Run full stack + integration test
./scripts/run_test.sh
```

---

## 📌 Next Steps

1. Deploy to cloud (see `docs/deployment.md`)
2. Persist server signing key (env var or file)
3. Set up CI/CD (GitHub Actions)
4. Publish SDK to npm
