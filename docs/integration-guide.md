
# V-Face Integration Guide (Alpha)

V-Face provides a privacy-preserving biometric identity layer for AI agents and Web3 applications. This guide explains how to integrate the V-Face SDK into your application.

## 1. Installation

```bash
npm install @v-face/sdk
# or
yarn add @v-face/sdk
```

> **Note**: During Alpha, you may need to install from the GitHub repository or a local tarball.

## 2. Configuration

Initialize the SDK with your registry URL and model path. The model path should point to the `mobilefacenet.onnx` file served by your application.

```javascript
// sdk.js initialization
import { VFaceSDK } from '@v-face/sdk';

const sdk = new VFaceSDK({
    registryUrl: 'https://api.v-face.org', // or your self-hosted registry
    modelPath: '/model/mobilefacenet.onnx' // Path to ONNX model in public/static folder
});

export default sdk;
```

## 3. Core Concepts

- **Fingerprint**: A robust hash derived from the face embedding. Used for consistent identity lookup.
- **Embedding**: A 128-dimensional vector representing facial features. Used for similarity comparison. **Encrypted at rest.**
- **Similarity Threshold**: The minimum cosine similarity score (0.0 - 1.0) required to confirm a match. **Confirmed: 0.85**.

## 4. Usage Patterns

### A. Registration (Enrollment)

Capture a face image and register it with a public key (e.g., wallet address).

```javascript
// 1. Capture Image (from Webcam or File)
const image = document.getElementById('webcam-image');

// 2. Generate Biometric Data
const fingerprint = await sdk.getFingerprint(image);
const embedding = await sdk.getRawEmbedding(image);

// 3. Register with Backend
// (You must implement the API call to your registry)
const payload = {
    fingerprint,
    public_key: userWalletAddress,
    embedding: JSON.stringify(Array.from(embedding)),
    metadata: { ... }
};

await fetch('/register', { method: 'POST', body: JSON.stringify(payload) });
```

### B. Verification (Authentication)

Verify if a user matches a claimed identity.

```javascript
import { cosineSimilarity } from '@v-face/sdk';

async function verifyUser(claimedIdentity, freshImage) {
    // 1. Fetch Stored Embedding for Claimed Identity
    // The server should return the encrypted embedding for the provided fingerprint
    const response = await fetch('/check', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fingerprint: claimedFingerprint }) 
    });
    const record = await response.json();
    
    if (!record.exists) return { allowed: false, reason: 'Identity Not Found' };

    // 2. Generate Fresh Embedding
    const freshEmbedding = await sdk.getRawEmbedding(freshImage);

    // 3. Compare (Client-Side)
    // In production, decrypt the record.embedding first
    const storedEmbedding = new Float32Array(JSON.parse(record.embedding));
    const similarity = cosineSimilarity(freshEmbedding, storedEmbedding);

    // 4. Decision
    const THRESHOLD = 0.85; // Empirically derived for this model
    if (similarity > THRESHOLD) {
        return { allowed: true, similarity };
    } else {
        return { allowed: false, similarity, reason: 'Biometric Mismatch' };
    }
}
```

## 5. Deployment Considerations

- **Model File**: Ensure `mobilefacenet.onnx` matches the version used in testing.
- **HTTPS**: Webcam access requires a secure context (HTTPS) in modern browsers.
- **Security**: 
    - Never expose raw embeddings in public logs.
    - Encrypt embeddings in your database (the V-Face server schematic includes an encrypted BLOB field).
    - Handle revocation requests immediately.
