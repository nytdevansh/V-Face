import React, { useState, useEffect } from 'react';
import { useVFace } from '../hooks/useVFace';
import { useWallet } from '../context/WalletContext';
import { motion, AnimatePresence } from 'framer-motion';
import FaceScanner from './FaceScanner';
import VerificationModal from './VerificationModal';

export default function Dashboard() {
    const { account, signer } = useWallet();
    const { sdk, registry } = useVFace();
    const [registrations, setRegistrations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showScanner, setShowScanner] = useState(false);
    const [showVerification, setShowVerification] = useState(false);
    const [stats, setStats] = useState({
        totalRegistrations: 0,
        activeRegistrations: 0,
        lastActivity: null
    });

    const fetchRegistrations = async () => {
        if (!registry || !account) return;
        setLoading(true);
        try {
            // Check if this wallet has a registered identity via the registry API
            // Since the registry doesn't have a "list by owner" endpoint,
            // we track registrations locally
            const stored = JSON.parse(localStorage.getItem(`vface_registrations_${account}`) || '[]');

            // Validate each stored registration against the registry
            const validated = [];
            for (const fp of stored) {
                try {
                    const result = await registry.check(fp);
                    if (result.exists) {
                        validated.push({
                            fingerprint: fp,
                            revoked: result.revoked || false,
                            createdAt: result.createdAt,
                        });
                    }
                } catch {
                    // Fingerprint no longer in registry, skip
                }
            }

            setRegistrations(validated);
            setStats({
                totalRegistrations: validated.length,
                activeRegistrations: validated.filter(r => !r.revoked).length,
                lastActivity: validated.length > 0 ? new Date() : null
            });
        } catch (err) {
            console.error("Failed to fetch registrations", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRegistrations();
    }, [registry, account]);

    const handleScanComplete = (fingerprint) => {
        // Store the fingerprint locally for this wallet
        const stored = JSON.parse(localStorage.getItem(`vface_registrations_${account}`) || '[]');
        if (!stored.includes(fingerprint)) {
            stored.push(fingerprint);
            localStorage.setItem(`vface_registrations_${account}`, JSON.stringify(stored));
        }
        setShowScanner(false);
        fetchRegistrations();
    };

    const handleVerificationComplete = (result) => {
        setShowVerification(false);
        if (result.verified) {
            alert(`✓ Identity Verified\nConfidence: ${(result.confidence * 100).toFixed(1)}%`);
        } else {
            alert('✗ Verification Failed\nNo matching identity found.');
        }
    };

    return (
        <div className="max-w-7xl mx-auto pt-20">
            {/* Header Section */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col lg:flex-row justify-between items-start lg:items-end mb-16 border-b border-white/10 pb-8 gap-6"
            >
                <div className="flex-1">
                    <h2 className="text-4xl font-light text-white mb-2 tracking-tight">
                        IDENTITY <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-cyan-500">CONTROL PANEL</span>
                    </h2>
                    <p className="text-gray-500 font-mono text-sm">SECURE // DECENTRALIZED // IMMUTABLE</p>
                    <div className="mt-4 flex items-center gap-2">
                        <div className="px-3 py-1 bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-mono">
                            {account?.slice(0, 6)}...{account?.slice(-4)}
                        </div>
                        <button
                            onClick={() => navigator.clipboard.writeText(account)}
                            className="p-1 hover:bg-white/5 rounded transition-colors"
                            title="Copy address"
                        >
                            <svg className="w-4 h-4 text-gray-500 hover:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-8">
                    <div className="text-right">
                        <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Status</p>
                        <div className="flex items-center justify-end space-x-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_currentColor]" />
                            <span className="text-green-500 font-mono text-sm">ONLINE</span>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Backend</p>
                        <span className="text-purple-400 font-mono text-sm">REGISTRY API</span>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Encryption</p>
                        <span className="text-cyan-400 font-mono text-sm">AES-256-GCM</span>
                    </div>
                </div>
            </motion.div>

            {/* Modals */}
            <AnimatePresence>
                {showScanner && (
                    <FaceScanner
                        onCancel={() => setShowScanner(false)}
                        onScanComplete={handleScanComplete}
                    />
                )}
                {showVerification && (
                    <VerificationModal
                        onCancel={() => setShowVerification(false)}
                        onComplete={handleVerificationComplete}
                    />
                )}
            </AnimatePresence>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-40">
                    <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
                    <p className="mt-6 text-gray-500 font-mono text-sm animate-pulse">CONNECTING TO REGISTRY...</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Content Area */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                            <h3 className="text-xl font-bold text-white">Your Registrations</h3>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowVerification(true)}
                                    className="px-6 py-2 bg-cyan-600/20 border border-cyan-500/30 hover:bg-cyan-600/30 text-cyan-400 font-bold text-sm uppercase tracking-widest transition-colors"
                                >
                                    Verify Identity
                                </button>
                                <button
                                    onClick={() => setShowScanner(true)}
                                    className="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm uppercase tracking-widest transition-colors shadow-lg shadow-purple-500/20"
                                >
                                    + New Identity
                                </button>
                            </div>
                        </div>

                        {registrations.length === 0 ? (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="p-12 border border-white/5 bg-white/[0.02] backdrop-blur-sm text-center"
                            >
                                <div className="text-6xl mb-6 opacity-20">∅</div>
                                <h3 className="text-xl font-light text-white mb-4">No Digital Identity Found</h3>
                                <p className="text-gray-500 max-w-md mx-auto mb-8 leading-relaxed">
                                    Your biometric signature has not been registered to the V-Face Registry.
                                    Secure your sovereignty now.
                                </p>
                                <button
                                    onClick={() => setShowScanner(true)}
                                    className="px-8 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm uppercase tracking-widest transition-colors inline-flex items-center gap-2"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                    Create First Identity
                                </button>
                            </motion.div>
                        ) : (
                            <div className="space-y-4">
                                {registrations.map((reg, i) => (
                                    <RegistrationCard
                                        key={reg.fingerprint}
                                        registration={reg}
                                        index={i}
                                        onRefresh={fetchRegistrations}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Sidebar Stats */}
                    <div className="space-y-6">
                        <StatCard
                            title="Total Registrations"
                            value={registrations.length}
                            delay={0.1}
                            icon={
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            }
                        />
                        <StatCard
                            title="Active Identities"
                            value={stats.activeRegistrations}
                            delay={0.2}
                            icon={
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            }
                            valueColor="text-green-400"
                        />
                        <StatCard
                            title="Verifications"
                            value="0"
                            delay={0.3}
                            icon={
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                            }
                        />
                        <StatCard
                            title="Encryption"
                            value="AES-256"
                            delay={0.4}
                            icon={
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                            }
                            valueColor="text-cyan-400"
                        />

                        {/* Quick Actions */}
                        <div className="p-6 bg-gradient-to-br from-purple-900/20 to-transparent border border-purple-500/20">
                            <h4 className="text-purple-400 font-bold mb-4 text-sm uppercase flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                                Quick Actions
                            </h4>
                            <div className="space-y-2">
                                <button className="w-full px-4 py-2 bg-white/5 hover:bg-white/10 text-left text-sm text-gray-300 hover:text-white transition-colors border border-white/5 hover:border-purple-500/30">
                                    Export Identities
                                </button>
                                <button className="w-full px-4 py-2 bg-white/5 hover:bg-white/10 text-left text-sm text-gray-300 hover:text-white transition-colors border border-white/5 hover:border-purple-500/30">
                                    View Activity Log
                                </button>
                                <button className="w-full px-4 py-2 bg-white/5 hover:bg-white/10 text-left text-sm text-gray-300 hover:text-white transition-colors border border-white/5 hover:border-purple-500/30">
                                    Manage Permissions
                                </button>
                            </div>
                        </div>

                        {/* System Notice */}
                        <div className="p-6 bg-gradient-to-br from-cyan-900/10 to-transparent border border-cyan-500/20">
                            <h4 className="text-cyan-400 font-bold mb-2 text-sm uppercase">System Notice</h4>
                            <p className="text-xs text-gray-400 leading-relaxed mb-3">
                                V-Face Registry v2.0 with AES-256-GCM encryption and Sybil resistance is active.
                            </p>
                            <div className="flex items-center gap-2 text-xs text-cyan-400/60">
                                <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-pulse" />
                                <span>Last sync: {new Date().toLocaleTimeString()}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function StatCard({ title, value, delay, icon, valueColor = "text-white" }) {
    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay }}
            className="p-6 bg-white/[0.03] border border-white/5 hover:border-white/10 transition-all group"
        >
            <div className="flex items-center justify-between mb-4">
                <h4 className="text-xs text-gray-500 uppercase tracking-widest">{title}</h4>
                <div className="text-gray-600 group-hover:text-purple-500 transition-colors">
                    {icon}
                </div>
            </div>
            <div className={`text-3xl font-mono ${valueColor} group-hover:scale-105 transition-transform origin-left`}>
                {value}
            </div>
        </motion.div>
    );
}

function RegistrationCard({ registration, index, onRefresh }) {
    const { registry, signer } = useWallet();
    const [isRevoking, setIsRevoking] = useState(false);
    const [showDetails, setShowDetails] = useState(false);
    const { fingerprint, revoked, createdAt } = registration;
    const timestamp = createdAt ? new Date(createdAt) : new Date();

    const handleRevoke = async () => {
        if (!confirm('Are you sure you want to revoke this identity? This action cannot be undone.')) {
            return;
        }

        setIsRevoking(true);
        try {
            const message = { action: 'revoke', fingerprint, timestamp: Date.now() };
            const messageString = JSON.stringify(message);
            const signature = await signer.signMessage(messageString);

            await registry.revoke(fingerprint, signature, message);
            alert('Identity revoked successfully');
            onRefresh();
        } catch (err) {
            alert('Failed to revoke: ' + err.message);
        } finally {
            setIsRevoking(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="group relative bg-[#0B0C15] border border-white/10 hover:border-purple-500/50 transition-all duration-500 overflow-hidden"
        >
            {/* Background decoration */}
            <div className="absolute top-0 right-0 p-4 opacity-50 text-6xl text-white/5 font-black z-0 pointer-events-none">
                HASH
            </div>

            <div className="relative z-10 p-6">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-3">
                            <div className={`w-2 h-2 ${revoked ? 'bg-red-500' : 'bg-cyan-500'} shadow-[0_0_10px_currentColor] rounded-full`} />
                            <h3 className="font-mono text-lg text-white tracking-wider">
                                {fingerprint.slice(0, 8)}...{fingerprint.slice(-6)}
                            </h3>
                            <button
                                onClick={() => navigator.clipboard.writeText(fingerprint)}
                                className="p-1 hover:bg-white/10 rounded transition-colors"
                                title="Copy fingerprint"
                            >
                                <svg className="w-4 h-4 text-gray-500 hover:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                            </button>
                        </div>
                        <div className="flex items-center flex-wrap gap-4 text-xs font-mono text-gray-500">
                            <span className="flex items-center gap-1">
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                {timestamp.toLocaleDateString()}
                            </span>
                            <span className="flex items-center gap-1">
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {timestamp.toLocaleTimeString()}
                            </span>
                            <span className="flex items-center gap-1">
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                CONFIRMED
                            </span>
                            {revoked && (
                                <span className="text-red-500 flex items-center gap-1">
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                    REVOKED
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={() => setShowDetails(!showDetails)}
                            className="p-2 text-gray-500 hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors rounded"
                            title="View details"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </button>
                        {!revoked && (
                            <button
                                onClick={handleRevoke}
                                disabled={isRevoking}
                                className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors rounded disabled:opacity-50"
                                title="Revoke identity"
                            >
                                {isRevoking ? (
                                    <div className="w-5 h-5 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                )}
                            </button>
                        )}
                    </div>
                </div>

                {/* Expandable Details */}
                <AnimatePresence>
                    {showDetails && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-4 pt-4 border-t border-white/10 space-y-2 text-xs font-mono text-gray-400"
                        >
                            <div className="flex justify-between">
                                <span>Full Fingerprint:</span>
                                <span className="text-purple-400 break-all">{fingerprint}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Storage:</span>
                                <span className="text-cyan-400">AES-256-GCM Encrypted</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Registered:</span>
                                <span>{timestamp.toISOString()}</span>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Hover effect line */}
            <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-purple-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        </motion.div>
    );
}