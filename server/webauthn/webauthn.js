/**
 * V-FACE WebAuthn MFA
 * Second factor: something you HAVE (YubiKey, TouchID, Windows Hello)
 * Combined with: something you ARE (face biometric)
 *
 * Flow:
 *   Registration:  Face verify → WebAuthn register credential → Store credentialId
 *   Verification:  Face verify → WebAuthn assertion challenge → Verify signature
 *
 * Uses: @simplewebauthn/server (Node.js) + @simplewebauthn/browser (client)
 */

// ── SERVER-SIDE (server/webauthn/webauthn.js) ────────────────────────────────
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import { pool } from '../db.js';

const RP_NAME   = 'V-FACE Identity';
const RP_ID     = process.env.WEBAUTHN_RP_ID     || 'localhost';      // domain (no https://)
const ORIGIN    = process.env.WEBAUTHN_ORIGIN    || 'http://localhost:5173'; // frontend URL

// Challenges expire after 5 minutes
const CHALLENGE_TTL_MS = 5 * 60 * 1000;

// ── Database Schema ──────────────────────────────────────────────────────────
export async function initWebAuthnTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS webauthn_credentials (
      id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      wallet           VARCHAR(42) NOT NULL UNIQUE,
      credential_id    TEXT        NOT NULL UNIQUE,
      public_key       TEXT        NOT NULL,   -- COSE-encoded, base64url
      counter          BIGINT      NOT NULL DEFAULT 0,
      device_type      TEXT,                   -- 'singleDevice' | 'multiDevice'
      backed_up        BOOLEAN     NOT NULL DEFAULT FALSE,
      transports       TEXT[],                 -- ['usb','nfc','ble','internal']
      registered_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS webauthn_challenges (
      wallet     VARCHAR(42) PRIMARY KEY,
      challenge  TEXT        NOT NULL,
      expires_at BIGINT      NOT NULL
    );
  `);
}

// ── Registration ─────────────────────────────────────────────────────────────

/**
 * Step 1: Generate registration options for client.
 * Call after face verification succeeds.
 */
export async function beginRegistration(wallet, displayName) {
  // Check if already registered
  const existing = await pool.query(
    `SELECT credential_id FROM webauthn_credentials WHERE wallet = $1`, [wallet]
  );
  const existingCredentials = existing.rows.map(r => ({
    id: Buffer.from(r.credential_id, 'base64url'),
    type: 'public-key',
  }));

  const options = await generateRegistrationOptions({
    rpName:                  RP_NAME,
    rpID:                    RP_ID,
    userID:                  Buffer.from(wallet),
    userName:                wallet,
    userDisplayName:         displayName || wallet,
    timeout:                 60000,
    attestationType:         'none',      // privacy-preserving
    excludeCredentials:      existingCredentials,
    authenticatorSelection:  {
      residentKey:       'preferred',
      userVerification:  'preferred',    // biometric or PIN on device
    },
    supportedAlgorithmIDs: [-7, -257],   // ES256 (WebAuthn default) + RS256
  });

  // Store challenge
  await pool.query(
    `INSERT INTO webauthn_challenges (wallet, challenge, expires_at)
     VALUES ($1, $2, $3)
     ON CONFLICT (wallet) DO UPDATE SET challenge=$2, expires_at=$3`,
    [wallet, options.challenge, Date.now() + CHALLENGE_TTL_MS]
  );

  return options;
}

/**
 * Step 2: Verify registration response from client.
 */
export async function finishRegistration(wallet, registrationResponse) {
  const challengeRow = await pool.query(
    `SELECT challenge, expires_at FROM webauthn_challenges WHERE wallet = $1`, [wallet]
  );
  if (!challengeRow.rows.length) throw new Error('No pending challenge');
  if (Date.now() > challengeRow.rows[0].expires_at) throw new Error('Challenge expired');

  const expectedChallenge = challengeRow.rows[0].challenge;

  const verification = await verifyRegistrationResponse({
    response:          registrationResponse,
    expectedChallenge,
    expectedOrigin:    ORIGIN,
    expectedRPID:      RP_ID,
    requireUserVerification: false,
  });

  if (!verification.verified) throw new Error('WebAuthn registration verification failed');

  const { registrationInfo } = verification;
  const {
    credential,
    credentialDeviceType,
    credentialBackedUp,
  } = registrationInfo;

  // Store credential
  await pool.query(
    `INSERT INTO webauthn_credentials
       (wallet, credential_id, public_key, counter, device_type, backed_up, transports)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      wallet,
      Buffer.from(credential.id).toString('base64url'),
      Buffer.from(credential.publicKey).toString('base64url'),
      credential.counter,
      credentialDeviceType,
      credentialBackedUp,
      registrationResponse.response?.transports || [],
    ]
  );

  // Clear challenge
  await pool.query(`DELETE FROM webauthn_challenges WHERE wallet = $1`, [wallet]);

  return { registered: true, deviceType: credentialDeviceType, backedUp: credentialBackedUp };
}

// ── Authentication ───────────────────────────────────────────────────────────

/**
 * Step 1: Generate authentication options.
 * Call after face verification succeeds (face is first factor).
 */
export async function beginAuthentication(wallet) {
  const creds = await pool.query(
    `SELECT credential_id, transports FROM webauthn_credentials WHERE wallet = $1`, [wallet]
  );
  if (!creds.rows.length) throw new Error('No WebAuthn credential registered for this wallet');

  const allowCredentials = creds.rows.map(r => ({
    id:         Buffer.from(r.credential_id, 'base64url'),
    type:       'public-key',
    transports: r.transports || [],
  }));

  const options = await generateAuthenticationOptions({
    rpID:               RP_ID,
    timeout:            60000,
    allowCredentials,
    userVerification:   'preferred',
  });

  await pool.query(
    `INSERT INTO webauthn_challenges (wallet, challenge, expires_at)
     VALUES ($1, $2, $3)
     ON CONFLICT (wallet) DO UPDATE SET challenge=$2, expires_at=$3`,
    [wallet, options.challenge, Date.now() + CHALLENGE_TTL_MS]
  );

  return options;
}

/**
 * Step 2: Verify authentication assertion.
 * Returns verified: true if both face + WebAuthn pass.
 */
export async function finishAuthentication(wallet, authenticationResponse) {
  const [challengeRow, credRow] = await Promise.all([
    pool.query(`SELECT challenge, expires_at FROM webauthn_challenges WHERE wallet=$1`, [wallet]),
    pool.query(`SELECT * FROM webauthn_credentials WHERE wallet=$1`, [wallet]),
  ]);

  if (!challengeRow.rows.length) throw new Error('No pending challenge');
  if (Date.now() > challengeRow.rows[0].expires_at) throw new Error('Challenge expired');
  if (!credRow.rows.length) throw new Error('Credential not found');

  const cred      = credRow.rows[0];
  const challenge = challengeRow.rows[0].challenge;

  const verification = await verifyAuthenticationResponse({
    response:                  authenticationResponse,
    expectedChallenge:         challenge,
    expectedOrigin:            ORIGIN,
    expectedRPID:              RP_ID,
    credential: {
      id:         Buffer.from(cred.credential_id, 'base64url'),
      publicKey:  Buffer.from(cred.public_key, 'base64url'),
      counter:    Number(cred.counter),
      transports: cred.transports,
    },
    requireUserVerification: false,
  });

  if (!verification.verified) throw new Error('WebAuthn assertion failed');

  // Update counter (prevents replay)
  await pool.query(
    `UPDATE webauthn_credentials SET counter=$1 WHERE wallet=$2`,
    [verification.authenticationInfo.newCounter, wallet]
  );
  await pool.query(`DELETE FROM webauthn_challenges WHERE wallet=$1`, [wallet]);

  return {
    verified:    true,
    mfaMethod:   'webauthn',
    deviceType:  cred.device_type,
    backedUp:    cred.backed_up,
  };
}
