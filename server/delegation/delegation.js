/**
 * V-FACE Consent Delegation
 * Enables User A to delegate identity verification rights to User B (or an AI agent),
 * with time limits, scope restrictions, and chain depth limits.
 *
 * Delegation Chain:
 *   Owner → Delegate → Sub-delegate (max depth: 3)
 *
 * Use Cases:
 *   - User delegates to AI agent for automated verification
 *   - Employee delegates to manager for access control
 *   - Parent delegates to guardian for child identity
 *
 * Storage: PostgreSQL (delegation_grants table) + hash chain anchor
 */

import { SignJWT, jwtVerify } from 'jose';
import { createHash } from 'crypto';
import { pool } from './db.js';
import { getSigningKey, getPublicKey } from './signing_keys.js';

const MAX_DELEGATION_DEPTH = 3;
const MAX_EXPIRY_SECONDS   = 365 * 24 * 3600; // 1 year

// ── Database Schema (run once) ───────────────────────────────────────────────
export async function initDelegationTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS delegation_grants (
      id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      delegator    VARCHAR(42) NOT NULL,    -- wallet: granting party
      delegate     VARCHAR(42) NOT NULL,    -- wallet or agent ID: receiving party
      scopes       TEXT[]      NOT NULL,    -- e.g. ['verify', 'consent:read']
      depth        INT         NOT NULL DEFAULT 1,
      parent_id    UUID        REFERENCES delegation_grants(id),
      issued_at    BIGINT      NOT NULL,
      expires_at   BIGINT      NOT NULL,
      revoked      BOOLEAN     NOT NULL DEFAULT FALSE,
      token        TEXT        NOT NULL,    -- signed JWT
      chain_anchor TEXT,                   -- hash chain entry ID
      UNIQUE(delegator, delegate)
    );

    CREATE INDEX IF NOT EXISTS idx_delegation_delegator ON delegation_grants(delegator);
    CREATE INDEX IF NOT EXISTS idx_delegation_delegate  ON delegation_grants(delegate);
  `);
}

// ── Scope Definitions ────────────────────────────────────────────────────────
export const SCOPES = {
  VERIFY:          'verify',         // can verify identities on behalf of delegator
  CONSENT_READ:    'consent:read',   // can read consent tokens
  CONSENT_WRITE:   'consent:write',  // can issue consent tokens
  REGISTER:        'register',       // can register new identities (restricted)
  ADMIN:           'admin',          // full control (owner only, non-delegable)
};

// Scopes that cannot be delegated further
const NON_DELEGABLE_SCOPES = [SCOPES.ADMIN, SCOPES.REGISTER];


// ── Core Functions ───────────────────────────────────────────────────────────

/**
 * Issue a delegation grant from delegator → delegate.
 *
 * @param {string}   delegator    — wallet address of granting party
 * @param {string}   delegate     — wallet or agent ID of receiving party
 * @param {string[]} scopes       — list of permitted scopes
 * @param {number}   expiresIn    — seconds until expiry
 * @param {string}   [parentId]   — parent grant ID (for sub-delegation)
 * @returns {{ grantId, token, expiresAt }}
 */
export async function issueGrant(delegator, delegate, scopes, expiresIn, parentId = null) {
  if (expiresIn > MAX_EXPIRY_SECONDS) {
    throw new Error(`Expiry exceeds maximum (${MAX_EXPIRY_SECONDS}s)`);
  }

  // Validate scopes
  const validScopes = Object.values(SCOPES);
  for (const s of scopes) {
    if (!validScopes.includes(s)) throw new Error(`Unknown scope: ${s}`);
  }

  let depth = 1;
  if (parentId) {
    const parent = await getGrant(parentId);
    if (!parent) throw new Error('Parent grant not found');
    if (parent.revoked) throw new Error('Parent grant is revoked');
    if (parent.expires_at < Date.now() / 1000) throw new Error('Parent grant expired');

    depth = parent.depth + 1;
    if (depth > MAX_DELEGATION_DEPTH) {
      throw new Error(`Delegation depth limit reached (max: ${MAX_DELEGATION_DEPTH})`);
    }

    // Child cannot have more scopes than parent
    const parentScopes = parent.scopes;
    for (const s of scopes) {
      if (!parentScopes.includes(s)) {
        throw new Error(`Scope "${s}" not in parent grant`);
      }
      if (NON_DELEGABLE_SCOPES.includes(s)) {
        throw new Error(`Scope "${s}" cannot be delegated`);
      }
    }
  }

  const now       = Math.floor(Date.now() / 1000);
  const expiresAt = now + expiresIn;

  // Build JWT delegation token
  const signingKey = await getSigningKey();
  const token = await new SignJWT({
    sub:       delegate,
    delegator: delegator,
    scopes:    scopes,
    depth:     depth,
    parentId:  parentId,
    type:      'delegation',
  })
    .setProtectedHeader({ alg: 'ES256' })
    .setIssuedAt(now)
    .setExpirationTime(expiresAt)
    .setJti(createHash('sha256').update(`${delegator}:${delegate}:${now}`).digest('hex'))
    .sign(signingKey);

  const result = await pool.query(
    `INSERT INTO delegation_grants
       (delegator, delegate, scopes, depth, parent_id, issued_at, expires_at, token)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     ON CONFLICT (delegator, delegate)
       DO UPDATE SET scopes=$3, depth=$4, parent_id=$5, issued_at=$6, expires_at=$7, token=$8, revoked=FALSE
     RETURNING id`,
    [delegator, delegate, scopes, depth, parentId, now, expiresAt, token]
  );

  return {
    grantId:   result.rows[0].id,
    token,
    expiresAt,
    depth,
    scopes,
  };
}

/**
 * Verify a delegation token — check signature, expiry, revocation, and scope.
 *
 * @param {string} token          — JWT delegation token
 * @param {string} requiredScope  — scope the delegate wants to use
 * @returns {{ valid, delegator, delegate, scopes, depth }}
 */
export async function verifyDelegation(token, requiredScope) {
  const publicKey = await getPublicKey();

  let payload;
  try {
    const result = await jwtVerify(token, publicKey, { algorithms: ['ES256'] });
    payload = result.payload;
  } catch (err) {
    return { valid: false, reason: `JWT invalid: ${err.message}` };
  }

  if (payload.type !== 'delegation') {
    return { valid: false, reason: 'Not a delegation token' };
  }

  // Check DB revocation status
  const grant = await pool.query(
    `SELECT revoked, expires_at FROM delegation_grants WHERE token = $1`,
    [token]
  );
  if (!grant.rows.length) return { valid: false, reason: 'Grant not found' };
  if (grant.rows[0].revoked) return { valid: false, reason: 'Grant revoked' };

  // Check scope
  if (requiredScope && !payload.scopes.includes(requiredScope)) {
    return { valid: false, reason: `Scope "${requiredScope}" not granted` };
  }

  return {
    valid:     true,
    delegator: payload.delegator,
    delegate:  payload.sub,
    scopes:    payload.scopes,
    depth:     payload.depth,
  };
}

/**
 * Revoke a delegation grant (and cascade to all child grants).
 */
export async function revokeGrant(grantId, revokedBy) {
  const grant = await getGrant(grantId);
  if (!grant) throw new Error('Grant not found');
  if (grant.delegator !== revokedBy) throw new Error('Only delegator can revoke');

  // Cascade revoke children
  await pool.query(
    `WITH RECURSIVE children AS (
       SELECT id FROM delegation_grants WHERE id = $1
       UNION ALL
       SELECT g.id FROM delegation_grants g JOIN children c ON g.parent_id = c.id
     )
     UPDATE delegation_grants SET revoked = TRUE WHERE id IN (SELECT id FROM children)`,
    [grantId]
  );

  return { revoked: true, grantId };
}

/**
 * List all active grants issued by a delegator.
 */
export async function listGrants(delegator) {
  const result = await pool.query(
    `SELECT id, delegate, scopes, depth, expires_at, revoked
     FROM delegation_grants
     WHERE delegator = $1 AND revoked = FALSE AND expires_at > extract(epoch from now())
     ORDER BY issued_at DESC`,
    [delegator]
  );
  return result.rows;
}

async function getGrant(id) {
  const result = await pool.query(`SELECT * FROM delegation_grants WHERE id = $1`, [id]);
  return result.rows[0] || null;
}
