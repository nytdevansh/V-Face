"""
V-Face Matching Service — Cryptography Utilities

Handles AES-256-GCM decryption of embeddings received from the Node.js API.
Supports versioned payloads: 'v{n}:iv:authTag:ciphertext'
"""

import os
import json
import ctypes
import logging
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

logger = logging.getLogger("matching.crypto")


def _get_key(version: int = 1) -> bytes:
    """Resolve encryption key by version."""
    versioned = os.getenv(f"VFACE_ENCRYPTION_KEY_V{version}")
    if versioned:
        return bytes.fromhex(versioned)

    main_key = os.getenv("VFACE_ENCRYPTION_KEY")
    if main_key:
        return bytes.fromhex(main_key)

    raise ValueError(f"No encryption key found for version {version}")


def decrypt_embedding(encrypted_payload: str) -> list[float]:
    """
    Decrypt an AES-256-GCM encrypted embedding.
    
    Supports two formats:
      - Versioned: 'v{n}:iv_hex:authTag_hex:ciphertext_hex'
      - Legacy:    'iv_hex:authTag_hex:ciphertext_hex'
    
    Returns a list of floats (the embedding vector).
    """
    parts = encrypted_payload.split(":")

    if parts[0].startswith("v") and len(parts) == 4:
        version = int(parts[0][1:])
        iv_hex, tag_hex, ct_hex = parts[1], parts[2], parts[3]
    elif len(parts) == 3:
        version = 1
        iv_hex, tag_hex, ct_hex = parts[0], parts[1], parts[2]
    else:
        raise ValueError(f"Unknown payload format: {len(parts)} parts")

    key = _get_key(version)
    iv = bytes.fromhex(iv_hex)
    tag = bytes.fromhex(tag_hex)
    ciphertext = bytes.fromhex(ct_hex)

    # AES-GCM: ciphertext + tag are concatenated for decryption
    aesgcm = AESGCM(key)
    plaintext = aesgcm.decrypt(iv, ciphertext + tag, None)

    embedding = json.loads(plaintext.decode("utf-8"))

    # Securely zero the plaintext bytes
    secure_zero(plaintext)

    return embedding


def secure_zero(data: bytes):
    """Best-effort secure memory zeroing."""
    try:
        ctypes.memset(id(data) + bytes.__basicsize__, 0, len(data))
    except Exception:
        pass  # Not critical — Python GC will handle it
