# System Architecture & Trust Boundaries

## Overview
V-Face is a consent infrastructure consisting of a client-side SDK for privacy-preserving biometric fingerprinting and a centralized (verified) Registry API for consent management.

## High-Level Data Flow

```mermaid
sequenceDiagram
    participant User as User Device
    participant SDK as FaceGuard SDK (in App)
    participant Registry as Registry API
    participant LLM as AI Company System

    Note over SDK: Local Processing Only
    User->>SDK: Face Image
    SDK->>SDK: 1. Generate Embedding (ONNX)
    SDK->>SDK: 2. Quantize & Hash -> Fingerprint
    
    rect rgb(240, 255, 240)
        Note right of SDK: Registration
        SDK->>Registry: Register(Fingerprint, PublicKey)
    end

    rect rgb(240, 240, 255)
        Note right of SDK: Consent Flow
        SDK->>Registry: RequestConsent(Fingerprint, Scope)
        Registry->>User: Request Approval (OTP/Wallet)
        User->>Registry: Approve
        Registry->>SDK: Signed Consent Token
    end

    rect rgb(255, 240, 240)
        Note right of SDK: Usage
        SDK->>LLM: Send(Data + Consent Token)
        LLM->>LLM: Verify Token Signature
        LLM->>LLM: Execute AI Model
    end
```

## Trust Boundaries

### 1. SDK (Client/Company Side)
**Trusted To:**
- Run the canonical embedding model correctly.
- Execute `fingerprint()` logic deterministically.
- Not leak raw biometric vectors to the AI Company (by design, though running in their environment).

**NOT Trusted To:**
- Write directly to the Registry database.
- Issue consent tokens.

### 2. Registry Server
**Trusted To:**
- Store non-reversible fingerprints securely.
- Authenticate Users (via OTP/Keys).
- Sign Consent Tokens correctly.
- Enforce revocation lists.

**NOT Trusted To:**
- Store raw images.
- Store raw embedding vectors (vectors are never sent to registry).

### 3. User Device
**Trusted To:**
- Generate keys.
- Approve consent requests.
