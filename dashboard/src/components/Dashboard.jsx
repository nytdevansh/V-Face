import React, { useState, useEffect } from 'react';
import { useWallet } from '../context/WalletContext';
import Webcam from 'react-webcam';
import { motion, AnimatePresence } from 'framer-motion';

export default function Dashboard() {
    const { account, sdk, signer } = useWallet();
    const [activeTab, setActiveTab] = useState('register');
    const registerWebcamRef = React.useRef(null);
    const verifyWebcamRef = React.useRef(null);
    
    // Register state
    const [imgSrc, setImgSrc] = useState(null);
    const [fingerprint, setFingerprint] = useState(null);
    const [registered, setRegistered] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Verify state
    const [verifyImg, setVerifyImg] = useState(null);
    const [verifyResult, setVerifyResult] = useState(null);
    const [verifyFp, setVerifyFp] = useState(null);

    const capture = () => {
        try {
            const webcamRef = activeTab === 'register' ? registerWebcamRef : verifyWebcamRef;
            const imageSrc = webcamRef.current?.getScreenshot();
            if (!imageSrc) {
                console.error('Failed to capture image from webcam');
                setError('Failed to capture image. Check camera permissions.');
                return;
            }
            if (activeTab === 'register') {
                setImgSrc(imageSrc);
            } else {
                setVerifyImg(imageSrc);
            }
        } catch (err) {
            console.error('Capture error:', err);
            setError('Camera error: ' + (err.message || 'Unknown error'));
        }
    };

    // Check server connectivity on mount
    useEffect(() => {
        const checkServer = async () => {
            try {
                const registryUrl = import.meta.env.VITE_REGISTRY_URL || 'http://localhost:3000';
                const response = await fetch(`${registryUrl}/health`, { timeout: 5000 });
                if (!response.ok) {
                    console.warn('Server health check failed:', response.status);
                }
            } catch (err) {
                const registryUrl = import.meta.env.VITE_REGISTRY_URL || 'http://localhost:3000';
                console.error('Could not connect to server at:', registryUrl);
                console.error('Error:', err.message);
                setError('⚠️ Cannot connect to server. Is it running at ' + registryUrl + '?');
            }
        };
        checkServer();
    }, []);

    const handleRegister = async () => {
        if (!imgSrc || !account) {
            setError('No image captured or wallet not connected');
            return;
        }
        setLoading(true);
        setError(null);
        
        try {
            if (!sdk) {
                throw new Error("SDK not initialized. Check server connection.");
            }

            console.log('Initializing SDK...');
            await sdk.init();

            console.log('Creating image element...');
            const img = new Image();
            img.src = imgSrc;
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = () => reject(new Error('Failed to load captured image'));
            });

            console.log('Generating fingerprint...');
            const fp = await sdk.getFingerprint(img);
            if (!fp) throw new Error('Failed to generate fingerprint');
            setFingerprint(fp);

            console.log('Requesting wallet signature...');
            const message = `Register Identity: ${fp}`;
            const signature = await signer.signMessage(message);

            console.log('Registering with SDK...');
            const result = await sdk.register(img, account, {
                source: 'dashboard_webcam',
                signature,
                message
            });

            console.log('Registration result:', result);
            setRegistered(true);
            setError(null);
        } catch (err) {
            console.error('Registration error:', err);
            setError(err.message || 'Registration failed. Check console for details.');
        } finally {
            setLoading(false);
        }
    };

    const handleVerify = async () => {
        if (!verifyImg) {
            setError('No image captured');
            return;
        }
        setLoading(true);
        setError(null);

        try {
            if (!sdk) throw new Error("SDK not initialized. Check server connection.");
            
            console.log('Initializing SDK for verification...');
            await sdk.init();

            console.log('Creating image element...');
            const img = new Image();
            img.src = verifyImg;
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = () => reject(new Error('Failed to load captured image'));
            });

            console.log('Generating fingerprint...');
            const fp = await sdk.getFingerprint(img);
            if (!fp) throw new Error('Failed to generate fingerprint');
            setVerifyFp(fp);

            console.log('Checking exact match...');
            const check = await sdk.check(fp);
            if (check.exists) {
                console.log('Exact match found:', check);
                setVerifyResult({ found: true, type: 'exact', ...check });
                return;
            }

            console.log('Searching for similarity matches...');
            const search = await sdk.search(img, 0.75);
            console.log('Search results:', search);
            
            if (search.matches?.length > 0) {
                setVerifyResult({ 
                    found: true, 
                    type: 'similarity',
                    similarity: search.matches[0].similarity,
                    matches: search.matches
                });
            } else {
                setVerifyResult({ found: false, type: 'none' });
            }
        } catch (err) {
            console.error('Verification error:', err);
            setError(err.message || 'Verification failed. Check console for details.');
            setVerifyResult(null);
        } finally {
            setLoading(false);
        }
    };

    const handleRevoke = async () => {
        if (!fingerprint) {
            setError('No fingerprint to revoke');
            return;
        }
        if (!confirm('Revoke this identity? Cannot be undone.')) return;

        setLoading(true);
        setError(null);

        try {
            if (!signer) throw new Error('Wallet not connected');
            
            const message = {
                action: 'revoke',
                fingerprint,
                timestamp: Math.floor(Date.now() / 1000),
                nonce: window.crypto.randomUUID()
            };

            console.log('Requesting revoke signature...');
            const signature = await signer.signMessage(JSON.stringify(message));
            
            console.log('Revoking identity...');
            const res = await sdk.revoke(fingerprint, signature, message);

            if (res.success) {
                alert('✅ Identity Revoked');
                setRegistered(false);
                setFingerprint(null);
                setImgSrc(null);
                setError(null);
            } else {
                setError(res.error || 'Revocation failed');
            }
        } catch (err) {
            console.error('Revocation error:', err);
            setError(err.message || 'Revocation failed. Check console for details.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto pt-8">
            {/* Header */}
            <motion.div className="mb-8 border-b border-white/10 pb-6">
                <h1 className="text-4xl font-bold mb-2">
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">
                        V-FACE
                    </span>
                </h1>
                <p className="text-gray-400">
                    Connected: <span className="text-cyan-400 font-mono">{account?.slice(0, 6)}...{account?.slice(-4)}</span>
                </p>
            </motion.div>

            {/* Tabs */}
            <div className="flex gap-2 mb-8 border-b border-white/10">
                {[
                    { id: 'register', label: '📸 Register' },
                    { id: 'verify', label: '✅ Verify' }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => {
                            setActiveTab(tab.id);
                            setError(null);
                        }}
                        className={`px-6 py-3 font-bold transition-all ${
                            activeTab === tab.id
                                ? 'text-cyan-400 border-b-2 border-cyan-400'
                                : 'text-gray-400 hover:text-gray-300'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Error */}
            <AnimatePresence>
                {error && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="p-4 mb-6 bg-red-900/20 border border-red-500/50 text-red-400 rounded-lg"
                    >
                        <strong>Error:</strong> {error}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Register Tab */}
            <AnimatePresence mode="wait">
                {activeTab === 'register' && (
                    <motion.div
                        key="register"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="grid grid-cols-1 lg:grid-cols-2 gap-8"
                    >
                        <div className="space-y-4">
                            <h2 className="text-xl font-bold">1. Capture Face</h2>
                            <div className="aspect-video bg-black rounded-lg overflow-hidden border border-white/10">
                                {!imgSrc ? (
                                    <Webcam ref={registerWebcamRef} audio={false} screenshotFormat="image/jpeg" className="w-full h-full" />
                                ) : (
                                    <img src={imgSrc} alt="captured" className="w-full h-full object-cover" />
                                )}
                            </div>
                            <div className="flex gap-2">
                                {!imgSrc ? (
                                    <button onClick={capture} className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded">
                                        📸 Capture
                                    </button>
                                ) : (
                                    <>
                                        <button onClick={() => { setImgSrc(null); setFingerprint(null); setRegistered(false); }} className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white font-bold rounded">
                                            Retake
                                        </button>
                                        <button onClick={handleRegister} disabled={loading || registered} className="flex-1 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-700 text-white font-bold rounded">
                                            {loading ? 'Processing...' : registered ? '✅ Registered' : 'Register'}
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h2 className="text-xl font-bold">2. Identity</h2>
                            {!fingerprint ? (
                                <div className="p-6 bg-white/5 border border-white/10 rounded-lg text-center text-gray-400">
                                    Capture a face first
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <div className="p-4 bg-purple-900/20 border border-purple-500/30 rounded-lg">
                                        <p className="text-xs text-gray-400 mb-2">Fingerprint</p>
                                        <p className="font-mono text-sm text-purple-400 break-all">{fingerprint}</p>
                                    </div>
                                    <div className="p-4 bg-cyan-900/20 border border-cyan-500/30 rounded-lg">
                                        <p className="text-xs text-gray-400 mb-2">Owner</p>
                                        <p className="font-mono text-sm text-cyan-400 break-all">{account}</p>
                                    </div>
                                    {registered && (
                                        <>
                                            <div className="p-4 bg-green-900/20 border border-green-500/30 rounded-lg">
                                                <p className="text-green-400 font-bold">✅ Registered!</p>
                                            </div>
                                            <button onClick={handleRevoke} disabled={loading} className="w-full px-4 py-2 bg-red-900/40 hover:bg-red-900/60 disabled:bg-gray-700 text-red-400 font-bold rounded">
                                                🗑️ Revoke
                                            </button>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Verify Tab */}
            <AnimatePresence mode="wait">
                {activeTab === 'verify' && (
                    <motion.div
                        key="verify"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="grid grid-cols-1 lg:grid-cols-2 gap-8"
                    >
                        <div className="space-y-4">
                            <h2 className="text-xl font-bold">1. Scan Face</h2>
                            <div className="aspect-video bg-black rounded-lg overflow-hidden border border-white/10">
                                {!verifyImg ? (
                                    <Webcam ref={verifyWebcamRef} audio={false} screenshotFormat="image/jpeg" className="w-full h-full" />
                                ) : (
                                    <img src={verifyImg} alt="captured" className="w-full h-full object-cover" />
                                )}
                            </div>
                            <div className="flex gap-2">
                                {!verifyImg ? (
                                    <button onClick={capture} className="flex-1 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded">
                                        📸 Capture
                                    </button>
                                ) : (
                                    <>
                                        <button onClick={() => setVerifyImg(null)} className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white font-bold rounded">
                                            Retake
                                        </button>
                                        <button onClick={handleVerify} disabled={loading} className="flex-1 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-700 text-white font-bold rounded">
                                            {loading ? 'Scanning...' : 'Verify'}
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h2 className="text-xl font-bold">2. Results</h2>
                            {!verifyResult ? (
                                <div className="p-6 bg-white/5 border border-white/10 rounded-lg text-center text-gray-400">
                                    {verifyImg ? 'Verifying...' : 'Capture a face first'}
                                </div>
                            ) : verifyResult.found ? (
                                <div className="space-y-3">
                                    <div className="p-4 bg-green-900/20 border border-green-500/30 rounded-lg">
                                        <p className="text-green-400 font-bold">✅ Match Found!</p>
                                        <p className="text-xs text-gray-400 mt-2">{verifyResult.type === 'exact' ? 'Exact Hash' : 'Similarity Match'}</p>
                                    </div>
                                    {verifyResult.type === 'similarity' && (
                                        <div className="p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                                            <p className="text-blue-400 font-mono text-lg">{(verifyResult.similarity * 100).toFixed(1)}% Match</p>
                                        </div>
                                    )}
                                    {verifyFp && (
                                        <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
                                            <p className="text-xs text-gray-400 mb-2">Fingerprint</p>
                                            <p className="font-mono text-xs text-gray-300 break-all">{verifyFp}</p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
                                    <p className="text-red-400 font-bold">❌ No Match</p>
                                    <p className="text-xs text-gray-400 mt-2">Face not in registry</p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}