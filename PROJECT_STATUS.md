# 📋 V-Face — Current Project Status

> **Last Updated**: February 17, 2026

---

## 🏷️ Overview

**V-Face** is a privacy-preserving biometric identity protocol for AI agents & Web3. It lets users verify physical identity without exposing raw biometric data, combining client-side face processing (MobileFaceNet ONNX) with JWT consent tokens and an on-chain registry on Polygon.

| Field | Value |
|-------|-------|
| **Version** | `1.0.0` (root), SDK `0.1.0-alpha` |
| **License** | GPL-3.0 |
| **Stage** | ⚠️ **Alpha** — smart contract NOT formally audited |
| **Blockchain** | Polygon (Mumbai testnet / Mainnet) |

---

## ✅ What's Built (Phase 1 — Complete)

### Smart Contract (`contracts/VFaceRegistry.sol`)
- ~250 lines of Solidity (0.8.19)
- Registration, consent granting, revocation, Sybil resistance
- Gas-optimized with custom errors
- Deployment scripts ready (`scripts/deploy.js`) for Mumbai & Mainnet

### SDK (`sdk/` — `@v-face/sdk` v0.1.0-alpha)
- Client-side face embedding via MobileFaceNet (ONNX)
- Fingerprint derivation: L2-normalize → quantize → SHA-256 → 64-char hex
- Cosine similarity matching (threshold 0.85)
- Registry API client, consent token utilities
- CLI demo (`demo_cli.js`), unit tests & robustness tests
- Dependencies: `onnxruntime-web`, `face-api.js`, `ethers`

### Registry Server (`server/`)
- Express.js REST API (v2.0.0) on port 3000
- SQLite-backed (`registry.db` exists with data)
- Endpoints: `/register`, `/check`, `/revoke`, `/consent/request`, `/consent/approve`, `/verify`, `/search`
- Security: rate limiting, input validation (`express-validator`), JWT (ES256), ethers.js signature verification, embedding encryption at rest, nonce-based replay protection
- Render.com deployment config ready (`render.yaml` — free tier, Oregon)

### Dashboard (`dashboard/`)
- React 19 + Vite 7 + Tailwind CSS 4
- Integrates `@v-face/sdk` (local file link), `ethers`, `face-api.js`, `framer-motion`, `react-webcam`
- Vercel deployment config present (`vercel.json`, `.env.production`)
- Production build exists (`dist/`)

### Playground (`playground/`)
- Separate React + Vite demo/testing app
- Tailwind CSS, Vercel-ready
- Production build exists (`dist/`)

### Documentation (`docs/`)
- `architecture.md` — System architecture & trust boundaries
- `fingerprint_spec.md` — Fingerprint derivation algorithm
- `token_spec.md` — JWT consent token format & lifecycle
- `threat_model.md` — Security analysis & attack mitigations
- `integration-guide.md` — SDK integration guide
- `false-positive-analysis.md` — Similarity threshold analysis
- `robustness-report.md` — Adversarial input testing results
- `PROTOCOL.md`, `CONTRIBUTING.md`, `QUICKSTART.md`, `README.md`

### Tests
- Smart contract: 33 Hardhat tests (`test/VFaceRegistry.test.js`)
- SDK: unit tests + robustness tests (`sdk/test/`)

---

## 🔨 What's In Progress (Phase 2 — Hardening)

| Task | Status |
|------|--------|
| Deploy to Polygon Mumbai testnet | ❌ Not done |
| Community security review | ❌ Not started |
| Fingerprint robustness (LSH fuzzy matching) | ❌ Not started |
| Encrypt stored embeddings at rest | ✅ Implemented (`server/encryption.js`) |
| End-to-end integration testing | ❌ Not started |
| Bug bounty program | ❌ Not started |

---

## ❌ Not Yet Started

### Phase 3 — Launch
- Formal security audit
- Polygon mainnet deployment
- Publish `@v-face/sdk` to npm
- Public registration app
- AI service partnerships

### Phase 4 — Growth
- Multi-chain support (Ethereum, Arbitrum)
- Mobile SDKs (iOS, Android)
- Browser extension
- DAO governance
- Academic partnerships

---

## ⚠️ Known Issues & Gaps

| Issue | Severity | Notes |
|-------|----------|-------|
| `.env` has empty `PRIVATE_KEY` | 🟡 Medium | Cannot deploy contracts without wallet key |
| `mobilefacenet.onnx` is 14 bytes | 🔴 Critical | Model file is a placeholder/stub — real model (~4–5 MB) not present |
| Server has no automated tests | 🟡 Medium | `server/package.json` test script is a no-op |
| CORS is permissive | 🟡 Medium | Server allows all origins — needs tightening for production |
| Duplicate health-check route | 🟢 Low | `GET /` is defined twice in `server/index.js` |
| No CI/CD pipeline | 🟡 Medium | No GitHub Actions or similar configured |
| SDK not published to npm | 🟡 Medium | Dashboard links SDK via local `file:../sdk` |

---

## 📊 Codebase Stats

| Component | Language | Key Files |
|-----------|----------|-----------|
| Smart Contract | Solidity | `contracts/VFaceRegistry.sol` |
| Server | Node.js / Express | `server/index.js` (454 lines), `server/db.js`, `server/encryption.js` |
| SDK | JavaScript (ESM) | `sdk/index.js`, `sdk/src/`, `sdk/embedding/`, `sdk/fingerprint/` |
| Dashboard | React + Vite + Tailwind | `dashboard/src/` (13 items) |
| Playground | React + Vite + Tailwind | `playground/src/` (11 items) |
| Deployment | Hardhat + Render + Vercel | `hardhat.config.js`, `render.yaml`, `vercel.json` |
| Docs | Markdown | 7 spec files + 4 root-level docs |

---

## 🚦 Deployment Status

| Target | Status | Config |
|--------|--------|--------|
| Server → Render.com | 🟡 Configured, not verified live | `render.yaml` |
| Dashboard → Vercel | 🟡 Configured, not verified live | `dashboard/vercel.json` |
| Playground → Vercel | 🟡 Configured, not verified live | `playground/vercel.json` |
| Contract → Mumbai | ❌ Not deployed | `npm run deploy:testnet` |
| Contract → Polygon | ❌ Not deployed | `npm run deploy:mainnet` |

---

## 📌 Immediate Next Steps

1. **Replace the placeholder ONNX model** with the real MobileFaceNet weights (~4–5 MB)
2. **Set up `.env`** with a valid wallet private key for testnet deployment
3. **Deploy contract to Mumbai testnet** and verify on PolygonScan
4. **Add server tests** (currently no test suite)
5. **Set up CI/CD** (GitHub Actions for lint, test, deploy)
6. **Tighten CORS** before any production deployment
