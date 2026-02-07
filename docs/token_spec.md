# Consent Token Specification v1.0

## Overview
The Consent Token is a signed JSON Web Token (JWT) that proves a user has explicitly authorized a specific AI company to use their face data for a defined purpose and duration.

## 1. Token Format
- **Standard**: JWT (RFC 7519)
- **Signing Algorithm**: EdDSA (Ed25519) or ES256 (ECDSA P-256)
- **Issuer**: V-Face Registry

## 2. Payload Schema

```json
{
  // --- Standard Claims ---
  "iss": "https://registry.v-face.org",   // Issuer
  "sub": "0x7a2...3f1",                   // Subject: User's Public Key / ID
  "aud": "company_12345",                 // Audience: Company ID
  "iat": 1678900000,                      // Issued At (Timestamp)
  "exp": 1678903600,                      // Expiration (Timestamp)
  "jti": "uuid-v4-unique-id",             // JWT ID (Nonce)

  // --- Custom Claims ---
  "vf_fp": "a1b2c3d4...",                 // Fingerprint Hash (The identity being consented)
  "vf_scope": [                           // Allowed Actions
    "auth:login",
    "video:generation"
  ],
  "vf_model_v": "mobilefacenet_v1"        // Embedding Model Version
}
```

## 3. Lifecycle

### 3.1 Request
The SDK initiates a request:
```http
POST /consent/request
{
  "fingerprint": "...",
  "company_id": "...",
  "scope": ["auth:login"],
  "duration_seconds": 3600
}
```

### 3.2 Approval
The Registry contacts the User (via App/Wallet/Email).
User: "Allow 'Acme AI' to use my face for 'Login' for '1 Hour'?"
-> [APPROVE]

### 3.3 Issuance
Registry signs the token using its Private Key.
Returns `token` to SDK.

### 3.4 Verification
The AI Company's backend receives the token.
It MUST verify:
1.  **Signature**: Validates against Registry Public Key.
2.  **Audience (`aud`)**: Matches their Company ID.
3.  **Expiration (`exp`)**: Token is not expired.
4.  **Fingerprint (`vf_fp`)**: Matches the fingerprint of the face currently being processed.

## 4. Revocation
Since JWTs are stateless, immediate revocation requires a blocklist or short expiration times.
- **Strategy**: 
  - Short-lived tokens (e.g., 5-15 mins) + Refresh Tokens.
  - OR: API endpoint `POST /check_revocation` for critical actions.

## 5. Scope Definitions
- `auth:login`: One-time verification for login.
- `video:generation`: Permission to generate video content using the face.
- `training:fine_tune`: Permission to use face for model fine-tuning (High Risk).
