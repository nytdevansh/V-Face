# V-Face Protocol v1.0

## Abstract

V-Face is an open protocol for biometric consent management in the age of generative AI. It enables individuals to register their facial biometric data on-chain, creating an immutable record of ownership that AI services can verify before processing images.

**Mission**: Ensure people maintain control over their digital identity by making unauthorized use of their likeness detectable and preventable.

---

## Problem Statement

With the rise of AI image generation, deepfakes, and facial manipulation tools, individuals have lost control over how their likeness is used. Current solutions are:
- **Centralized**: Single point of failure, vulnerable to hacks
- **Proprietary**: Lock-in, no interoperability  
- **Reactive**: Detect misuse after it happens

V-Face provides a **decentralized, open, and proactive** alternative.

---

## Core Principles

1. **Privacy-First**: Biometric data never leaves the user's device in raw form
2. **Decentralized**: No single entity controls the registry
3. **Permissionless**: Anyone can integrate, no API keys required
4. **Transparent**: All code is open source and auditable
5. **User Control**: Individuals can revoke registrations at any time

---

## How It Works

### Overview

```
┌──────────────┐
│     User     │
│   (Alice)    │
└──────┬───────┘
       │
       │ 1. Takes selfie
       │ 2. Browser extracts face encoding (128-d vector)
       │ 3. Signs transaction with wallet
       │
       ▼
┌─────────────────────────────────────┐
│      Smart Contract (Blockchain)     │
│  - Stores: hash(encoding) → wallet  │
│  - Events: Registration, Consent    │
└─────────────────────────────────────┘
       ▲
       │
       │ 4. AI service uploads user photo
       │ 5. Service extracts face encoding
       │ 6. Service queries: "Is this registered?"
       │ 7. If YES + no consent → Block/Request consent
       │
┌──────────────┐
│  AI Service  │
│ (Midjourney) │
└──────────────┘
```

### Registration Flow

**Step 1: User Registration**

1. User visits registration app (web/mobile)
2. User connects Web3 wallet (MetaMask, WalletConnect, etc.)
3. User uploads photo or takes selfie
4. **Client-side** JavaScript extracts face encoding using `face-api.js`
5. Encoding is hashed: `hash = SHA256(encoding)`
6. User signs blockchain transaction: `register(hash)`
7. Smart contract emits `FaceRegistered` event

**Privacy guarantee**: The photo never leaves the device. Only the hash goes on-chain.

### Verification Flow

**Step 2: AI Service Integration**

1. User uploads photo to AI service (e.g., image generator)
2. Service extracts face encoding **client-side** (in user's browser)
3. Service hashes the encoding: `hash = SHA256(encoding)`
4. Service queries smart contract: `getOwner(hash)`
5. **If registered**:
   - Service checks if uploader's wallet matches owner's wallet
   - If NO match → Request consent from owner
   - If consent denied → Block processing
6. **If not registered**: Process normally

**Key insight**: The AI service never needs to see the raw photo. Only the encoding, which is extracted locally.

---

## Technical Specification

### Data Structures

**Face Encoding**
- Format: 128-dimensional floating-point vector
- Extraction: dlib's face recognition model (or equivalent)
- Privacy: Never stored on-chain in raw form

**Encoding Hash**
```
hash = SHA256(encoding.toString())
```
- Deterministic: Same face → same hash
- One-way: Cannot reconstruct face from hash
- Collision-resistant: Unique identifier

**Registration Record**
```solidity
struct Registration {
    address owner;        // Wallet address of the owner
    bytes32 encodingHash; // SHA256 hash of face encoding
    uint256 timestamp;    // When registered
    bool revoked;         // Can be revoked by owner
}
```

### Smart Contract Interface

```solidity
// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

interface IFaceRegistry {
    
    // Events
    event FaceRegistered(
        address indexed owner,
        bytes32 indexed encodingHash,
        uint256 timestamp
    );
    
    event ConsentGranted(
        address indexed owner,
        address indexed requester,
        bytes32 indexed encodingHash,
        uint256 timestamp
    );
    
    event RegistrationRevoked(
        address indexed owner,
        bytes32 indexed encodingHash
    );
    
    // Core Functions
    function register(bytes32 _encodingHash) external;
    function checkRegistration(bytes32 _encodingHash) external view returns (address);
    function grantConsent(bytes32 _encodingHash, address _requester) external;
    function revoke(bytes32 _encodingHash) external;
}
```

### Supported Blockchains

**Recommended**: Polygon (low gas fees, EVM-compatible)

**Also supported**:
- Ethereum Mainnet (higher fees, maximum security)
- Base (Coinbase L2)
- Arbitrum
- Optimism

**Gas Costs** (approximate on Polygon):
- Register: ~$0.001-0.01
- Check (read): FREE
- Grant consent: ~$0.001-0.01
- Revoke: ~$0.001-0.01

---

## Security Considerations

### Threat Model

**What V-Face protects against:**
✅ Unauthorized use of someone's face in AI-generated content
✅ Deepfakes created without consent
✅ Facial manipulation by third parties

**What V-Face does NOT protect against:**
❌ Someone physically taking your photo (that's already possible)
❌ Using photos already published online (prior art problem)
❌ Determined adversaries with advanced techniques (always possible)

### Privacy Guarantees

1. **Biometric Data Never On-Chain**
   - Only hashes are stored
   - Cannot reconstruct face from hash
   - Complies with GDPR "right to be forgotten" (via revocation)

2. **Local Processing**
   - Face encoding extracted in user's browser
   - No server sees raw photos
   - User maintains control

3. **Minimal Data Collection**
   - Only store: hash + wallet address + timestamp
   - No names, emails, or personal info required

### Attack Vectors & Mitigations

**Attack 1: Hash Collision**
- *Risk*: Two different faces produce same hash
- *Likelihood*: Astronomically low (SHA256 collision resistance)
- *Mitigation*: Use cryptographically secure hash function

**Attack 2: Replay Attack**
- *Risk*: Someone copies a registration transaction
- *Likelihood*: Medium
- *Mitigation*: Smart contract checks if hash already registered

**Attack 3: Malicious AI Service**
- *Risk*: Service ignores the protocol, processes anyway
- *Likelihood*: High (voluntary adoption)
- *Mitigation*: 
  - Social pressure (public shaming)
  - Legal frameworks (terms of service)
  - Browser extensions (client-side enforcement)

**Attack 4: Face Encoding Variation**
- *Risk*: Same person's face produces different encodings
- *Likelihood*: Low but possible (lighting, angle, age)
- *Mitigation*: 
  - Use robust face recognition models
  - Allow multiple registrations per person
  - Fuzzy matching threshold (off-chain)

---

## Integration Guide

### For Users (Registering Your Face)

**Prerequisites:**
- Web3 wallet (MetaMask, WalletConnect, Coinbase Wallet)
- Small amount of crypto for gas (~$0.01 on Polygon)

**Steps:**
1. Visit registration app: `https://app.v-face.org`
2. Connect wallet
3. Upload photo or take selfie
4. Review and sign transaction
5. Done! Your face is now registered

### For AI Services (Integration)

**Prerequisites:**
- Basic Web3 knowledge
- JavaScript/TypeScript environment

**Steps:**

**1. Install SDK**
```bash
npm install @v-face/sdk
```

**2. Initialize**
```javascript
import { VFaceSDK } from '@v-face/sdk';

const sdk = new VFaceSDK({
  network: 'polygon',  // or 'ethereum', 'base', etc.
  rpcUrl: 'https://polygon-rpc.com'
});

await guard.initialize();
```

**3. Check Before Processing**
```javascript
// In your image upload handler
async function handleImageUpload(imageFile, userWallet) {
  
  // Extract face encoding (client-side)
  const encoding = await guard.extractEncoding(imageFile);
  
  if (!encoding) {
    return { error: 'No face detected' };
  }
  
  // Check if registered
  const result = await guard.check(encoding);
  
  if (result.registered) {
    // Face belongs to someone else
    if (result.owner !== userWallet) {
      // Request consent
      const consent = await guard.requestConsent(
        result.owner,
        userWallet
      );
      
      if (!consent.granted) {
        return { error: 'Consent required from face owner' };
      }
    }
  }
  
  // Safe to proceed
  return processWithAI(imageFile);
}
```

**4. Optional: Show Badge**
```html
<!-- Add to your site -->
<img src="https://v-face.org/badge.svg" alt="Protected by V-Face" />
```

---

## Governance

### Decision-Making Process

V-Face is governed by the community through:

1. **GitHub Discussions**: Propose changes
2. **V-Face Improvement Proposals (VIPs)**: Formal specs
3. **Voting**: Stakeholders vote on major changes
4. **Implementation**: Changes merged by maintainers

### Stakeholder Groups

- **Users**: People who register their faces (vote weight: 1x)
- **Integrators**: Services that use the protocol (vote weight: 2x)
- **Contributors**: Active code contributors (vote weight: 2x)
- **Node Operators**: Run infrastructure (vote weight: 1x)

### Amendment Process

1. Submit FGP as GitHub pull request
2. Community discussion period (14 days)
3. Vote (7 days)
4. If approved (>66% yes), merge and implement

---

## Roadmap

### Phase 1: Foundation (Months 1-3) ✅ *We are here*
- [x] Protocol specification
- [ ] Smart contract implementation
- [ ] JavaScript SDK
- [ ] Reference node (API)
- [ ] Registration webapp
- [ ] Deploy to testnet

### Phase 2: Testing (Months 4-6)
- [ ] Security review (community)
- [ ] Bug bounty program
- [ ] 10+ integrations
- [ ] 1,000+ registrations
- [ ] Deploy to mainnet

### Phase 3: Adoption (Months 7-12)
- [ ] Partner with major AI services
- [ ] Mobile SDKs (iOS, Android)
- [ ] Browser extension
- [ ] Formal security audit
- [ ] Multi-chain support

### Phase 4: Sustainability (Year 2+)
- [ ] DAO formation
- [ ] Grant funding
- [ ] Industry standardization (W3C?)
- [ ] Academic research partnerships

---

## FAQ

**Q: Is this like a "do not train" list for AI?**
A: No. This is about consent for using someone's specific likeness, not training data.

**Q: What if someone registers my face before me?**
A: First registration wins (like domain names). Register early!

**Q: Can I delete my registration?**
A: Yes! Call `revoke()` and your registration is marked inactive.

**Q: Does this work for videos?**
A: Yes, but you'd extract encodings from video frames. Same principle.

**Q: What if AI services don't integrate this?**
A: Social pressure, legal frameworks, and browser extensions can help enforce it.

**Q: Is my face data safe?**
A: Your face never goes on-chain. Only a mathematical hash. No one can reconstruct your face from it.

**Q: Does this cost money to use?**
A: Registering costs ~$0.01 in gas fees. Checking is free. No subscriptions.

**Q: Can companies profit from this?**
A: The protocol is GPL-licensed. Anyone can use it, but modifications must be open-sourced.

---

## Contributing

We welcome contributions! See [CONTRIBUTING.md](./CONTRIBUTING.md)

**Ways to help:**
- Code (smart contracts, SDKs, APIs)
- Documentation (guides, tutorials)
- Security (audits, bug reports)
- Integrations (build connectors for AI services)
- Outreach (spread the word)

---

## License

- Protocol Specification: CC BY-SA 4.0
- Smart Contracts: GPL v3
- SDKs: MIT
- Documentation: CC BY-SA 4.0

---

## Contact

- GitHub: https://github.com/nytdevansh/V-Face
- Twitter: @v_face_org

---

**Built with ❤️ for a more ethical AI future.**
