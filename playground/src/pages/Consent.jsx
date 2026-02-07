import React, { useState } from 'react';

export default function Consent({ identity, onTokenIssued }) {
    const [loading, setLoading] = useState(false);
    const [request, setRequest] = useState(null);
    const [error, setError] = useState(null);

    const checkIdentity = async () => {
        if (!identity) {
            setError("No local identity found. Please Register first.");
            return;
        }

        setLoading(true);
        try {
            // 1. Simulate "Login with Face" -> Request Consent from Registry
            const res = await fetch('http://localhost:3000/consent/request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fingerprint: identity.fingerprint,
                    company_id: 'PLAYGROUND_DEMO',
                    scope: ['auth:login', 'profile:read'],
                    duration: 3600
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            setRequest(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const approveConsent = async () => {
        if (!request || !identity) return;
        setLoading(true);
        try {
            // 2. Simulate User Approval on Device
            const res = await fetch('http://localhost:3000/consent/approve', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    request_id: request.request_id,
                    fingerprint: identity.fingerprint,
                    company_id: 'PLAYGROUND_DEMO',
                    scope: ['auth:login', 'profile:read']
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            onTokenIssued(data.token);
            alert("Consent Granted! Token Issued.");
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!identity) {
        return (
            <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-gray-700 rounded-xl">
                <p className="text-gray-500">No identity registered in this session.</p>
                <p className="text-sm text-gray-600 mt-2">Go to "Register" tab first.</p>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto space-y-8">
            <div className="bg-gray-800 p-8 rounded-xl border border-gray-700 text-center">
                <h2 className="text-2xl font-bold mb-2">Simulate Login</h2>
                <p className="text-gray-400 mb-6">
                    A third-party app ("Playground Demo") is requesting access to your face identity.
                </p>

                <div className="p-4 bg-black/30 rounded-lg mb-6 text-left">
                    <div className="flex justify-between mb-2">
                        <span className="text-gray-500 text-sm">Target Identity</span>
                        <span className="text-purple-400 font-mono text-sm">{identity.fingerprint.slice(0, 16)}...</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-500 text-sm">Requested Scope</span>
                        <span className="text-white font-mono text-sm">auth:login</span>
                    </div>
                </div>

                {!request ? (
                    <button
                        onClick={checkIdentity}
                        disabled={loading}
                        className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition-colors"
                    >
                        {loading ? 'Initiating...' : 'Initiate Login Flow'}
                    </button>
                ) : (
                    <div className="animate-in fade-in zoom-in duration-300">
                        <div className="p-6 bg-yellow-900/20 border border-yellow-500/50 rounded-xl mb-6">
                            <h3 className="text-yellow-400 font-bold mb-2">⚠️ Consent Request</h3>
                            <p className="text-sm text-yellow-100/80 mb-4">
                                "Playground Demo" wants to access your identity for 1 hour.
                            </p>
                            <div className="flex gap-4 justify-center">
                                <button
                                    onClick={() => setRequest(null)}
                                    className="px-6 py-2 bg-transparent hover:bg-white/10 text-white border border-white/20 rounded-lg"
                                >
                                    Deny
                                </button>
                                <button
                                    onClick={approveConsent}
                                    className="px-6 py-2 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg shadow-lg"
                                >
                                    Approve Access
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {error && (
                    <div className="mt-4 text-red-400 text-sm bg-red-900/20 p-2 rounded">
                        {error}
                    </div>
                )}
            </div>
        </div>
    );
}
