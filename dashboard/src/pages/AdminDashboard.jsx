/**
 * V-FACE Admin Dashboard
 * Route: /admin (protected by admin JWT)
 *
 * Shows: registrations over time, verification rates,
 *        Sybil attempts, anomaly flags, Qdrant health
 */

import { useState, useEffect, useCallback } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

const API = import.meta.env.VITE_REGISTRY_URL || 'http://localhost:3000';

const STAT_CARDS = [
  { key: 'total_identities',    label: 'Total Identities',   icon: '⬡', color: '#06B6D4' },
  { key: 'verifications_today', label: 'Verifications Today', icon: '✓', color: '#10B981' },
  { key: 'sybil_attempts',      label: 'Sybil Attempts',     icon: '⚠', color: '#F59E0B' },
  { key: 'anomaly_flags',       label: 'Anomaly Flags',      icon: '⛉', color: '#EF4444' },
];

export default function AdminDashboard({ adminToken }) {
  const [stats,       setStats]       = useState(null);
  const [regChart,    setRegChart]    = useState([]);
  const [verifyChart, setVerifyChart] = useState([]);
  const [flagged,     setFlagged]     = useState([]);
  const [qdrantHealth,setQdrant]      = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);

  const headers = { Authorization: `Bearer ${adminToken}` };

  const load = useCallback(async () => {
    try {
      setLoading(true);

      const [statsRes, regRes, verRes, flagRes, qdrantRes] = await Promise.all([
        fetch(`${API}/admin/stats`,             { headers }),
        fetch(`${API}/admin/registrations/chart`,{ headers }),
        fetch(`${API}/admin/verifications/chart`,{ headers }),
        fetch(`${API}/admin/anomaly/flagged`,    { headers }),
        fetch(`${API}/admin/qdrant/health`,      { headers }),
      ]);

      const [s, r, v, f, q] = await Promise.all([
        statsRes.json(), regRes.json(), verRes.json(),
        flagRes.json(), qdrantRes.json(),
      ]);

      setStats(s);
      setRegChart(r.data   || MOCK_REG);
      setVerifyChart(v.data || MOCK_VER);
      setFlagged(f.flagged  || []);
      setQdrant(q);
    } catch (e) {
      setError(e.message);
      // Fall back to mock data for demo
      setStats(MOCK_STATS);
      setRegChart(MOCK_REG);
      setVerifyChart(MOCK_VER);
    } finally {
      setLoading(false);
    }
  }, [adminToken]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <AdminSkeleton />;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6 font-mono">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-cyan-400">
            V-FACE <span className="text-gray-400 font-normal">/ Admin</span>
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Last refresh: {new Date().toLocaleTimeString()}
          </p>
        </div>
        <div className="flex gap-3 items-center">
          <QdrantBadge health={qdrantHealth} />
          <button
            onClick={load}
            className="px-3 py-1.5 text-xs bg-cyan-900/40 text-cyan-400 border border-cyan-800 rounded hover:bg-cyan-900/70 transition"
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 px-4 py-2 text-xs text-yellow-400 bg-yellow-900/20 border border-yellow-800/50 rounded">
          ⚠ Using mock data — API error: {error}
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {STAT_CARDS.map(({ key, label, icon, color }) => (
          <StatCard
            key={key}
            label={label}
            value={stats?.[key] ?? '—'}
            icon={icon}
            color={color}
          />
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <ChartCard title="Registrations (30 days)">
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={regChart} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6b7280' }} />
              <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} />
              <Tooltip contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 6 }} />
              <Bar dataKey="count" fill="#06B6D4" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Verifications vs Failures (7 days)">
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={verifyChart} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6b7280' }} />
              <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} />
              <Tooltip contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 6 }} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Line type="monotone" dataKey="matched"   stroke="#10B981" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="no_match"  stroke="#EF4444" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="error"     stroke="#F59E0B" strokeWidth={1} dot={false} strokeDasharray="4 4" />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Anomaly Flags Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
        <h2 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
          <span className="text-red-400">⛉</span> Anomaly Flags
          <span className="ml-auto text-xs text-gray-500">{flagged.length} active</span>
        </h2>

        {flagged.length === 0 ? (
          <p className="text-xs text-gray-600 py-4 text-center">No anomalies detected</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-500 border-b border-gray-800">
                  <th className="text-left py-2 pr-4">Fingerprint</th>
                  <th className="text-left py-2 pr-4">Events</th>
                  <th className="text-left py-2 pr-4">Z-Score</th>
                  <th className="text-left py-2 pr-4">Last Seen</th>
                  <th className="text-left py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {flagged.map((f, i) => (
                  <tr key={i} className="border-b border-gray-900 hover:bg-gray-800/50">
                    <td className="py-2 pr-4 text-cyan-400 font-mono">
                      {f.fingerprint?.slice(0, 16)}…
                    </td>
                    <td className="py-2 pr-4">{f.event_count}</td>
                    <td className="py-2 pr-4">
                      <span className={`px-1.5 py-0.5 rounded text-xs ${
                        f.z_score > 5 ? 'bg-red-900/50 text-red-400' : 'bg-yellow-900/50 text-yellow-400'
                      }`}>
                        {f.z_score?.toFixed(1)}σ
                      </span>
                    </td>
                    <td className="py-2 pr-4 text-gray-500">
                      {new Date(f.last_event * 1000).toLocaleString()}
                    </td>
                    <td className="py-2">
                      <button
                        onClick={() => handleRevoke(f.fingerprint)}
                        className="text-red-400 hover:text-red-300 underline"
                      >
                        Revoke
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ label, value, icon, color }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
      <div className="flex items-start justify-between">
        <span className="text-lg" style={{ color }}>{icon}</span>
        <span className="text-2xl font-bold" style={{ color }}>
          {typeof value === 'number' ? value.toLocaleString() : value}
        </span>
      </div>
      <p className="text-xs text-gray-500 mt-2">{label}</p>
    </div>
  );
}

function ChartCard({ title, children }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
      <h2 className="text-xs font-semibold text-gray-400 mb-4">{title}</h2>
      {children}
    </div>
  );
}

function QdrantBadge({ health }) {
  const ok = health?.status === 'green';
  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs border ${
      ok ? 'border-green-800 text-green-400 bg-green-900/20'
         : 'border-red-800 text-red-400 bg-red-900/20'
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${ok ? 'bg-green-400' : 'bg-red-400'} animate-pulse`} />
      Qdrant {ok ? 'healthy' : 'degraded'}
      {health?.vectors_count != null && (
        <span className="text-gray-500 ml-1">· {health.vectors_count.toLocaleString()} vectors</span>
      )}
    </div>
  );
}

function AdminSkeleton() {
  return (
    <div className="min-h-screen bg-gray-950 p-6 animate-pulse">
      <div className="h-8 w-48 bg-gray-800 rounded mb-8" />
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 bg-gray-900 rounded-lg" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-6">
        <div className="h-56 bg-gray-900 rounded-lg" />
        <div className="h-56 bg-gray-900 rounded-lg" />
      </div>
    </div>
  );
}

// ── Mock Data (used when API unavailable) ────────────────────────────────────
const MOCK_STATS = {
  total_identities: 1247,
  verifications_today: 384,
  sybil_attempts: 12,
  anomaly_flags: 3,
};
const days30 = Array.from({ length: 30 }, (_, i) => ({
  date:  `${3}/${i + 1}`,
  count: Math.floor(30 + Math.random() * 80),
}));
const MOCK_REG = days30;
const MOCK_VER = Array.from({ length: 7 }, (_, i) => ({
  date:     `Day ${i + 1}`,
  matched:  Math.floor(50 + Math.random() * 100),
  no_match: Math.floor(5  + Math.random() * 20),
  error:    Math.floor(0  + Math.random() * 5),
}));
