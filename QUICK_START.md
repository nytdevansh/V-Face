# 🚀 Quick Start: Test Dashboard & Playground

## Start All 3 Services (Copy & Paste)

### Terminal 1: Server
```bash
cd /Users/jadu/Desktop/oracle_db/V-face/server
npm start
# ✅ Server running on http://localhost:3000
# ✅ Model available at http://localhost:3000/model/mobilefacenet.onnx
# ✅ Database: /Users/jadu/Desktop/oracle_db/V-face/server/data/registry.db
```

### Terminal 2: Dashboard
```bash
cd /Users/jadu/Desktop/oracle_db/V-face/dashboard
npm run dev
# ✅ Dashboard running on http://localhost:5173
# ✅ Click "Open in browser" or visit manually
```

### Terminal 3: Playground (Optional)
```bash
cd /Users/jadu/Desktop/oracle_db/V-face/playground
npm run dev
# ✅ Playground running on http://localhost:5174
```

---

## Testing Checklist

### 1. Dashboard Register
- [ ] Open http://localhost:5173
- [ ] Click "Connect Wallet" (MetaMask or testnet)
- [ ] Click "📸 Register" tab
- [ ] Click "📸 Capture" to take webcam photo
- [ ] Click "Register" button
- [ ] Should show: "✅ Registered" + fingerprint
- [ ] Click "🗑️ Revoke" to test deletion

### 2. Dashboard Verify
- [ ] Click "✅ Verify" tab
- [ ] Click "📸 Capture" with same face
- [ ] Click "Verify" button
- [ ] Should show "✅ Match Found!" (92%+ similarity)

### 3. Cross-App Test (if both running)
- [ ] Register in Dashboard
- [ ] Go to Playground (http://localhost:5174)
- [ ] Go to "Register" tab → should see you can register again
- [ ] Go to "Verify" tab → scan your face → should show match from Dashboard

### 4. Verify Deletion
- [ ] In Playlist Verify or Dashboard Verify
- [ ] Try to verify a revoked face
- [ ] Should show "❌ No Match"

---

## What Each App Does

### 🖥️ Dashboard (`http://localhost:5173`)
Simple 2-tab interface:
- **Register**: Take photo → Register identity → Shows fingerprint → Can revoke
- **Verify**: Take photo → Check if matches any registered → Results

### 🎮 Playground (`http://localhost:5174`)  
Full-featured 4-tab interface:
- **Register**: Register with details
- **Verify**: Verify identity
- **Consent**: JWT consent management
- **Inspect**: Decode and validate JWT tokens

### 🔗 Server (`http://localhost:3000`)
Backend that serves:
- Registry API (`/register`, `/search`, `/check`, `/revoke`)
- Model file (`/model/mobilefacenet.onnx`)
- JWT tokens
- Database

---

## Expected Behavior

### ✅ Register Should Show
```
Fingerprint: 68a2c0f1e9b8a7d2...
Owner: 0x742d35Cc6634C0532925a3b844Bc92e4f7...
✅ Registered!
[🗑️ Revoke Button]
```

### ✅ Verify Should Show (Same Face)
```
✅ Match Found!
Similarity: 92.3% Match
Fingerprint: 68a2c0f1e9b8a7d2...
```

### ✅ Verify Should Show (Different Face)
```
❌ No Match
Face not in registry
```

### ✅ After Revoke
```
Identity Revoked
[Verify again shows "No Match"]
```

---

## Troubleshooting

### Dashboard Shows "SDK not initialized"
```bash
# Check server is running
curl http://localhost:3000/health

# Check model file is accessible
curl -I http://localhost:3000/model/mobilefacenet.onnx
# Should get HTTP 200
```

### MetaMask Not Connecting
- [ ] Check extension is installed in Chrome/Firefox
- [ ] Check you're on right network (any testnet works)
- [ ] Check browser console (DevTools > Console tab)
- [ ] Try different account in wallet

### No Webcam Access
- [ ] Check browser permissions (allow camera access)
- [ ] Check you're on HTTPS or localhost (browser security)
- [ ] Try incognito window

### "No Match" When Should Match
- Try again with same lighting
- Different angle may affect accuracy
- Threshold is 75% (edit code to increase if needed)

---

## Build for Production

### Build Dashboard
```bash
cd /Users/jadu/Desktop/oracle_db/V-face/dashboard
npm run build
# Creates dist/ folder
# ✅ 586 modules transformed
# ✅ Ready for Vercel
```

### Build Playground  
```bash
cd /Users/jadu/Desktop/oracle_db/V-face/playground
npm run build
# Creates dist/ folder
# ✅ 192 modules transformed
# ✅ Ready for Vercel
```

---

## Deploy to Vercel

### Just Dashboard
```bash
cd dashboard
vercel deploy --prod
# Follow prompts
# Get URL like: https://dashboard-xyz.vercel.app
```

### Dashboard + Playground  
```bash
cd dashboard && vercel deploy --prod
cd ../playground && vercel deploy --prod --name playground
```

---

## Key Files (What Changed)

- ✅ `dashboard/src/components/Dashboard.jsx` - Rebuilt (464→327 lines)
- ✅ `dashboard/src/context/WalletContext.jsx` - Uses env vars
- ✅ `playground/src/context/WalletContext.jsx` - Uses env vars
- ✅ `server/index.js` - Serves model file (+10 lines)
- ✅ Both `vite.config.js` - Externalize fs/canvas
- ✅ Both `.env.example` - Production URLs

---

## Environment Setup

### For Local Testing
Dashboard/Playground automatically use:
```env
VITE_REGISTRY_URL=http://localhost:3000
VITE_MODEL_PATH=/model/mobilefacenet.onnx
```

### For Production (Render + Vercel)
Update `.env.local` before deploying:
```env
VITE_REGISTRY_URL=https://your-render-server.onrender.com
VITE_MODEL_PATH=/model/mobilefacenet.onnx
```

---

## 📊 Expected Performance

| Operation | Time | Notes |
|-----------|------|-------|
| Load Dashboard | 2-3s | Model downloads first load |
| Register Face | 3-5s | Generate fingerprint + upload |
| Verify Face | 2-4s | Generate fingerprint + search |
| Model Cache | 1s | Cached after first load |

---

## ✨ That's It!

Both Dashboard and Playground are **fully functional** and ready to use.

1 ✅ Start server
2. ✅ Start dashboard
3. ✅ Test register/verify/revoke
4. ✅ Deploy to Vercel

**All done!** 🎉
