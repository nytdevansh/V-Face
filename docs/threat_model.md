# Threat Model & Security Analysis

## 1. Assets
- **User Privacy**: The raw biometric data (face image/vector) of the user.
- **Consent Integrity**: The assurance that a token represents true user intent.
- **System Availability**: The ability for the Registry to process requests.

## 2. Adversaries
- **Rogue AI Company**: Wants to use user faces without consent or for unauthorized purposes.
- **External Attacker**: Wants to steal identities or disrupt the service.
- **Malicious User**: Wants to effectively "DOS" the system with fake registrations.

## 3. Attack Vectors & Mitigations

### 3.1 Model Drift / Stability
**Threat**: The user registers today. Next week, lighting changes, simple quantization produces a different fingerprint. Access Denied.
**Mitigation**:
- **Preprocessing**: Strict alignment and normalization.
- **UX**: "Update Face ID" flow if verification fails but user can authenticate via other means (e.g., Email/Wallet).
- **Future**: LSH (Locality Sensitive Hashing) to allow fuzzy matching in the privacy-preserving domain.

### 3.2 Fingerprint Reversal (Inversion Attack)
**Threat**: Attacker gets the Registry database (fingerprints) and reconstructs the original faces.
**Mitigation**:
- **One-Way Process**: Embedding -> Quantize -> Hash.
- **Information Loss**: Quantization discards precise details needed for high-fidelity reconstruction.
- **Defense in Depth**: Registry does not store the quantization vector, only the *hash* of the vector. Providing the hash reveals nothing about the vector structure without brute-forcing the entire 512-d float space (infeasible).

### 3.3 SDK Tampering
**Threat**: Rogue Company modifies the SDK to bypass the "Request Consent" step and simply says "Authorized".
**Mitigation**:
- **Server-Side Verification**: The *Token* is signed by the Registry. The Company's backend (LLM) must verify the signature. A modified SDK cannot forge a valid Registry signature.
- **Trust Anchor**: The LLM/Service refuses to process a face unless accompanied by a valid, signed token for that specific fingerprint.

### 3.4 Middle-Man Attack (Relay)
**Threat**: Attacker intercepts a valid token for "User A" and sends it to "Company B".
**Mitigation**:
- **Audience Binding**: Token contains `aud: company_id`.
- **Company B** will reject the token because `aud` does not match its ID.

### 3.5 Replay Attack
**Threat**: Attacker captures a valid token and re-uses it later.
**Mitigation**:
- **Expiration**: Tokens have short `exp` times.
- **Nonce**: Uses `jti` (JWT ID) to prevent re-submission of the exact same token if utilizing a stateful check.

## 4. Residual Risks
- **Face Similarity Collisions**: Two different people producing the exact same quantized fingerprint.
  - *Risk Level*: Low/Medium (MobileFaceNet is decent, but not SOTA state-of-the-art).
  - *Mitigation*: User realizes they can't register because "already registered". System fails closed.
