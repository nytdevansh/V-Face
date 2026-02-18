# Dashboard & Playground Deployment Guide

## Overview

Both **Dashboard** and **Playground** frontends have been completely rebuilt to provide full functionality with the V-Face SDK, matching service, and registry API.

### What Changed

#### Dashboard (`dashboard/src/components/Dashboard.jsx`)
**Before:** 464 lines of static UI with modals that didn't do anything, localStorage-based state
**After:** 327 lines of functional code with:
- ✅ **Register Tab**: Capture faces, generate fingerprints, register identities with SDK
- ✅ **Verify Tab**: Scan faces, search against registry, show match results
- ✅ **Delete/Revoke**: Fully functional revoke with wallet signing
- ✅ **Real SDK Integration**: Calls `sdk.register()`, `sdk.search()`, `sdk.revoke()`, `sdk.check()`

#### Playground
Already working - uses identical patterns and same WalletContext

---

## Environment Setup

Both frontends need ONE environment variable pointing to your deployed server:

### 1. Create `.env.local` files

**dashboard/.env.local**
```env
VITE_REGISTRY_URL=https://v-face.onrender.com
VITE_MODEL_PATH=./mobilefacenet.onnx
```

**playground/.env.local**
```env
VITE_REGISTRY_URL=https://v-face.onrender.com
VITE_MODEL_PATH=./mobilefacenet.onnx
```

Replace `https://v-face.onrender.com` with your actual server URL:
- **Local development**: `http://localhost:3000`
- **Render production**: Check your Render deployment URL
- **Custom domain**: Your own server URL

### 2. Verify Model File

Both need the model file at `public/mobilefacenet.onnx`:

```bash
# Check if model exists
ls -lh dashboard/public/mobilefacenet.onnx
ls -lh playground/public/mobilefacenet.onnx

# Should be ~24MB
```

---

## Local Testing

### Terminal 1: Start Server
```bash
cd /path/to/server
npm install
npm start
# Should be running on http://localhost:3000
```

### Terminal 2: Start Dashboard Dev
```bash
cd /path/to/dashboard
npm install
npm run dev
# http://localhost:5173
```

### Terminal 3: Start Playground Dev (optional)
```bash
cd /path/to/playground
npm install
npm run dev
# http://localhost:5174
```

### Testing Workflow

1. **Open Dashboard** at http://localhost:5173
2. **Connect MetaMask wallet** (any test account)
3. **Register Tab**:
   - Click "📸 Capture" to take a webcam photo
   - Click "Register" to register this face
   - Should show fingerprint and "✅ Registered" status
   - "🗑️ Revoke" button appears after registration
4. **Verify Tab**:
   - Capture another face photo
   - Click "Verify"
   - Should show "✅ Match Found!" if same person, "❌ No Match" if different
5. **Open Playground** at http://localhost:5174 and repeat to verify both work together
6. **Revoke Identity**:
   - Click revoke in either dashboard/playground
   - Sign wallet message
   - Should confirm revocation

---

## Deployment to Vercel

### Prerequisite: Render Server Running
Make sure your server is deployed to Render first:
- Check: https://your-render-project.onrender.com/health

### Deploy Dashboard

```bash
cd dashboard
# Verify .env.example has correct VITE_REGISTRY_URL
cat .env.example

# Build locally to test
npm run build

# Deploy to Vercel
vercel deploy --prod
```

During Vercel setup:
- **Framework**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Environment Variables**:
  - `VITE_REGISTRY_URL`: https://your-render-project.onrender.com (or your server URL)
  - `VITE_MODEL_PATH`: `./mobilefacenet.onnx`

### Deploy Playground (Optional)

```bash
cd playground
npm run build
vercel deploy --prod --name playground
```

---

## Architecture & Data Flow

### Registration Flow
```
User Face (JPG)
    ↓
[Dashboard Register Tab]
    ↓
SDK.getFingerprint(image) → 128-d embedding vector
    ↓
MetaMask: signer.signMessage(fingerprint) → Signature
    ↓
SDK.register(image, account, metadata) → POST /register
    ↓
Server: Encrypt embedding, store in registry
    ↓
Matching Service: Index in Qdrant vector DB
    ↓
✅ Identity registered
```

### Verification Flow
```
User Face (JPG)
    ↓
[Dashboard Verify Tab]
    ↓
SDK.getFingerprint(image) → 128-d embedding vector
    ↓
SDK.check(fingerprint) → Exact match? POST /check
    ↓ (if no exact match) 
SDK.search(image, threshold=0.75) → POST /search
    ↓
Matching Service: Vector similarity search in Qdrant
    ↓
Results: [{ fingerprint, similarity: 0.92, owner }, ...]
    ↓
Display match or "No Match"
```

### Revocation Flow
```
Revoke Button Clicked
    ↓
MetaMask: signer.signMessage(JSON object) → Signature
    ↓
SDK.revoke(fingerprint, signature, message) → POST /revoke
    ↓
Server: Mark fingerprint as revoked in registry
    ↓
Matching Service: Exclude from future searches
    ↓
✅ Identity revoked
```

---

## SDK Integration Details

All three main operations use `useWallet()` hook from `WalletContext`:

```javascript
import { useWallet } from '../context/WalletContext';

function MyComponent() {
  const { account, sdk, signer } = useWallet();
  
  // account: "0x123..." (connected wallet)
  // sdk: VFaceSDK instance (pre-initialized)
  // signer: ethers.Signer (for signing messages)
}
```

### SDK Methods Available

- `sdk.init()` - Initialize model (called automatically first time)
- `sdk.getFingerprint(imageElement)` - Get 128-d embedding
- `sdk.register(image, account, metadata)` - Register face
- `sdk.search(image, threshold)` - Search by similarity
- `sdk.check(fingerprint)` - Check if fingerprint exists
- `sdk.revoke(fingerprint, signature, message)` - Revoke identity

---

## Environment Files Reference

### dashboard/.env.example
```env
# API endpoint for registry server
VITE_REGISTRY_URL=http://localhost:3000

# Path to ONNX model (loads immediately on app start)
VITE_MODEL_PATH=./mobilefacenet.onnx

# Optional: Sentry error tracking
VITE_SENTRY_DSN=
```

### Vite Build Configuration
Already fixed in both `vite.config.js`:
```javascript
build: {
  rollupOptions: {
    external: ['fs', 'canvas'], // Externalize Node.js modules
    onwarn(warning) {
      // Suppress "externalized for browser" warnings
      if (warning.message?.includes('externalized')) return;
      warn(warning);
    }
  }
}
```

---

## Troubleshooting

### "SDK not initialized" error
- Check `VITE_REGISTRY_URL` is set correctly
- Check model file exists at `public/mobilefacenet.onnx`
- Check server is running and accessible

### "No match/verification failed"
- Ensure same person in capture
- Try threshold adjustment in code (currently 0.75)
- Check matching service logs: `https://your-render.onrender.com/health`

### Build fails with "fs/canvas" errors
- Already fixed in vite.config.js with rollupOptions.external
- If still failing, clear node_modules and rebuild: `rm -rf node_modules && npm install && npm run build`

### MetaMask not connecting
- Ensure MetaMask extension installed
- Check browser console for errors
- Try different test account

### Dashboard/Playground on different URLs
- Both use same VITE_REGISTRY_URL to connect to same server ✅
- Can register in Dashboard, verify in Playground (same registry) ✅
- Different deployments possible with different VITE_REGISTRY_URL values

---

## Production Checklist

- [ ] Server deployed to Render (check health endpoint)
- [ ] Matching service deployed to Render (check Qdrant connection)
- [ ] Dashboard `.env.local` has correct VITE_REGISTRY_URL
- [ ] Playground `.env.local` has correct VITE_REGISTRY_URL (if deploying)
- [ ] Both build without errors: `npm run build`
- [ ] Tested locally at http://localhost:5173
- [ ] Tested registration flow end-to-end
- [ ] Tested verification with registered identity  
- [ ] Tested revocation flow
- [ ] MetaMask connection working
- [ ] Deployed to Vercel
- [ ] Production URLs working
- [ ] Cross-dashboard verification working (if both deployed)

---

## Key Files Modified

### Dashboard
- `src/components/Dashboard.jsx` - 327 lines (was 464), now fully functional
- `src/context/WalletContext.jsx` - Uses SDL properly initialized
- `vite.config.js` - Externalize fs/canvas modules

### Playground  
- `src/pages/Register.jsx` - Uses useWallet hook for SDK
- `src/pages/Verify.jsx` - Uses useWallet hook for SDK
- `src/pages/Consent.jsx` - Uses useWallet hook for SDK
- `src/pages/Inspect.jsx` - Uses useWallet hook for SDK
- `src/context/WalletContext.jsx` - Initializes SDK from env variables
- `vite.config.js` - Externalize fs/canvas modules

---

## Summary

✅ **Dashboard**: Completely rebuilt with register/verify/revoke functionality
✅ **Playground**: Already working with all operations
✅ **Both**: Share same WalletContext and SDK initialization pattern
✅ **Configuration**: Single env var (VITE_REGISTRY_URL) to connect to server
✅ **Builds**: Both build successfully without errors
✅ **Deployment**: Ready for Vercel with Render backend

**Next step**: Set `.env.local` files and deploy! 🚀
