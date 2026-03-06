/**
 * V-FACE IPFS Storage Layer
 * Stores encrypted embeddings on IPFS (via web3.storage or Pinata).
 * Only the CID is stored on-chain — embedding stays decentralized.
 *
 * Architecture:
 *   1. Encrypt embedding (AES-256-GCM) — existing server/encryption.js
 *   2. Pack into IPFS-ready JSON envelope
 *   3. Pin to IPFS → get CID
 *   4. Store CID in Qdrant payload + on-chain
 *   5. On retrieval: fetch from IPFS by CID → decrypt → use
 *
 * Provider support:
 *   - web3.storage (w3up client) — recommended, free tier generous
 *   - Pinata — reliable, IPFS + Filecoin redundancy
 *   - Local IPFS node — for self-hosted setups
 */

import { create } from '@web3-storage/w3up-client';
import { StoreMemory } from '@web3-storage/w3up-client/stores/memory';
import PinataClient from '@pinata/sdk';

const PROVIDER = process.env.IPFS_PROVIDER || 'web3storage'; // 'web3storage' | 'pinata' | 'local'
const PINATA_API_KEY    = process.env.PINATA_API_KEY    || '';
const PINATA_API_SECRET = process.env.PINATA_API_SECRET || '';
const W3_DELEGATION_KEY = process.env.W3_DELEGATION_KEY || '';  // from `w3 key create`
const LOCAL_IPFS_API    = process.env.LOCAL_IPFS_API    || 'http://localhost:5001';

// ── Provider Abstraction ─────────────────────────────────────────────────────

class Web3StorageProvider {
  constructor() { this.client = null; }

  async init() {
    this.client = await create({ store: new StoreMemory() });
    // In production: load delegation from env or file
    // await this.client.addProof(delegation);
  }

  async pin(json) {
    if (!this.client) await this.init();
    const blob = new Blob([JSON.stringify(json)], { type: 'application/json' });
    const file = new File([blob], 'embedding.json');
    const cid  = await this.client.uploadFile(file);
    return cid.toString();
  }

  async fetch(cid) {
    const url = `https://${cid}.ipfs.w3s.link/embedding.json`;
    const res = await globalThis.fetch(url);
    if (!res.ok) throw new Error(`IPFS fetch failed: ${res.status}`);
    return res.json();
  }
}

class PinataProvider {
  constructor() {
    this.client = new PinataClient({
      pinataApiKey:    PINATA_API_KEY,
      pinataSecretApiKey: PINATA_API_SECRET,
    });
  }

  async pin(json) {
    const result = await this.client.pinJSONToIPFS(json, {
      pinataMetadata: { name: `vface-embedding-${Date.now()}` },
      pinataOptions:  { cidVersion: 1 },
    });
    return result.IpfsHash;
  }

  async fetch(cid) {
    const url = `https://gateway.pinata.cloud/ipfs/${cid}`;
    const res = await globalThis.fetch(url);
    if (!res.ok) throw new Error(`Pinata fetch failed: ${res.status}`);
    return res.json();
  }
}

class LocalIPFSProvider {
  async pin(json) {
    const res = await globalThis.fetch(`${LOCAL_IPFS_API}/api/v0/add`, {
      method: 'POST',
      body: (() => {
        const fd = new FormData();
        fd.append('file', new Blob([JSON.stringify(json)]));
        return fd;
      })(),
    });
    const data = await res.json();
    return data.Hash;
  }

  async fetch(cid) {
    const res = await globalThis.fetch(`${LOCAL_IPFS_API}/api/v0/cat?arg=${cid}`);
    if (!res.ok) throw new Error(`Local IPFS fetch failed: ${res.status}`);
    return res.json();
  }
}

function getProvider() {
  switch (PROVIDER) {
    case 'pinata':      return new PinataProvider();
    case 'local':       return new LocalIPFSProvider();
    default:            return new Web3StorageProvider();
  }
}

const ipfs = getProvider();


// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Store an encrypted embedding on IPFS.
 * Returns the CID to be anchored on-chain.
 *
 * @param {object} encryptedEmbedding  — from server/encryption.js { ciphertext, iv, tag, keyVersion }
 * @param {string} fingerprint         — Blake3 fingerprint (non-reversible identifier)
 * @param {string} walletAddress       — registrant's wallet
 * @returns {string} IPFS CID
 */
export async function storeEmbeddingIPFS(encryptedEmbedding, fingerprint, walletAddress) {
  const envelope = {
    version:    '1.0',
    protocol:   'v-face',
    fingerprint: fingerprint,          // public — for Qdrant lookup
    wallet:     walletAddress,
    embedding:  encryptedEmbedding,   // encrypted blob — private until decrypted
    storedAt:   new Date().toISOString(),
  };

  const cid = await ipfs.pin(envelope);
  console.log(`[IPFS] Stored embedding: CID=${cid}`);
  return cid;
}

/**
 * Retrieve and decrypt an embedding from IPFS by CID.
 *
 * @param {string} cid        — IPFS content identifier
 * @param {Function} decrypt  — decryption function from server/encryption.js
 * @returns {number[]} raw 128-d embedding
 */
export async function fetchEmbeddingIPFS(cid, decrypt) {
  const envelope = await ipfs.fetch(cid);

  if (envelope.protocol !== 'v-face') {
    throw new Error('[IPFS] Invalid V-FACE envelope');
  }

  const raw = await decrypt(envelope.embedding);
  return raw;
}

/**
 * Verify a CID is reachable (health check / pin status).
 */
export async function verifyCIDReachable(cid) {
  try {
    await ipfs.fetch(cid);
    return { reachable: true, cid };
  } catch (err) {
    return { reachable: false, cid, error: err.message };
  }
}

export { ipfs };
