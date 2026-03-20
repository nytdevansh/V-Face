# 🔐 V-Face

**Privacy-Preserving Biometric Identity for AI Agents & Web3**

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.19-orange.svg)](https://soliditylang.org/)
[![SDK](https://img.shields.io/badge/SDK-0.1.0--alpha-green.svg)](./sdk)
[![Hardhat](https://img.shields.io/badge/Built%20with-Hardhat-yellow.svg)](https://hardhat.org/)
[![Status](https://img.shields.io/badge/Phase-2%20Hardening-blueviolet.svg)](./STATUS.md)
[![Matching](https://img.shields.io/badge/Matching-FastAPI%20%2B%20Qdrant-teal.svg)](./matching)

> **Mission**: Allow users to verify their physical identity without exposing raw biometric data. Make unauthorized use of someone's likeness detectable and preventable.

---

## ✨ What is V-Face?

V-Face is a **consent infrastructure** that lets users own their facial identity across AI services and Web3 applications. It combines client-side biometric processing with a consent token system to ensure privacy.

### Core Principles

- 🧬 **Privacy First** — Face embeddings are generated client-side using MobileFaceNet (ONNX). Raw images and vectors never leave the user's device.
- 🔒 **Irreversible Fingerprints** — Embeddings are L2-normalized, quantized, and SHA-256 hashed into a 64-char fingerprint that cannot reconstruct the original face.
- 🎯 **Robust Matching** — Isolated FastAPI microservice with Qdrant vector DB; cosine similarity at 0.85 threshold, AES-256-GCM encrypted transfers.
- 🪙 **Consent Tokens** — JWT-based tokens prove a user explicitly authorized an AI service to use their face for a specific purpose and duration.
- ⛓️ **On-Chain Registry** — `VFaceRegistry.sol` + `FaceVerifier.sol` on Polygon for immutable, censorship-resistant identity registration.
- 🛡️ **Sybil Resistance** — One human = one identity; enforced at enroll-time via duplicate vector search.
- 🔑 **WebAuthn + Delegation** — Passwordless authentication and granular identity delegation.
- 📋 **Hash-Chain Audit Log** — Tamper-evident server-side audit trail for all operations.

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [Architecture](docs/architecture.md) | System architecture & trust boundaries |
| [Fingerprint Spec](docs/fingerprint_spec.md) | Fingerprint derivation algorithm (L2 → Quantize → SHA-256) |
| [Consent Token Spec](docs/token_spec.md) | JWT consent token format & lifecycle |
| [Threat Model](docs/threat_model.md) | Security analysis & attack mitigations |
| [Integration Guide](docs/integration-guide.md) | How to integrate V-Face SDK into your app |
| [False Positive Analysis](docs/false-positive-analysis.md) | Similarity threshold analysis |
| [Robustness Report](docs/robustness-report.md) | Adversarial input testing results |
| [Protocol Spec](PROTOCOL.md) | Full protocol specification |

---

## 🚀 Quick Start

> See [QUICKSTART.md](./QUICKSTART.md) for a 5-minute setup guide.

### Prerequisites

- Node.js v18+
- Python 3.11+ (for matching service)
- Docker & Docker Compose (recommended)
- MetaMask — optional, for on-chain features

### Option A — Docker Compose (recommended)

```bash
git clone https://github.com/nytdevansh/V-Face
cd V-Face
cp .env.example .env   # fill in secrets
docker-compose up
```

This starts the **registry server** (port 3000) and the **matching service** (port 8000) together.

### Option B — Manual

```bash
# 1. Root deps (smart contract tooling)
npm install

# 2. Registry server
cd server && npm install && node index.js   # port 3000

# 3. Matching service
cd matching
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000

# 4. Dashboard
cd dashboard && npm install && npm run dev  # port 5173
```

### Run Smart Contract Tests

```bash
# From project root
npm test
```

---

## 🧠 How It Works

### 1. Registration (Client-Side)

```javascript
import { VFaceSDK } from '@v-face/sdk';

const sdk = new VFaceSDK({
    registryUrl: 'https://api.v-face.org',
    modelPath: '/model/mobilefacenet.onnx'
});

// Generate fingerprint and embedding from a face image
const fingerprint = await sdk.getFingerprint(faceImage);   // 64-char hex hash
const embedding = await sdk.getRawEmbedding(faceImage);     // Float32Array (128-d)

// Register with the registry
await fetch('/register', {
    method: 'POST',
    body: JSON.stringify({
        fingerprint,
        public_key: walletAddress,
        embedding: JSON.stringify(Array.from(embedding))
    })
});
```

### 2. Verification (Biometric Matching)

```javascript
import { VFaceSDK, cosineSimilarity } from '@v-face/sdk';

const sdk = new VFaceSDK({ registryUrl: 'http://localhost:3000' });
const freshEmbedding = await sdk.getRawEmbedding(currentFaceImage);

// Fetch stored embedding for claimed identity
const record = await fetch('/check', {
    method: 'POST',
    body: JSON.stringify({ fingerprint: claimedFingerprint })
}).then(r => r.json());

// Compare embeddings
const storedEmbedding = new Float32Array(JSON.parse(record.embedding));
const score = cosineSimilarity(freshEmbedding, storedEmbedding);

if (score > 0.85) {
    console.log('✅ Identity Verified');
} else {
    console.log('⛔ Biometric Mismatch');
}
```

### 3. Consent Flow

```javascript
// 1. AI Company requests consent
const request = await fetch('/consent/request', {
    method: 'POST',
    body: JSON.stringify({
        fingerprint, company_id: 'acme_ai',
        scope: ['auth:login'], duration: 3600
    })
}).then(r => r.json());

// 2. User approves → receives signed JWT consent token
// 3. AI Company verifies token before processing
const verification = await fetch('/verify', {
    method: 'POST',
    body: JSON.stringify({ token: consentToken })
}).then(r => r.json());
```

### 4. Privacy Architecture

```
Browser / App
     │
     ▼
SDK (@v-face/sdk)              ← MobileFaceNet ONNX, client-side only
     │ fingerprint + encrypted embedding
     ▼
Registry Server (Express)      ← Auth, Consent, Delegation, WebAuthn
     │                             Hash-chain audit, Encryption at rest
     ├──► Matching Service (FastAPI) ← AES-256-GCM decrypt, Qdrant search
     │         Anomaly Detection, Group Identity, Embedding Refresh
     └──► Blockchain (Polygon)      ← VFaceRegistry.sol, FaceVerifier.sol
```

**What's stored on-chain:** `Hash → Owner address`  
**What's NOT on-chain:** ❌ Photos, ❌ Embeddings, ❌ Personal info  
**What's in Qdrant:** Encrypted, normalized 128-d vectors (never plaintext at rest)

---

## 🏗️ Project Structure

```
V-Face/
├── contracts/
│   ├── VFaceRegistry.sol         # Registration, consent, revocation
│   └── FaceVerifier.sol          # On-chain fingerprint verification
├── sdk/                          # @v-face/sdk — client-side biometric SDK
│   ├── index.js                  # VFaceSDK (getFingerprint, getRawEmbedding)
│   ├── embedding/                # MobileFaceNet ONNX pipeline
│   ├── fingerprint/              # L2 → quantize → SHA-256 derivation
│   ├── registry/                 # Registry API client
│   ├── token/                    # Consent token utilities
│   ├── src/                      # Core VFace class & face extraction
│   └── test/                     # SDK unit & robustness tests
├── server/                       # Express registry API
│   ├── index.js                  # REST API (~23 KB)
│   ├── db.js                     # SQLite layer
│   ├── auth/                     # Authentication
│   ├── consent/                  # Consent management
│   ├── delegation/               # Identity delegation
│   ├── webauthn/                 # WebAuthn / passkey support
│   ├── admin/                    # Admin API
│   ├── ipfs/                     # IPFS storage integration
│   ├── registry/                 # Registry logic
│   ├── hashchain.js              # Tamper-evident audit log
│   ├── encryption.js             # Encryption at rest
│   ├── key_rotation.js           # Key rotation
│   └── matching_client.js        # Matching service client
├── matching/                     # Isolated FastAPI microservice
│   ├── main.py                   # FastAPI app (v1.1.0)
│   ├── qdrant_store.py           # Qdrant vector DB layer
│   ├── crypto_utils.py           # AES-256-GCM crypto
│   ├── anomaly.py                # Anomaly detection & rate limiting
│   ├── group_identity.py         # Multi-face group support
│   ├── requirements.txt
│   ├── Dockerfile
│   └── fly.toml                  # Fly.io deployment config
├── extension/                    # Browser extension (MV3)
│   ├── manifest.json
│   ├── content.js
│   └── popup.html
├── dashboard/                    # React + Vite admin dashboard (Vercel)
├── playground/                   # React + Vite demo app
├── model/                        # MobileFaceNet ONNX model
├── docs/                         # Technical documentation
├── examples/
│   └── llm_guard.js              # LLM biometric guard example
├── scripts/
│   └── deploy.js                 # Smart contract deployment
├── test/
│   └── VFaceRegistry.test.js     # Contract tests
├── docker-compose.yml            # Full-stack local dev
├── hardhat.config.js
├── STATUS.md                     # 📊 Project status tracker
├── PROTOCOL.md                   # Full protocol specification
├── CONTRIBUTING.md
└── QUICKSTART.md
```

---

## 🔐 Security

### Status

⚠️ **Alpha software. Smart contract has NOT been formally audited.**

We welcome security researchers to review the code. Found a vulnerability? Open an issue or contact us.

### Security Features

- ✅ Only fingerprint hashes stored on-chain (not biometric data)
- ✅ Client-side embedding generation (images never sent to server)
- ✅ Irreversible fingerprint derivation (SHA-256 of quantized vectors)
- ✅ Owner can revoke registration at any time
- ✅ First registration wins (prevents hijacking)
- ✅ JWT consent tokens with audience binding, expiration, and nonce
- ✅ Replay protection on revocation (timestamp + nonce validation)
- ✅ Signature verification using ethers.js for secure operations

### Threat Model

See [docs/threat_model.md](docs/threat_model.md) for full analysis, covering:
- Model drift / fingerprint stability
- Fingerprint reversal (inversion attacks)
- SDK tampering
- Man-in-the-middle & replay attacks

---

## 📜 Smart Contract API

### `VFaceRegistry.sol` — Core Functions

| Function | Description | Cost |
|----------|-------------|------|
| `register(bytes32 hash)` | Register a face encoding hash | ~$0.001 on Polygon |
| `checkRegistration(bytes32 hash)` | Check if face is registered | FREE (view) |
| `grantConsent(bytes32 hash, address requester)` | Grant consent to an AI service | ~$0.001 |
| `revoke(bytes32 hash)` | Revoke your registration | ~$0.001 |
| `getRegistration(bytes32 hash)` | Get full registration details | FREE (view) |
| `isActive(bytes32 hash)` | Check if registration is active | FREE (view) |
| `getOwnerRegistrations(address owner)` | List all registrations by owner | FREE (view) |

### Deploying

```bash
# Deploy to Polygon Mumbai (testnet) — FREE with faucet
npm run deploy:testnet

# Deploy to Polygon Mainnet — ~$0.10
npm run deploy:mainnet
```

---

## 🗺️ Roadmap

### Phase 1: Foundation ✅ *Complete*
- [x] Protocol specification
- [x] Smart contracts (`VFaceRegistry.sol`, `FaceVerifier.sol`)
- [x] Comprehensive contract test suite
- [x] Deployment scripts
- [x] JavaScript SDK (`@v-face/sdk`)
- [x] Registry server (Express + SQLite)
- [x] Dashboard (React + Vite, deployed on Vercel)
- [x] Playground demo app
- [x] Documentation suite (architecture, fingerprint, threat model, token spec, integration guide)
- [x] Consent token system (JWT-based)
- [x] LLM Guard example

### Phase 2: Hardening 🔨 *In Progress*
- [x] Isolated matching microservice (FastAPI + Qdrant)
- [x] AES-256-GCM encrypted embedding transfers
- [x] Embedding drift refresh endpoint
- [x] Differential privacy noise (optional)
- [x] Anomaly detection & rate limiting
- [x] Multi-face group identity
- [x] WebAuthn / passkey authentication
- [x] Identity delegation
- [x] Hash-chain tamper-evident audit log
- [x] Encryption at rest + key rotation
- [x] Browser extension (Manifest v3)
- [x] IPFS storage integration
- [ ] Deploy matching service to Fly.io (production)
- [ ] Deploy to Polygon Mumbai testnet
- [ ] End-to-end integration testing
- [ ] Community security review
- [ ] Bug bounty program

### Phase 3: Launch
- [ ] Formal security audit
- [ ] Deploy to Polygon mainnet
- [ ] Publish `@v-face/sdk` to npm
- [ ] Launch public registration app
- [ ] Partner with AI services

### Phase 4: Growth
- [ ] Multi-chain support (Ethereum, Arbitrum)
- [ ] Mobile SDKs (iOS, Android)
- [ ] DAO governance
- [ ] Academic partnerships

---

## 🤝 Contributing

We welcome contributions! See [CONTRIBUTING.md](./CONTRIBUTING.md) for details.

**Ways to contribute:**
- 🐛 Report bugs
- 💡 Suggest features
- 🔐 Security audits
- 📝 Improve documentation
- 💻 Submit code

---

## 📄 License

- **Smart Contracts**: GPL-3.0 (see [LICENSE](./LICENSE))
- **Protocol Specification**: CC BY-SA 4.0
- **Documentation**: CC BY-SA 4.0

---

## 🙏 Acknowledgments

Built with:
- [Hardhat](https://hardhat.org/) — Ethereum development environment
- [OpenZeppelin](https://openzeppelin.com/) — Secure smart contract patterns
- [Polygon](https://polygon.technology/) — Scalable blockchain infrastructure
- [MobileFaceNet](https://arxiv.org/abs/1804.07573) — Lightweight face recognition model
- [ONNX Runtime](https://onnxruntime.ai/) — Cross-platform model inference
- [face-api.js](https://github.com/justadudewhohacks/face-api.js) — Face detection in browser

---

**Built with ❤️ for a more ethical AI future.**

⭐ **Star this repo if you believe in digital identity rights!**
