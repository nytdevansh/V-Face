import React, { useState, useEffect } from 'react';
import { VFaceSDK } from '@v-face/sdk';

const sdk = new VFaceSDK({
    registryUrl: 'http://localhost:3000',
    modelPath: '/model/mobilefacenet.onnx'
});

export default function Inspect({ token }) {
    const [verifyResult, setVerifyResult] = useState(null);
    const [verifying, setVerifying] = useState(false);

    // Auto-verify token when it arrives
    useEffect(() => {
        if (!token) return;
        const verify = async () => {
            setVerifying(true);
            try {
                const result = await sdk.verifyToken(token);
                setVerifyResult(result);
            } catch (err) {
                setVerifyResult({ valid: false, reason: err.message });
            } finally {
                setVerifying(false);
            }
        };
        verify();
    }, [token]);

    if (!token) {
        return (
            <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-gray-700 rounded-xl">
                <p className="text-gray-500">No token issued yet.</p>
                <p className="text-sm text-gray-600 mt-2">Complete the "Consent" flow first.</p>
            </div>
        );
    }

    // Decode JWT (without libraries for viz)
    const [header, payload, signature] = token.split('.');
    const decode = (str) => {
        try {
            return JSON.stringify(JSON.parse(atob(str)), null, 2);
        } catch (e) { return "Invalid Base64"; }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
                <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                    <h3 className="text-sm font-bold text-gray-400 uppercase mb-2">Encoded Token</h3>
                    <div className="p-4 bg-black rounded font-mono text-xs text-gray-400 break-all border border-gray-700">
                        <span className="text-red-400">{header}</span>.
                        <span className="text-purple-400">{payload}</span>.
                        <span className="text-blue-400">{signature}</span>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                    <h3 className="text-sm font-bold text-gray-400 uppercase mb-2">Decoded Payload</h3>
                    <pre className="p-4 bg-black rounded font-mono text-xs text-green-400 overflow-auto">
                        {decode(payload)}
                    </pre>
                </div>

                <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                    <h3 className="text-sm font-bold text-gray-400 uppercase mb-2">Server Verification</h3>
                    {verifying ? (
                        <div className="flex items-center gap-3">
                            <div className="w-3 h-3 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                            <span className="text-gray-400 text-sm">Verifying against registry...</span>
                        </div>
                    ) : verifyResult ? (
                        <div className="space-y-3">
                            <div className="flex items-center gap-3">
                                <div className={`w-3 h-3 rounded-full ${verifyResult.valid ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                                <span className={`font-bold ${verifyResult.valid ? 'text-green-400' : 'text-red-400'}`}>
                                    {verifyResult.valid ? 'VALID — Registry Confirmed' : `INVALID — ${verifyResult.reason}`}
                                </span>
                            </div>
                            {verifyResult.valid && verifyResult.claims && (
                                <div className="mt-3 p-3 bg-black/50 rounded text-xs font-mono text-gray-400 space-y-1">
                                    <div>Subject: <span className="text-cyan-400">{verifyResult.claims.sub}</span></div>
                                    <div>Audience: <span className="text-purple-400">{verifyResult.claims.aud}</span></div>
                                    <div>Scope: <span className="text-white">{verifyResult.claims.vf_scope?.join(', ')}</span></div>
                                    <div>Expires: <span className="text-yellow-400">{new Date(verifyResult.claims.exp * 1000).toLocaleString()}</span></div>
                                </div>
                            )}
                        </div>
                    ) : null}
                    <p className="mt-3 text-xs text-gray-500">
                        Token signature is verified server-side against the Registry's EC key pair.
                    </p>
                </div>
            </div>
        </div>
    );
}
