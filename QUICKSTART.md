# 🚀 Quick Start Guide

## You're 5 Minutes Away from Deploying V-Face!

### Step 1: Setup (2 minutes)

```bash
# Navigate to the project
cd V-Face

# Install dependencies
npm install

# This will install Hardhat and all required packages
```

### Step 2: Get Test Funds (1 minute)

1. Install MetaMask: https://metamask.io/
2. Switch to Polygon Mumbai testnet
   - Network Name: Polygon Mumbai
   - RPC URL: https://rpc-mumbai.maticvigil.com
   - Chain ID: 80001
   - Currency: MATIC
3. Get free testnet MATIC: https://faucet.polygon.technology/

### Step 3: Configure (1 minute)

```bash
# Copy environment template
cp .env.example .env

# Edit .env and add your wallet's private key
nano .env  # or use any text editor

# In .env, set:
PRIVATE_KEY=your_metamask_private_key_here
```

**How to get your private key:**
- MetaMask → Account Details → Export Private Key
- ⚠️ **NEVER share this with anyone!**

### Step 4: Test Locally (1 minute)

```bash
# Run all tests
npm test

# You should see:
# ✓ 33 passing (2s)
```

### Step 5: Deploy to Testnet (FREE!)

```bash
# Deploy to Polygon Mumbai
npm run deploy:testnet

# You'll see:
# ✅ FaceRegistry deployed to: 0xABC...XYZ
# 🔗 https://mumbai.polygonscan.com/address/0xABC...XYZ
```

**That's it! You now have a working V-Face registry on testnet!** 🎉

---

## What's Next?

### Option A: Build the Frontend
Create a React app that lets users register their faces.

### Option B: Build the SDK
Create a JavaScript library that AI services can integrate.

### Option C: Deploy to Mainnet
Deploy to Polygon mainnet (costs ~$0.10).

```bash
npm run deploy:mainnet
```

### Option D: Spread the Word
- Star the repo ⭐
- Share on Twitter/LinkedIn
- Write a blog post
- Submit to Hacker News

---

## Common Issues

### "Insufficient funds"
→ Get more testnet MATIC from the faucet

### "Network error"
→ Check your RPC URL in hardhat.config.js

### "Contract already deployed"
→ Check deployment-mumbai.json for the existing address

### Tests failing
→ Make sure you ran `npm install`

---

## Project Structure

```
V-Face/
├── contracts/
│   └── FaceRegistry.sol       ← The smart contract
├── scripts/
│   └── deploy.js              ← Deployment script
├── test/
│   └── FaceRegistry.test.js   ← 33 tests
├── PROTOCOL.md                ← Full specification
├── README.md                  ← Documentation
├── CONTRIBUTING.md            ← How to contribute
├── package.json               ← Dependencies
└── hardhat.config.js          ← Hardhat config
```

---

## Next Steps After Deployment

### 1. Interact with Your Contract

```javascript
// In Hardhat console
npx hardhat console --network mumbai

const FaceRegistry = await ethers.getContractFactory("FaceRegistry");
const contract = FaceRegistry.attach("YOUR_CONTRACT_ADDRESS");

// Check version
await contract.VERSION(); // "1.0.0"

// Register a test face
const hash = ethers.keccak256(ethers.toUtf8Bytes("test_face"));
await contract.register(hash);

// Check registration
await contract.checkRegistration(hash); // Your address!
```

### 2. Share Your Deployment

Post on Twitter:
```
🚀 Just deployed V-Face — privacy-preserving biometric identity for AI agents & Web3!

Contract: 0xYOUR_ADDRESS
Network: Polygon Mumbai
Cost: $0 (testnet)

Building the future of ethical AI ⚡️

#Web3 #AI #Privacy
```

### 3. Start Building

Now build:
- User registration app (React + Web3)
- AI service integration (SDK)
- Browser extension
- Documentation site

---

## Resources

- **Protocol Spec**: See PROTOCOL.md
- **Smart Contract**: See contracts/FaceRegistry.sol
- **Tests**: See test/FaceRegistry.test.js
- **Hardhat Docs**: https://hardhat.org/docs
- **Polygon Docs**: https://docs.polygon.technology/

---

## Get Help

- Open an issue on GitHub
- Ask in Discord
- GitHub: https://github.com/nytdevansh/V-Face

---

**You've got this! 🚀**
