/**
 * V-FACE Admin API Routes
 * Mount: app.use('/admin', adminRouter)
 * All routes require admin JWT (role: 'admin')
 */

import express from 'express';
import { pool } from '../db.js';

export const adminRouter = express.Router();

// ── Admin JWT Middleware ─────────────────────────────────────────────────────
adminRouter.use(async (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'Missing admin token' });
  const token = auth.slice(7);

  try {
    const { verifyJWT } = await import('../auth/jwt.js');
    const payload = await verifyJWT(token);
    if (payload.role !== 'admin') return res.status(403).json({ error: 'Admin role required' });
    req.adminWallet = payload.sub;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid admin token' });
  }
});

// ── GET /admin/stats ─────────────────────────────────────────────────────────
adminRouter.get('/stats', async (req, res) => {
  try {
    const [identities, todayVerify, sybil, anomaly] = await Promise.all([
      pool.query(`SELECT COUNT(*) FROM identities WHERE revoked = FALSE`),
      pool.query(`SELECT COUNT(*) FROM verification_log WHERE created_at > NOW() - INTERVAL '1 day'`),
      pool.query(`SELECT COUNT(*) FROM identities WHERE sybil_flagged = TRUE`),
      pool.query(`SELECT COUNT(*) FROM anomaly_events WHERE z_score > 3 AND created_at > NOW() - INTERVAL '7 days'`),
    ]);

    res.json({
      total_identities:    parseInt(identities.rows[0].count),
      verifications_today: parseInt(todayVerify.rows[0].count),
      sybil_attempts:      parseInt(sybil.rows[0].count),
      anomaly_flags:       parseInt(anomaly.rows[0].count),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /admin/registrations/chart ───────────────────────────────────────────
adminRouter.get('/registrations/chart', async (req, res) => {
  const days = parseInt(req.query.days || '30');
  try {
    const result = await pool.query(`
      SELECT
        TO_CHAR(created_at, 'MM/DD') AS date,
        COUNT(*)::int                AS count
      FROM identities
      WHERE created_at > NOW() - INTERVAL '${days} days'
      GROUP BY 1
      ORDER BY MIN(created_at)
    `);
    res.json({ data: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /admin/verifications/chart ───────────────────────────────────────────
adminRouter.get('/verifications/chart', async (req, res) => {
  const days = parseInt(req.query.days || '7');
  try {
    const result = await pool.query(`
      SELECT
        TO_CHAR(created_at, 'Dy') AS date,
        SUM(CASE WHEN result = 'matched'   THEN 1 ELSE 0 END)::int AS matched,
        SUM(CASE WHEN result = 'no_match'  THEN 1 ELSE 0 END)::int AS no_match,
        SUM(CASE WHEN result = 'error'     THEN 1 ELSE 0 END)::int AS error
      FROM verification_log
      WHERE created_at > NOW() - INTERVAL '${days} days'
      GROUP BY 1, DATE_TRUNC('day', created_at)
      ORDER BY DATE_TRUNC('day', created_at)
    `);
    res.json({ data: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /admin/anomaly/flagged ────────────────────────────────────────────────
adminRouter.get('/anomaly/flagged', async (req, res) => {
  try {
    // Forward to matching service anomaly endpoint
    const { matchingClient } = await import('../matching_client.js');
    const flagged = await matchingClient.get('/anomaly/flagged');
    res.json(flagged.data);
  } catch (err) {
    res.status(500).json({ error: err.message, flagged: [] });
  }
});

// ── GET /admin/qdrant/health ─────────────────────────────────────────────────
adminRouter.get('/qdrant/health', async (req, res) => {
  try {
    const { matchingClient } = await import('../matching_client.js');
    const health = await matchingClient.get('/health/qdrant');
    res.json(health.data);
  } catch (err) {
    res.status(500).json({ status: 'unknown', error: err.message });
  }
});

// ── POST /admin/revoke/:fingerprint ─────────────────────────────────────────
adminRouter.post('/revoke/:fingerprint', async (req, res) => {
  const { fingerprint } = req.params;
  try {
    await pool.query(
      `UPDATE identities SET revoked = TRUE WHERE fingerprint = $1`,
      [fingerprint]
    );
    res.json({ success: true, revoked: fingerprint, by: req.adminWallet });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
