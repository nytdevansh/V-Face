# 🛡️ FaceGuard Protocol

**Open protocol for biometric consent management in the age of AI**

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.19-orange.svg)](https://soliditylang.org/)
[![Hardhat](https://img.shields.io/badge/Built%20with-Hardhat-yellow.svg)](https://hardhat.org/)

> **Mission**: Ensure people maintain control over their digital identity by making unauthorized use of their likeness detectable and preventable.

---

## 📖 What is FaceGuard?

FaceGuard is a decentralized protocol that allows individuals to register their facial biometric data on-chain, creating an immutable record of ownership. AI services can then verify this registration before processing images, ensuring consent and preventing misuse.

### The Problem

- ❌ AI can generate deepfakes without consent
- ❌ Your face can be used in AI-generated content without permission
- ❌ No easy way to prove ownership of your likeness
- ❌ Existing solutions are centralized and proprietary

### The Solution

- ✅ **Decentralized registry** on blockchain (immutable, censorship-resistant)
- ✅ **Privacy-first** (only hashes stored on-chain, not raw biometric data)
- ✅ **Open protocol** (free to use, no API keys, no rate limits)
- ✅ **Easy integration** for AI services (simple SDK)

---

## 🚀 Quick Start

### Prerequisites

- Node.js v16+ 
- npm or yarn
- A Web3 wallet (MetaMask)
- Some testnet MATIC (get from [faucet](https://faucet.polygon.technology/))

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/faceguard-protocol
cd faceguard-protocol

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Edit .env and add your private key
nano .env
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests with gas reporting
REPORT_GAS=true npm test

# Run tests with coverage
npm run coverage
```

Expected output:
```
  FaceRegistry
    Deployment
      ✓ Should set the correct version
      ✓ Should start with zero registrations
    Registration
      ✓ Should allow a user to register their face
      ✓ Should prevent registering the same hash twice
      ...
  
  33 passing (2s)
```

### Deploying to Testnet

```bash
# Deploy to Polygon Mumbai (testnet)
npm run deploy:testnet
```

Expected output:
```
🚀 Deploying FaceGuard Registry...

Deploying with account: 0x1234...5678
Account balance: 1.5 MATIC

✅ FaceRegistry deployed to: 0xABCD...EFGH
📝 Network: mumbai
⛽ Gas used: ~ 850000

📊 Contract Info:
   Version: 1.0.0
   Total Registrations: 0

🔗 Block Explorer:
   https://mumbai.polygonscan.com/address/0xABCD...EFGH

✨ Deployment complete!
```

### Deploying to Mainnet

```bash
# Deploy to Polygon Mainnet (costs ~$0.10)
npm run deploy:mainnet
```

---

## 📚 How It Works

### 1. User Registers Face

```javascript
// In user's browser
import { extractFaceEncoding, hashEncoding } from '@faceguard/sdk';

// Extract face encoding from photo (128-d vector)
const encoding = await extractFaceEncoding(photoFile);

// Hash the encoding
const hash = hashEncoding(encoding);

// Register on-chain
await contract.register(hash);
```

### 2. AI Service Checks Registration

```javascript
// In AI service's app
import { FaceGuard } from '@faceguard/sdk';

const guard = new FaceGuard({ network: 'polygon' });

// User uploads photo
async function handleImageUpload(photo, userWallet) {
  // Extract encoding client-side
  const encoding = await guard.extractEncoding(photo);
  const hash = guard.hashEncoding(encoding);
  
  // Check if registered
  const owner = await guard.checkRegistration(hash);
  
  if (owner && owner !== userWallet) {
    // Face belongs to someone else!
    alert('This face is registered. Please get consent from owner.');
    return false;
  }
  
  // Safe to proceed
  return processWithAI(photo);
}
```

### 3. Privacy Guarantee

**What's on-chain:**
```
Hash: 0x3f5d8... → Owner: 0x1234...
```

**What's NOT on-chain:**
- ❌ Your photo
- ❌ Your face encoding (128-d vector)
- ❌ Any personal information

**The photo and encoding never leave your device!**

---

## 🏗️ Project Structure

```
faceguard-protocol/
├── contracts/
│   └── FaceRegistry.sol       # Main smart contract
├── scripts/
│   └── deploy.js              # Deployment script
├── test/
│   └── FaceRegistry.test.js   # Comprehensive tests
├── PROTOCOL.md                # Full protocol specification
├── hardhat.config.js          # Hardhat configuration
├── package.json               # Dependencies
└── README.md                  # This file
```

---

## 🔐 Security

### Audit Status

⚠️ **This is alpha software. Smart contract has NOT been formally audited yet.**

We welcome security researchers to review the code. Found a vulnerability? Please report to: security@faceguard.org

### Security Features

- ✅ Only hashes stored on-chain (not raw biometric data)
- ✅ Owner can revoke registration at any time
- ✅ First registration wins (prevents hijacking)
- ✅ All actions emit events for transparency
- ✅ Extensive test coverage (33 tests)
- ✅ Custom errors for gas optimization

### Threat Model

**What FaceGuard protects against:**
- ✅ Unauthorized use of your likeness in AI content
- ✅ Deepfakes created without consent
- ✅ Someone claiming ownership of your face

**What FaceGuard does NOT protect against:**
- ❌ Someone physically photographing you (already possible)
- ❌ Using publicly available photos (prior art)
- ❌ Determined adversaries with unlimited resources

---

## 💰 Cost Analysis

### Testnet (Mumbai)
- **Deploy contract**: FREE (using faucet)
- **Register face**: FREE (using faucet)
- **Check registration**: FREE (read operation)

### Mainnet (Polygon)
- **Deploy contract**: ~$0.10 (one-time)
- **Register face**: ~$0.001-0.01 (per user)
- **Check registration**: FREE (view function, no gas)
- **Grant consent**: ~$0.001-0.01
- **Revoke**: ~$0.001-0.01

**Total to get started: Under $1** 🎉

---

## 🛠️ Development

### Running Local Node

```bash
# Start local Hardhat node
npx hardhat node

# In another terminal, deploy to local network
npx hardhat run scripts/deploy.js --network localhost
```

### Interacting with Contract

```javascript
const hre = require("hardhat");

async function main() {
  const contract = await hre.ethers.getContractAt(
    "FaceRegistry",
    "0x5FbDB2315678afecb367f032d93F642f64180aa3" // Your deployed address
  );
  
  // Check version
  const version = await contract.VERSION();
  console.log("Version:", version);
  
  // Register a face
  const hash = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("test_encoding"));
  await contract.register(hash);
  
  // Check registration
  const owner = await contract.checkRegistration(hash);
  console.log("Owner:", owner);
}

main();
```

### Adding New Features

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Write tests first (TDD approach)
4. Implement the feature
5. Ensure all tests pass (`npm test`)
6. Submit a pull request

---

## 🌍 Deployment Info

### Supported Networks

| Network | Chain ID | RPC URL | Status |
|---------|----------|---------|--------|
| Polygon Mumbai | 80001 | https://rpc-mumbai.maticvigil.com | ✅ Testnet |
| Polygon Mainnet | 137 | https://polygon-rpc.com | ✅ Production |
| Ethereum Mainnet | 1 | https://eth.llamarpc.com | 🔜 Coming Soon |

### Deployed Contracts

**Testnet (Mumbai)**:
- Address: `TBD` (deploy with `npm run deploy:testnet`)
- Explorer: https://mumbai.polygonscan.com/

**Mainnet (Polygon)**:
- Address: `TBD` (deploy with `npm run deploy:mainnet`)
- Explorer: https://polygonscan.com/

---

## 📜 Smart Contract API

### Core Functions

#### `register(bytes32 _encodingHash)`
Register a face encoding hash.
- **Parameters**: SHA256 hash of face encoding
- **Access**: Anyone
- **Cost**: ~$0.001-0.01 on Polygon
- **Events**: Emits `FaceRegistered`

#### `checkRegistration(bytes32 _encodingHash)`
Check if a face is registered.
- **Parameters**: Hash to check
- **Returns**: Owner address (or `0x0` if not registered)
- **Access**: Anyone (view function)
- **Cost**: FREE

#### `grantConsent(bytes32 _encodingHash, address _requester)`
Grant consent for someone to use your face.
- **Parameters**: Your hash, requester's address
- **Access**: Only owner
- **Events**: Emits `ConsentGranted`

#### `revoke(bytes32 _encodingHash)`
Revoke your face registration.
- **Parameters**: Your hash
- **Access**: Only owner
- **Events**: Emits `RegistrationRevoked`

### View Functions

- `getOwnerRegistrations(address _owner)` - Get all hashes owned by an address
- `getRegistration(bytes32 _encodingHash)` - Get full registration details
- `isActive(bytes32 _encodingHash)` - Check if registration is active
- `VERSION()` - Get contract version
- `totalRegistrations()` - Get total active registrations

---

## 🤝 Contributing

We welcome contributions! This is an open-source project for the public good.

**Ways to contribute:**
- 🐛 Report bugs
- 💡 Suggest features
- 🔐 Security audits
- 📝 Improve documentation
- 💻 Submit code
- 🌍 Translate

See [CONTRIBUTING.md](./CONTRIBUTING.md) for details.

---

## 🗺️ Roadmap

### Phase 1: Foundation ✅ *Current Phase*
- [x] Protocol specification
- [x] Smart contract implementation
- [x] Comprehensive tests
- [x] Deployment scripts
- [ ] JavaScript SDK
- [ ] Documentation site

### Phase 2: Testing (Q2 2024)
- [ ] Deploy to testnet
- [ ] Community security review
- [ ] Bug bounty program
- [ ] 10+ test integrations
- [ ] 1,000+ test registrations

### Phase 3: Launch (Q3 2024)
- [ ] Formal security audit
- [ ] Deploy to Polygon mainnet
- [ ] Launch user-facing app
- [ ] Partner with AI services
- [ ] Media coverage

### Phase 4: Growth (Q4 2024+)
- [ ] Multi-chain support
- [ ] Mobile SDKs
- [ ] Browser extension
- [ ] DAO governance
- [ ] Academic partnerships

---

## 📄 License

- **Smart Contracts**: GPL-3.0 (see [LICENSE](./LICENSE))
- **Protocol Specification**: CC BY-SA 4.0
- **Documentation**: CC BY-SA 4.0

**Why GPL?** We want to ensure the protocol remains free and open. Any modifications must also be open-sourced.

---

## 🙏 Acknowledgments

Built with:
- [Hardhat](https://hardhat.org/) - Ethereum development environment
- [OpenZeppelin](https://openzeppelin.com/) - Secure smart contract library
- [Polygon](https://polygon.technology/) - Scalable blockchain infrastructure
- [face-api.js](https://github.com/justadudewhohacks/face-api.js) - Face recognition in browser

Inspired by:
- The right to privacy
- Open-source ethos
- Ethical AI development

---

## 📞 Contact

- **GitHub**: https://github.com/faceguard-protocol
- **Discord**: https://discord.gg/faceguard
- **Twitter**: @faceguard_org
- **Email**: hello@faceguard.org

---

## ⚖️ Legal

This protocol is provided "as-is" without warranties. Use at your own risk. This is not legal advice. Consult a lawyer for your specific situation.

---

**Built with ❤️ for a more ethical AI future.**

⭐ **Star this repo if you believe in digital identity rights!**
