import React, { useState, useRef, useCallback } from 'react';
import Webcam from 'react-webcam';
import { useWallet } from '../context/WalletContext';

export default function Register({ onIdentityCreated }) {
    const { isConnected, signer, account, sdk } = useWallet();
    const webcamRef = useRef(null);
    const [imgSrc, setImgSrc] = useState(null);
    const [fingerprint, setFingerprint] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [registered, setRegistered] = useState(false);

    const capture = useCallback(() => {
        const imageSrc = webcamRef.current.getScreenshot();
        setImgSrc(imageSrc);
    }, [webcamRef]);

    const handleRegister = async () => {
        if (!imgSrc || !isConnected) return;
        setLoading(true);
        setError(null);
        try {
            const img = new Image();
            img.src = imgSrc;
            await new Promise(r => img.onload = r);

            // 1. Sign intent with wallet
            const fp = await sdk.getFingerprint(img);
            setFingerprint(fp);
            const message = `Register Identity: ${fp}`;
            const signature = await signer.signMessage(message);

            // 2. Register via unified SDK (handles fingerprint + embedding + API call)
            const result = await sdk.register(img, account, {
                source: 'playground_webcam',
                signature,
                message
            });

            setRegistered(true);
            if (onIdentityCreated) {
                onIdentityCreated({
                    fingerprint: result.fingerprint,
                    publicKey: account
                });
            }
        } catch (err) {
            console.error(err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left: Input */}
            <div className="space-y-6">
                <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                    <h2 className="text-xl font-semibold mb-4 text-white">1. Capture Face</h2>
                    <div className="aspect-video bg-black rounded-lg overflow-hidden relative">
                        {!imgSrc ? (
                            <Webcam
                                audio={false}
                                ref={webcamRef}
                                screenshotFormat="image/jpeg"
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <img src={imgSrc} alt="captured" className="w-full h-full object-cover" />
                        )}

                        <div className="absolute bottom-4 left-0 right-0 flex justify-center space-x-4">
                            {!imgSrc ? (
                                <button
                                    onClick={capture}
                                    className="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-full shadow-lg transition-transform hover:scale-105"
                                >
                                    Capture
                                </button>
                            ) : (
                                <button
                                    onClick={() => { setImgSrc(null); setFingerprint(null); setRegistered(false); }}
                                    className="px-6 py-2 bg-gray-600 hover:bg-gray-500 text-white font-bold rounded-full"
                                >
                                    Retake
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <button
                    onClick={handleRegister}
                    disabled={!imgSrc || loading || registered || !isConnected}
                    className={`w-full py-4 text-lg font-bold rounded-xl transition-colors ${!imgSrc || loading || registered || !isConnected
                        ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                        : 'bg-gradient-to-r from-purple-600 to-cyan-500 text-white hover:from-purple-500 hover:to-cyan-400 shadow-lg shadow-purple-900/20'
                        }`}
                >
                    {!isConnected ? 'Please Connect Wallet' :
                        loading ? 'Check Wallet...' :
                            registered ? 'Identity Registered' :
                                'Sign & Register Identity'}
                </button>

                {error && (
                    <div className="p-4 bg-red-900/20 border border-red-500/50 text-red-400 rounded-lg">
                        Error: {error}
                    </div>
                )}
            </div>

            {/* Right: Output */}
            <div className="space-y-6">
                <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 h-full">
                    <h2 className="text-xl font-semibold mb-4 text-white">2. Infrastructure View</h2>

                    {!fingerprint ? (
                        <div className="flex items-center justify-center h-64 text-gray-600 font-mono text-sm">
                            Wait for capture...
                        </div>
                    ) : (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div>
                                <label className="text-xs text-gray-500 font-mono uppercase">Raw Processing</label>
                                <div className="mt-2 p-3 bg-black/50 rounded font-mono text-xs text-green-400 border border-green-900/30">
                                    &gt; Normalizing vector... OK<br />
                                    &gt; Quantizing (4 decimals)... OK<br />
                                    &gt; Serializing... OK
                                </div>
                            </div>

                            <div>
                                <label className="text-xs text-gray-500 font-mono uppercase">Privacy-Preserving Fingerprint</label>
                                <div className="mt-2 p-4 bg-black rounded border border-purple-500/30 break-all font-mono text-purple-400 text-sm shadow-[0_0_15px_rgba(168,85,247,0.1)]">
                                    {fingerprint}
                                </div>
                                <p className="mt-2 text-xs text-gray-400">
                                    * This hash is irreversible.
                                </p>
                            </div>

                            {registered && (
                                <div className="space-y-4">
                                    <div className="p-4 bg-green-900/20 border border-green-500/30 rounded-lg flex items-center gap-3">
                                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                        <span className="text-green-400 font-bold">Identity Signed & Registered</span>
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500 font-mono uppercase">Owner Address</label>
                                        <div className="mt-1 font-mono text-xs text-gray-300 break-all bg-black/30 p-2 rounded">
                                            {account}
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t border-gray-700">
                                        <h3 className="text-sm font-semibold text-white mb-2">Danger Zone</h3>
                                        <button
                                            onClick={async () => {
                                                if (!confirm('Are you sure you want to revoke your identity? This cannot be undone.')) return;
                                                try {
                                                    setLoading(true);
                                                    const nonce = window.crypto.randomUUID();
                                                    const timestamp = Math.floor(Date.now() / 1000);
                                                    const message = {
                                                        action: 'revoke',
                                                        fingerprint,
                                                        timestamp,
                                                        nonce
                                                    };

                                                    const messageString = JSON.stringify(message);
                                                    const signature = await signer.signMessage(messageString);

                                                    const res = await sdk.revoke(fingerprint, signature, message);

                                                    if (!res.success) throw new Error('Revocation failed');

                                                    alert('Identity Revoked Successfully');
                                                    window.location.reload();
                                                } catch (e) {
                                                    alert('Revoke Failed: ' + e.message);
                                                } finally {
                                                    setLoading(false);
                                                }
                                            }}
                                            className="w-full py-2 bg-red-900/40 hover:bg-red-900/60 text-red-400 border border-red-900 rounded font-bold text-sm transition-colors"
                                        >
                                            Revoke Identity
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
