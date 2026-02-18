# 🔧 Debugging Guide: Pages Unresponsive

## What I Fixed

Both Dashboard and Playground now have:
✅ Better error messages that actually display
✅ Separate webcam refs for each tab (no conflicts)
✅ Server connectivity check on page load
✅ Console logging for every step
✅ Proper error handling with try/catch

---

## Troubleshooting Steps

### 1. **Check the Browser Console**
This is CRITICAL for debugging. Open DevTools:
- **Chrome/Edge**: Press `F12` or `Ctrl+Shift+I` (Windows) / `Cmd+Option+I` (Mac)
- **Firefox**: Press `F12`
- Click the **Console** tab

Look for any red error messages. This will tell you exactly what's wrong.

### 2. **Check if Server is Running**
The dashboard needs the server to be running.

```bash
# In one terminal:
cd /Users/jadu/Desktop/oracle_db/V-face/server
npm start
# Should show: "🚀 V-Face Registry API running on port 3000"
```

Then test server is accessible:
```bash
curl http://localhost:3000/health
# Should return: {"status":"ok", ...}
```

If you get "Connection refused" → server isn't running. Start it!

### 3. **Check Model File is Loading**
The dashboard needs the ONNX model file from the server:

```bash
curl -I http://localhost:3000/model/mobilefacenet.onnx
# Should return HTTP 200
```

If fails → server isn't running (see step 2)

### 4. **Check Camera Permissions**
If "Capture" button doesn't work:
- Allow camera access when browser asks
- Try in a new incognito window
- Check browser settings > Privacy > Camera > Allow for localhost

### 5. **Common Error Messages and Solutions**

#### "Failed to capture image. Check camera permissions."
**Solution**: 
```
1. Click browser address bar
2. Look for camera icon
3. Click it, change to "Allow"
4. Reload page
5. Try capture again
```

#### "Cannot connect to server. Is it running at http://localhost:3000?"
**Solution**:
```bash
# Terminal 1:
cd /Users/jadu/Desktop/oracle_db/V-face/server && npm start

# Terminal 2:
cd /Users/jadu/Desktop/oracle_db/V-face/dashboard && npm run dev
```

#### "SDK not initialized. Check server connection."
**Solution**: Make sure:
1. Server is running on port 3000
2. Model file exists: `ls -lh model/mobilefacenet.onnx`
3. Browser can reach server: `curl http://localhost:3000/health`

#### "Registration failed. Check console for details."
**Solution**: Check browser console (F12 > Console tab) for the actual error

### 6. **Test Each Step Manually**

#### Is webcam working?
```javascript
// Paste in browser console (F12):
navigator.mediaDevices.getUserMedia({video:true})
  .then(stream => {
    console.log('✅ Webcam access granted');
    stream.getTracks().forEach(t => t.stop());
  })
  .catch(err => console.error('❌ Webcam denied:', err));
```

#### Is server responding?
```javascript
// Paste in browser console:
fetch('http://localhost:3000/health')
  .then(r => r.json())
  .then(d => console.log('✅ Server response:', d))
  .catch(e => console.error('❌ Server error:', e));
```

#### Is model loading?
```javascript
// Paste in browser console:
fetch('http://localhost:3000/model/mobilefacenet.onnx')
  .then(r => {
    console.log('✅ Model response:', r.status);
    return r.blob();
  })
  .then(b => console.log('✅ Model size:', (b.size/1024/1024).toFixed(1), 'MB'))
  .catch(e => console.error('❌ Model error:', e));
```

### 7. **Monitor Network Requests**
Open DevTools and go to **Network** tab:
1. Reload page
2. Try register/verify
3. You should see requests like:
   - `/health` (server check)
   - `/model/mobilefacenet.onnx` (4MB download)
   - `/register` (when registering)
   - `/search` (when verifying)

If requests are red (failed), click them to see why.

---

## Complete Startup Guide

### Terminal 1: Start Server
```bash
cd /Users/jadu/Desktop/oracle_db/V-face/server
npm start
```

Watch for these lines to confirm it's working:
```
🚀 V-Face Registry API running on port 3000
Connected to Registry database at ...
Server Public Key:
-----BEGIN PUBLIC KEY-----
...
-----END PUBLIC KEY-----
```

### Terminal 2: Start Dashboard
```bash
cd /Users/jadu/Desktop/oracle_db/V-face/dashboard
npm run dev
```

Should show:
```
VITE v7.3.1  ready in NNN ms

➜  Local:   http://localhost:5173/
```

### Open Dashboard
1. Click the `http://localhost:5173/` link or open in browser
2. Open DevTools (F12)
3. Go to **Console** tab
4. You should see logs like:
```
[HMR] connected
Dashboard mounted (or similar)
```

### Test Workflow
1. Click "CONNECT WALLET" button
2. MetaMask appears → approve connection
3. You should see address in navbar
4. Click "📸 Register" tab
5. Click "📸 Capture" button
6. Should show webcam feed
7. Click "Register" button
8. Should show fingerprint or error in console

---

## If Nothing Works

### Nuclear Option (Clear Everything)
```bash
# Clear node_modules and caches
cd /Users/jadu/Desktop/oracle_db/V-face
rm -rf dashboard/node_modules playground/node_modules server/node_modules
rm -rf dashboard/.vite playground/.vite server/.vite

# Reinstall
cd dashboard && npm install && npm run build
cd ../playground && npm install && npm run build
cd ../server && npm install

# Try again
cd ../server && npm start &
cd ../dashboard && npm run dev
```

### Check for Build Errors
```bash
cd /Users/jadu/Desktop/oracle_db/V-face/dashboard
npm run build
```

Should end with:
```
✓ 586 modules transformed
✓ built in 2.XX s
```

If you see red errors, screenshot them and share.

---

## Console Logging

Both apps now log every step. When things fail, check console for messages like:

**Dashboard:**
```
Server health check...
Could not connect to server at: http://localhost:3000
Initializing SDK...
Generating fingerprint...
Requesting wallet signature...
Registering with SDK...
Registration successful!
```

**Playground:**
```
Creating image element...
Getting fingerprint...
Requesting wallet signature...
Registering...
Registration successful:
```

---

## Modern Browsers Only

Make sure you're using:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

Older browsers won't work with WebGL/WebAssembly that the model needs.

---

## Environment Variables

Make sure these are set OR using defaults:

**Dashboard .env.local** (optional, has defaults):
```env
VITE_REGISTRY_URL=http://localhost:3000
VITE_MODEL_PATH=/model/mobilefacenet.onnx
```

If env vars are wrong, you'll see:
```
Cannot connect to server at: http://wrong-url-here
```

---

## File Checklist

Verify these files exist:
```bash
ls -lh /Users/jadu/Desktop/oracle_db/V-face/server/index.js
ls -lh /Users/jadu/Desktop/oracle_db/V-face/model/mobilefacenet.onnx  # ~24MB
ls -lh /Users/jadu/Desktop/oracle_db/V-face/dashboard/src/components/Dashboard.jsx
ls -lh /Users/jadu/Desktop/oracle_db/V-face/playground/src/pages/Register.jsx
```

---

## Questions?

When reporting issues, PLEASE include:
1. Browser console errors (F12 screenshot)
2. Network tab requests that failed (F12 screenshot)
3. Server terminal logs (what does it show?)
4. Which button you clicked when it failed
5. Operating system and browser version

Example good bug report:
```
I clicked "Capture" button and nothing happened.
Console shows: "Failed to capture image. Check camera permissions."
Server is running on :3000
Camera permission is allowed in browser
Using Chrome 120 on macOS
```

---

## Quick Checklist for Responsiveness

- [ ] Server running and responding to `/health`
- [ ] Model file downloadable from `/model/mobilefacenet.onnx`
- [ ] Browser console open (F12) with no JavaScript errors
- [ ] Camera permissions granted to localhost
- [ ] Wallet connected (MetaMask shows address)
- [ ] Buttons are clickable (hover shows :hover state)
- [ ] No red network requests in Network tab

If all above pass → pages should respond normally!

**If still unresponsive → check browser console for exact error message (screenshot it and share) 🔍**
