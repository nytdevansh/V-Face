/**
 * V-FACE Offline Verification Module
 * Caches the user's own encrypted embedding in IndexedDB after first registration.
 * Enables face verification without internet connectivity.
 *
 * Security model:
 *   - Embedding is AES-256-GCM encrypted before IndexedDB storage
 *   - Encryption key derived from wallet signature (user must sign to unlock)
 *   - Local verification shows "LOCAL" badge (not chain-verified)
 *   - Sync with chain on next online event
 */

const DB_NAME    = 'vface_offline';
const DB_VERSION = 1;
const STORE_NAME = 'embeddings';

// ── IndexedDB Setup ──────────────────────────────────────────────────────────

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'wallet' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

async function idbGet(wallet) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(wallet);
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

async function idbSet(record) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE_NAME, 'readwrite');
    const req = tx.objectStore(STORE_NAME).put(record);
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

async function idbDelete(wallet) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE_NAME, 'readwrite');
    const req = tx.objectStore(STORE_NAME).delete(wallet);
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });
}

// ── AES-GCM using Web Crypto (derive key from wallet signature) ──────────────

async function deriveKey(walletAddress, signature) {
  // Key material: wallet address + signature bytes
  const raw = new TextEncoder().encode(walletAddress + signature);
  const keyMaterial = await crypto.subtle.importKey('raw', raw, 'PBKDF2', false, ['deriveKey']);

  const salt = new TextEncoder().encode('vface-offline-v1');
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

async function encryptEmbedding(embedding, key) {
  const iv        = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = new TextEncoder().encode(JSON.stringify(embedding));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext);
  return {
    iv:         Array.from(iv),
    ciphertext: Array.from(new Uint8Array(ciphertext)),
  };
}

async function decryptEmbedding(encrypted, key) {
  const iv         = new Uint8Array(encrypted.iv);
  const ciphertext = new Uint8Array(encrypted.ciphertext);
  const plaintext  = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
  return JSON.parse(new TextDecoder().decode(plaintext));
}

// ── Cosine Similarity ────────────────────────────────────────────────────────

function cosineSimilarity(a, b) {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot   += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Cache the user's embedding locally after successful online registration.
 * Call this from the register flow after server confirms registration.
 *
 * @param {string}   wallet     — user's wallet address
 * @param {string}   signature  — wallet signature (used as key material)
 * @param {number[]} embedding  — raw 128-d float array
 * @param {string}   fingerprint — Blake3 fingerprint
 */
export async function cacheEmbeddingLocally(wallet, signature, embedding, fingerprint) {
  const key       = await deriveKey(wallet, signature);
  const encrypted = await encryptEmbedding(embedding, key);

  await idbSet({
    wallet,
    fingerprint,
    encrypted,
    cachedAt:   Date.now(),
    syncedAt:   Date.now(),
    version:    'mobilefacenet_v1',
  });

  console.log('[Offline] Embedding cached for', wallet);
}

/**
 * Verify face against locally cached embedding (no internet needed).
 *
 * @param {string}   wallet     — user's wallet address
 * @param {string}   signature  — wallet signature (unlocks local key)
 * @param {number[]} liveEmbedding — fresh embedding from webcam
 * @param {number}   threshold  — similarity threshold (default: 0.75)
 * @returns {{ verified, similarity, mode, cachedAt }}
 */
export async function verifyOffline(wallet, signature, liveEmbedding, threshold = 0.75) {
  const record = await idbGet(wallet);
  if (!record) {
    throw new Error('No cached embedding found. Connect to internet and verify once to enable offline mode.');
  }

  const key            = await deriveKey(wallet, signature);
  const cachedEmbedding = await decryptEmbedding(record.encrypted, key);

  const similarity = cosineSimilarity(liveEmbedding, cachedEmbedding);
  const verified   = similarity >= threshold;

  return {
    verified,
    similarity:  parseFloat(similarity.toFixed(4)),
    mode:        'local',             // UI should show "LOCAL" badge
    fingerprint: record.fingerprint,
    cachedAt:    record.cachedAt,
    syncedAt:    record.syncedAt,
    message:     verified
      ? 'Identity verified locally (offline mode)'
      : 'Face does not match cached identity',
  };
}

/**
 * Update the sync timestamp after a successful online verification.
 */
export async function markSynced(wallet) {
  const record = await idbGet(wallet);
  if (!record) return;
  await idbSet({ ...record, syncedAt: Date.now() });
}

/**
 * Clear locally cached embedding (e.g., on logout or revocation).
 */
export async function clearLocalCache(wallet) {
  await idbDelete(wallet);
  console.log('[Offline] Cache cleared for', wallet);
}

/**
 * Check if offline mode is available for a wallet.
 */
export async function isOfflineModeAvailable(wallet) {
  const record = await idbGet(wallet);
  return !!record;
}

/**
 * React hook for offline verification status (use in components).
 */
export function useOfflineMode(wallet) {
  const [available,  setAvailable]  = useState(false);
  const [isOnline,   setIsOnline]   = useState(navigator.onLine);

  useEffect(() => {
    if (!wallet) return;
    isOfflineModeAvailable(wallet).then(setAvailable);

    const handleOnline  = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online',  handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online',  handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [wallet]);

  return { available, isOnline, offlineModeReady: available && !isOnline };
}
