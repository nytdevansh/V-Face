# V-Face SDK

Privacy-preserving biometric identity protocol for Web3 applications. The SDK provides a unified API for face enrollment, identity verification, and consent management.

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [API Reference](#api-reference)
- [Examples](#examples)
- [Deployment](#deployment)
- [Contributing](#contributing)

## Installation

### npm

```bash
npm install @v-face/sdk
```

### Browser (via CDN)

```html
<script src="https://cdn.jsdelivr.net/npm/@v-face/sdk@latest/dist/v-face.umd.js"></script>
```

## Quick Start

### Browser Usage

```javascript
import { VFaceSDK } from '@v-face/sdk';

const sdk = new VFaceSDK({
    registryUrl: 'https://api.v-face.io'
});

// Initialize the SDK (loads face embedding model)
await sdk.init();

// Get fingerprint from a face image
const imageElement = document.querySelector('img#my-photo');
const fingerprint = await sdk.getFingerprint(imageElement);

// Register the identity
const result = await sdk.register(imageElement, '0xYourWalletAddress', {
    name: 'Alice',
    email: 'alice@example.com'
});

console.log(`Registered with fingerprint: ${result.fingerprint}`);
```

### Node.js Usage

```javascript
import { VFaceSDK } from '@v-face/sdk';
import { createCanvas } from 'canvas';
import fs from 'fs';

const sdk = new VFaceSDK({
    registryUrl: 'https://api.v-face.io',
    modelPath: './model/mobilefacenet.onnx'
});

await sdk.init();

// Load image and create canvas
const imageBuffer = fs.readFileSync('./face.jpg');
const canvas = createCanvas(112, 112);
// ... draw image to canvas

const fingerprint = await sdk.getFingerprint(canvas);
const result = await sdk.register(canvas, '0xUserAddress');
```

## API Reference

### VFaceSDK

Main class for interacting with the V-Face protocol.

#### Constructor

```javascript
new VFaceSDK(config?: {
    registryUrl?: string;  // Default: http://localhost:3000
    modelPath?: string;    // Default: /model/mobilefacenet.onnx
})
```

#### Methods

##### `init(): Promise<void>`

Initialize the SDK by loading the face embedding model.

```javascript
await sdk.init();
```

##### `getFingerprint(imageSource): Promise<string>`

Generate a 64-character deterministic fingerprint from a face image.

```javascript
const fingerprint = await sdk.getFingerprint(imageElement);
// Output: "a1b2c3d4e5f6g7h8..."
```

**Parameters:**
- `imageSource` (HTMLImageElement | HTMLCanvasElement | Canvas) - Face image

**Returns:** 64-character hex string

##### `getRawEmbedding(imageSource): Promise<Float32Array>`

Get the raw 128-dimensional embedding vector from a face image.

```javascript
const embedding = await sdk.getRawEmbedding(imageElement);
// Output: Float32Array(128) with values between -1 and 1
```

##### `register(imageSource, publicKey, metadata?): Promise<RegistrationResult>`

Full registration pipeline: process face image and register identity.

```javascript
const result = await sdk.register(imageElement, '0xWalletAddress', {
    username: 'alice',
    timestamp: Date.now()
});
// Returns: { success: true, fingerprint: "...", id: 1 }
```

**Parameters:**
- `imageSource` (HTMLImageElement | HTMLCanvasElement) - Face image
- `publicKey` (string) - Wallet address or public key
- `metadata` (object, optional) - Additional metadata

**Returns:**
```javascript
{
    success: boolean,
    fingerprint: string,
    id?: number
}
```

##### `check(fingerprint): Promise<CheckResult>`

Check if a fingerprint is registered and get its details.

```javascript
const result = await sdk.check(fingerprint);
// Returns: { exists: true, revoked: false, public_key: "0x...", createdAt: 1704067200000 }
```

**Returns:**
```javascript
{
    exists: boolean,
    revoked?: boolean,
    public_key?: string,
    createdAt?: number
}
```

##### `search(imageSource, threshold?): Promise<SearchResult>`

Find similar faces in the registry using cosine similarity.

```javascript
const result = await sdk.search(imageElement, 0.85);
// Returns: { matches: [{ fingerprint: "...", similarity: 0.92 }, ...] }
```

**Parameters:**
- `imageSource` (HTMLImageElement | HTMLCanvasElement) - Face image to search for
- `threshold` (number, optional) - Minimum similarity score (0-1). Default: 0.85

**Returns:**
```javascript
{
    matches: Array<{
        fingerprint: string,
        similarity: number  // 0-1
    }>
}
```

##### `requestConsent(fingerprint, companyId, scope, duration): Promise<ConsentRequest>`

Request consent from an identity owner.

```javascript
const request = await sdk.requestConsent(
    fingerprint,
    'my-company',
    ['auth:login', 'profile:read'],
    3600  // seconds
);
// Returns: { status: "pending_user_approval", request_id: "req_..." }
```

**Returns:**
```javascript
{
    status: string,
    request_id: string
}
```

##### `approveConsent(requestId, fingerprint): Promise<ConsentApproval>`

Approve a pending consent request and receive a JWT token.

```javascript
const approval = await sdk.approveConsent(requestId, fingerprint);
// Returns: { success: true, token: "eyJhbGc..." }
```

**Returns:**
```javascript
{
    success: boolean,
    token: string  // JWT token
}
```

##### `verifyToken(token): Promise<TokenVerification>`

Verify a consent JWT token.

```javascript
const result = await sdk.verifyToken(token);
// Returns: { valid: true, claims: { aud: "company", vf_fp: "...", exp: 1704070800 } }
```

**Returns:**
```javascript
{
    valid: boolean,
    claims?: {
        aud: string,          // audience (company)
        vf_fp: string,        // fingerprint
        scope: string[],      // permissions
        iat: number,          // issued at
        exp: number           // expiration
    },
    reason?: string  // error reason if invalid
}
```

##### `revoke(fingerprint, signature, message): Promise<RevokeResult>`

Revoke an identity with signed proof of ownership.

```javascript
const message = {
    action: 'revoke',
    fingerprint: '...',
    timestamp: Date.now(),
    nonce: Math.random()
};

const signature = await web3Provider.signMessage(JSON.stringify(message));

const result = await sdk.revoke(fingerprint, signature, message);
// Returns: { success: true }
```

### Registry

Low-level HTTP client for Registry API.

```javascript
import { Registry } from '@v-face/sdk';

const registry = new Registry('http://localhost:3000');
const result = await registry.register(fingerprint, publicKey, embedding, metadata);
```

### Utility Functions

#### `cosineSimilarity(a, b): number`

Compute cosine similarity between two vectors.

```javascript
import { cosineSimilarity } from '@v-face/sdk';

const similarity = cosineSimilarity(embedding1, embedding2);
// Returns: number between -1 and 1
```

#### `generateFingerprint(embedding, salt?): Promise<string>`

Generate a fingerprint from a raw embedding (low-level API).

```javascript
import { generateFingerprint } from '@v-face/sdk';

const fingerprint = await generateFingerprint(embedding);
const saltedFingerprint = await generateFingerprint(embedding, 'service-salt');
```

## Examples

### Complete Registration Flow

```javascript
import { VFaceSDK } from '@v-face/sdk';

const sdk = new VFaceSDK();
await sdk.init();

try {
    // 1. Capture face image (you implement UI)
    const faceImage = await captureUserFace();

    // 2. Register
    const registration = await sdk.register(
        faceImage,
        userWalletAddress,
        { username: username }
    );

    if (registration.success) {
        console.log('✅ Registered:', registration.fingerprint);
        // Save fingerprint to local storage or backend
        localStorage.setItem('v-face-fingerprint', registration.fingerprint);
    }
} catch (error) {
    console.error('Registration failed:', error.message);
}
```

### Biometric Authentication

```javascript
async function authenticate() {
    const sdk = new VFaceSDK();
    await sdk.init();

    const storedFingerprint = localStorage.getItem('v-face-fingerprint');
    const faceImage = await captureUserFace();

    const result = await sdk.search(faceImage, 0.9);  // High threshold for auth

    const match = result.matches.find(m => m.fingerprint === storedFingerprint);

    if (match && match.similarity > 0.95) {
        console.log('✅ Authentication successful');
        return true;
    } else {
        console.log('❌ Face does not match');
        return false;
    }
}
```

### Consent Management

```javascript
async function requestAndApproveConsent() {
    const sdk = new VFaceSDK();

    // 1. Company requests consent
    const consentRequest = await sdk.requestConsent(
        userFingerprint,
        'my-company',
        ['profile:read', 'auth:login'],
        86400  // 24 hours
    );

    // 2. User approves (on their device)
    const approval = await sdk.approveConsent(
        consentRequest.request_id,
        userFingerprint
    );

    // 3. Verify token
    const verified = await sdk.verifyToken(approval.token);
    if (verified.valid) {
        console.log('✅ User authorized for:', verified.claims.scope);
    }
}
```

## Deployment

### Prerequisites

1. **Node.js** 16+ for the SDK
2. **ONNX Model File** - Place at `/model/mobilefacenet.onnx`
3. **Registry Server** - Running V-Face Registry API (see server documentation)

### Setting Up the Model

The SDK requires the MobileFaceNet ONNX model:

```bash
# Option 1: Download pre-built model
wget https://v-face-cdn.s3.amazonaws.com/models/mobilefacenet.onnx -O ./model/mobilefacenet.onnx

# Option 2: Convert from source (requires Python)
python3 scripts/convert_model.py
```

### Browser Deployment

For production browser deployments:

1. Include the SDK via CDN or bundler:
```html
<script src="https://cdn.jsdelivr.net/npm/@v-face/sdk"></script>
```

2. Configure registry URL:
```javascript
const sdk = new VFaceSDK({
    registryUrl: 'https://api.v-face.io',
    modelPath: 'https://cdn-models.v-face.io/mobilefacenet.onnx'
});
```

3. Add CORS headers on registry server for model loading

### Node.js Deployment

```javascript
import { VFaceSDK } from '@v-face/sdk';

const sdk = new VFaceSDK({
    registryUrl: process.env.VFACE_REGISTRY_URL || 'http://localhost:3000',
    modelPath: process.env.MODEL_PATH || './model/mobilefacenet.onnx'
});
```

### Security Considerations

1. **Face Data**: Never store face images or embeddings on the client
2. **Fingerprints**: Fingerprints are deterministic hashes - not reversible to faces
3. **Private Keys**: Keep wallet private keys secure when signing revocation messages
4. **HTTPS Only**: Always use HTTPS in production
5. **Model Validation**: The SDK validates model file size to prevent stub attacks

## Error Handling

```javascript
import { VFaceSDK, RegistryError } from '@v-face/sdk';

try {
    await sdk.register(image, publicKey);
} catch (error) {
    if (error instanceof RegistryError) {
        console.error(`Registry error [${error.statusCode}]: ${error.message}`);
        if (error.statusCode === 409) {
            console.log('This identity is already registered');
        }
    } else {
        console.error('Unexpected error:', error.message);
    }
}
```

## Testing

```bash
# Unit tests
npm test

# Integration tests (requires running server)
npm run test:integration

# Robustness tests
npm run robustness
```

## License

GPL-3.0 — See LICENSE file

## Contributing

See CONTRIBUTING.md for guidelines.
