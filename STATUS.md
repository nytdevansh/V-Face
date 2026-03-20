# 📊 V-Face — Project Status

> **Last updated:** 2026-03-20  
> **Overall phase:** Phase 2 — Hardening (complete) ✅

---

## ✅ Completed Milestones

### Phase 1: Foundation
| Item | Status | Notes |
|------|--------|-------|
| Protocol specification (`PROTOCOL.md`) | ✅ Done | Full spec published |
| Smart contract — `VFaceRegistry.sol` | ✅ Done | Registration, consent, revocation |
| Smart contract — `FaceVerifier.sol` | ✅ Done | On-chain fingerprint verification |
| Contract test suite | ✅ Done | `test/VFaceRegistry.test.js` |
| Deployment scripts | ✅ Done | `scripts/deploy.js` |
| JavaScript SDK (`@v-face/sdk`) | ✅ Done | `sdk/` — fingerprint, embedding, consent |
| Registry server (Express + SQLite) | ✅ Done | `server/index.js` ~23 KB |
| Dashboard (React + Vite) | ✅ Done | `dashboard/` deployed on Vercel |
| Playground demo app | ✅ Done | `playground/` |
| Documentation suite | ✅ Done | `docs/` — architecture, fingerprint spec, threat model, token spec, integration guide, robustness report |
| Consent token system (JWT) | ✅ Done | `server/consent/` |
| LLM Guard example | ✅ Done | `examples/llm_guard.js` |

---

## 🔨 Phase 2: Hardening — Current Sprint

### Matching Service (FastAPI + sqlite-vec)
| Item | Status | Notes |
|------|--------|-------|
| Isolated matching microservice | ✅ Done | `matching/main.py` — FastAPI v2.0.0 |
| sqlite-vec vector store | ✅ Done | `matching/sqlite_vec_store.py` — self-contained, no external DB |
| AES-256-GCM embedding encryption | ✅ Done | `matching/crypto_utils.py` |
| Enroll / Search / Delete endpoints | ✅ Done | Secret-authenticated internal API |
| Embedding drift refresh (`/refresh`) | ✅ Done | Blended 70/30 weighted average |
| Differential privacy noise (DP) | ✅ Done | Optional Gaussian noise on enroll |
| Sybil resistance (duplicate check) | ✅ Done | Cosine threshold at enroll time |
| Anomaly detection module | ✅ Done | `matching/anomaly.py` |
| Group / multi-face identity | ✅ Done | `matching/group_identity.py` — SQL-based |
| Dockerfile | ✅ Done | `matching/Dockerfile` — self-contained with persistent volume |

### Server Hardening
| Item | Status | Notes |
|------|--------|-------|
| Auth module | ✅ Done | `server/auth/` |
| Consent management | ✅ Done | `server/consent/` |
| Identity delegation | ✅ Done | `server/delegation/` |
| WebAuthn support | ✅ Done | `server/webauthn/` |
| Hash-chain audit log | ✅ Done | `server/hashchain.js` |
| Encryption at rest | ✅ Done | `server/encryption.js` |
| Key rotation | ✅ Done | `server/key_rotation.js` |
| IPFS storage integration | ✅ Done | `server/ipfs/` |
| Matching service client | ✅ Done | `server/matching_client.js` |
| Admin API | ✅ Done | `server/admin/` |
| Database abstraction | ✅ Done | `server/db.js` — SQLite wrapper, auto-schema |
| Signing keys utility | ✅ Done | `server/signing_keys.js` — persistent key management |
| Server Dockerfile | ✅ Done | `server/Dockerfile` — containerised for deploy |

### SDK Advanced Modules
| Item | Status | Notes |
|------|--------|-------|
| Liveness detection (anti-spoofing) | ✅ Done | `sdk/liveness/liveness.js` — FAS model via ONNX Runtime |
| Offline verification (IndexedDB) | ✅ Done | `sdk/offline/offlineVerify.js` — AES-256-GCM encrypted cache |
| ZK-SNARK proof helpers | ✅ Done | `sdk/zk/zkProof.js` — Groth16 via snarkjs |
| TypeScript declarations | ✅ Done | `sdk/index.d.ts`, `sdk/setup.d.ts` |
| SDK CHANGELOG | ✅ Done | `sdk/CHANGELOG.md` |
| WebAuthn React hook | ✅ Done | `sdk/useWebAuthn.js` |

### Zero-Knowledge Circuits
| Item | Status | Notes |
|------|--------|-------|
| `FaceProof.circom` circuit | ✅ Done | `circuits/FaceProof.circom` — Poseidon commitment + norm check |

### Browser Extension
| Item | Status | Notes |
|------|--------|-------|
| Manifest + content script | ✅ Done | `extension/manifest.json`, `extension/content.js` |
| Extension popup UI | ✅ Done | `extension/popup.html` |
| MetaMask detection & graceful fallback | ✅ Done | Fixed crash when MetaMask not installed |
| MetaMask mobile deep linking | ✅ Done | Seamless app launching on mobile |

### Dashboard (React + Vite)
| Item | Status | Notes |
|------|--------|-------|
| Admin Dashboard page | ✅ Done | `dashboard/src/pages/AdminDashboard.jsx` |
| Wallet context (MetaMask) | ✅ Done | `dashboard/src/context/WalletContext.jsx` |
| Face scanner component | ✅ Done | `dashboard/src/components/FaceScanner.jsx` |
| Verification modal | ✅ Done | `dashboard/src/components/VerificationModal.jsx` |
| Animated background | ✅ Done | `AnimatedBackground.jsx` — CSS-only GPU animations |
| Responsive navbar | ✅ Done | `dashboard/src/components/Navbar.jsx` |
| `useVFace` React hook | ✅ Done | `dashboard/src/hooks/useVFace.js` |
| Performance optimization | ✅ Done | Lazy loading, reduced polling, chunk splitting |
| Vercel deployment config | ✅ Done | `dashboard/vercel.json` |
| Production env config | ✅ Done | `dashboard/.env.production` |

### DevOps & Infrastructure
| Item | Status | Notes |
|------|--------|-------|
| Docker Compose (full stack) | ✅ Done | `docker-compose.yml` — API + matching (self-contained) |
| Render deployment blueprint | ✅ Done | `render.yaml` — server auto-deploy config |
| Deployment guide | ✅ Done | `docs/deployment.md` — Render, Railway, VPS, K8s options |
| CI/CD GitHub Actions | ✅ Done | `.github/workflows/` |
| Vercel build fixes (SDK + canvas) | ✅ Done | `tsup` config, `ignore-scripts` for canvas |
| Render SQLite path fix | ✅ Done | Relative DB path for free-tier deployment |
| False positive analysis | ✅ Done | `docs/false-positive-analysis.md` |
| Polygon Amoy testnet config | ✅ Done | `hardhat.config.js` — chainId 80002, etherscan verification |

---

## 🔲 Phase 2: Remaining Work

| Item | Priority | Notes |
|------|----------|-------|
| Deploy matching service to production (Render free tier) | 🔴 High | Config ready, self-contained with sqlite-vec |
| Deploy to Polygon Amoy testnet | 🔴 High | Config ready in hardhat.config.js |
| ZK trusted setup ceremony | 🟡 Medium | Generate proving/verification keys for `FaceProof.circom` |
| End-to-end integration testing | 🟡 Medium | Full pipeline (SDK → server → matching → chain) |
| Community security review | 🟡 Medium | Open for external contributors |
| Bug bounty program | 🟢 Low | Needs policy document |

---

## 🗓️ Phase 3 — Upcoming

| Item | Status |
|------|--------|
| Formal security audit | ⏳ Not started |
| Deploy to Polygon mainnet | ⏳ Not started |
| Publish `@v-face/sdk` to npm | ⏳ Not started |
| Launch public registration app | ⏳ Not started |
| Partner with AI services | ⏳ Not started |

---

## 🏗️ Service Architecture (Current)

```
Browser / App
    │
    ▼
SDK (@v-face/sdk)           ← embedding, fingerprinting, liveness, offline, ZK proofs
    │
    ▼
Registry Server (Express)   ← auth, consent, delegation, WebAuthn, hash-chain, key rotation
    │
    ├──► Matching Service (FastAPI)  ← isolated, sqlite-vec vector DB, AES-256 crypto
    │
    └──► Blockchain (Hardhat/Polygon) ← VFaceRegistry.sol, FaceVerifier.sol
                                        + ZK circuit (FaceProof.circom)
```

---

## 🐛 Known Issues / Recent Fixes

| Date | Issue | Fix |
|------|-------|-----|
| 2026-03-20 | Dashboard laggy on low-powered devices | Rewrote AnimatedBackground (CSS-only), removed global `*` transition, throttled face detection, added lazy loading + chunk splitting |
| 2026-03-20 | Qdrant requires external hosting | Replaced with sqlite-vec (self-contained, no external DB) |
| 2026-03-20 | Polygon Mumbai testnet deprecated | Added Polygon Amoy testnet config (chainId 80002) |
| 2026-03-18 | Broken logo image link in Header component | Corrected `src` path |
| 2026-03-18 | Gap at top of Navbar | CSS fix applied |
| 2026-03-16 | CSS `@mixin` / media query errors | Replaced with standard CSS |
| 2026-03-16 | `@mui/material/AppBar` import failure | Resolved module dependency |
| 2026-03-13 | `Login` component JSX type error | Fixed component type exports |
| 2026-03-07 | Vercel build failure (canvas dependency) | Marked canvas external in tsup; added `ignore-scripts` |
| 2026-03-07 | Render deploy — SQLite path crash | Switched to relative DB path |
| 2026-03-06 | MetaMask crash when extension not installed | Graceful fallback + download redirect |
| 2026-03-03 | SSNC ResNet checkpoint loading crash | Dynamic checkpoint handling + structural freeze |
| 2026-02-28 | Complaint file attachments not rendering | Fixed file display in officers' portal |
| 2026-02-27 | ethers.js CDN link broken in verify.html | Corrected CDN URL and ABI config |

---

## 📦 Tech Stack Summary

| Layer | Technology |
|-------|------------|
| Smart Contracts | Solidity 0.8.26, Hardhat, OpenZeppelin |
| ZK Circuits | Circom 2.0, snarkjs (Groth16), Poseidon hash |
| Blockchain Target | Polygon (Amoy testnet → Mainnet) |
| SDK | JavaScript (ESM), ONNX Runtime, MobileFaceNet, TypeScript declarations |
| Liveness Detection | FAS model via ONNX Runtime Web |
| Offline Mode | IndexedDB + Web Crypto AES-256-GCM |
| Registry Server | Node.js, Express, SQLite, JWT |
| Matching Service | Python 3.12, FastAPI 2.0, sqlite-vec, AES-256-GCM |
| Dashboard | React 19, Vite 7, deployed on Vercel |
| Browser Extension | Vanilla JS, Manifest v3 |
| Infrastructure | Docker, Docker Compose, Render (server + matching), Vercel (dashboard) |
| CI/CD | GitHub Actions |
