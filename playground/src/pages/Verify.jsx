
import React, { useState, useRef, useCallback } from 'react';
import Webcam from 'react-webcam';
import { useWallet } from '../context/WalletContext';

export default function Verify() {
    const { isConnected, sdk } = useWallet();
    const [mode, setMode] = useState('scan'); // 'scan' | 'manual'
    const [input, setInput] = useState('');
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Webcam
    const webcamRef = useRef(null);
    const [imgSrc, setImgSrc] = useState(null);

    const capture = useCallback(() => {
        try {
            const imageSrc = webcamRef.current?.getScreenshot();
            if (!imageSrc) {
                setError('Failed to capture from webcam. Check camera permissions.');
                return;
            }
            setImgSrc(imageSrc);
            setError(null);
        } catch (err) {
            console.error('Capture error:', err);
            setError('Camera error: ' + err.message);
        }
    }, [webcamRef]);

    const handleVerifyFace = async () => {
        if (!imgSrc) {
            setError('No face captured');
            return;
        }
        setLoading(true);
        setResult(null);
        setError(null);

        try {
            console.log('Creating image element...');
            const img = new Image();
            img.src = imgSrc;
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = () => reject(new Error('Failed to load image'));
            });

            // 1. Get Fingerprint
            console.log('Getting fingerprint...');
            const fp = await sdk.getFingerprint(img);
            if (!fp) throw new Error('Failed to generate fingerprint');

            // 2. Try exact hash lookup first
            console.log('Checking for exact match...');
            const checkResult = await sdk.check(fp);

            if (checkResult.exists) {
                console.log('Exact match found:', checkResult);
                setResult({
                    type: 'face',
                    matchType: 'EXACT_HASH',
                    similarity: 1.0,
                    found: true,
                    fingerprint: fp,
                    ...checkResult
                });
                return;
            }

            // 3. Fallback to similarity search
            console.log('Searching for similar matches...');
            const searchResult = await sdk.search(img, 0.75);

            if (searchResult.matches && searchResult.matches.length > 0) {
                const best = searchResult.matches[0];
                console.log('Found similar match:', best);
                setResult({
                    type: 'face',
                    matchType: 'SIMILARITY',
                    similarity: best.similarity,
                    found: true,
                    fingerprint: best.fingerprint,
                    public_key: best.public_key,
                    total_matches: searchResult.matches.length
                });
            } else {
                console.log('No matches found');
                setResult({
                    type: 'face',
                    found: false,
                    fingerprint: fp,
                    reason: 'No match found (hash or similarity)'
                });
            }

        } catch (err) {
            console.error('Verification error:', err);
            setError(err.message || 'Verification failed. Check console for details.');
        } finally {
            setLoading(false);
        }
    };

    const handleCheckManual = async () => {
        if (!input) {
            setError('Please enter a fingerprint or token');
            return;
        }
        setLoading(true);
        setResult(null);
        setError(null);

        try {
            const isToken = input.split('.').length === 3;
            if (isToken) {
                console.log('Verifying token...');
                const data = await sdk.verifyToken(input);
                console.log('Token verified:', data);
                setResult({ type: 'token', ...data });
            } else {
                console.log('Checking fingerprint...');
                const data = await sdk.check(input);
                console.log('Fingerprint check result:', data);
                setResult({ type: 'fingerprint', ...data });
            }
        } catch (err) {
            console.error('Check error:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="bg-gray-800 p-8 rounded-xl border border-gray-700">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-white">Verification Station</h2>
                    <div className="flex bg-black/50 rounded-lg p-1">
                        <button
                            onClick={() => { setMode('scan'); setResult(null); }}
                            className={`px-4 py-1 rounded-md text-sm font-medium transition-colors ${mode === 'scan' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}
                        >
                            Scan Face
                        </button>
                        <button
                            onClick={() => { setMode('manual'); setResult(null); }}
                            className={`px-4 py-1 rounded-md text-sm font-medium transition-colors ${mode === 'manual' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}
                        >
                            Manual Input
                        </button>
                    </div>
                </div>

                {mode === 'scan' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <div className="aspect-video bg-black rounded-lg overflow-hidden relative">
                                {!imgSrc ? (
                                    <Webcam audio={false} ref={webcamRef} screenshotFormat="image/jpeg" className="w-full h-full object-cover" />
                                ) : (
                                    <img src={imgSrc} alt="captured" className="w-full h-full object-cover" />
                                )}
                            </div>
                            <div className="flex justify-center gap-4">
                                {!imgSrc ? (
                                    <button onClick={capture} className="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-full text-sm">Capture</button>
                                ) : (
                                    <>
                                        <button onClick={() => setImgSrc(null)} className="px-4 py-2 bg-gray-600 text-white rounded-full text-sm">Retake</button>
                                        <button onClick={handleVerifyFace} disabled={loading} className="px-6 py-2 bg-green-600 hover:bg-green-500 text-white font-bold rounded-full text-sm">Verify Identity</button>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Result Area */}
                        <div className="bg-black/30 p-4 rounded-lg border border-gray-700 min-h-[200px]">
                            <h3 className="text-gray-400 text-sm uppercase mb-4">Verification Result</h3>
                            {loading && <div className="text-purple-400 animate-pulse text-sm">Processing Biometric Data...</div>}

                            {result?.type === 'face' && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                                    {result.found ? (
                                        <div className="p-4 bg-green-900/20 border border-green-500/50 rounded-lg">
                                            <div className="text-green-400 font-bold text-lg mb-2">IDENTITY VERIFIED</div>
                                            <div className="text-sm text-gray-300">
                                                Match Type: <span className="font-mono text-purple-300">{result.matchType}</span>
                                            </div>
                                            <div className="text-sm text-gray-300">
                                                Similarity: <span className="font-mono text-white">{(result.similarity * 100).toFixed(2)}%</span>
                                            </div>
                                            {result.total_matches > 1 && (
                                                <div className="text-sm text-gray-300">
                                                    Total Matches: <span className="font-mono text-cyan-400">{result.total_matches}</span>
                                                </div>
                                            )}
                                            <div className="mt-2 text-xs text-gray-500 font-mono break-all">
                                                ID: {result.fingerprint?.substring(0, 20)}...
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="p-4 bg-red-900/20 border border-red-500/50 rounded-lg">
                                            <div className="text-red-400 font-bold text-lg mb-2">NO MATCH FOUND</div>
                                            <p className="text-sm text-gray-300">
                                                {result.reason}
                                            </p>
                                            <div className="mt-2 text-xs text-gray-500 font-mono break-all">
                                                Generated: {result.fingerprint?.substring(0, 20)}...
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <label className="block text-sm font-medium text-gray-400">Check Token or Fingerprint</label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Paste JWT Token or Hex Fingerprint..."
                                className="flex-1 bg-black/50 border border-gray-600 rounded-lg px-4 py-2 text-white font-mono text-sm focus:outline-none focus:border-purple-500"
                            />
                            <button onClick={handleCheckManual} disabled={loading || !input} className="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg transition-colors">
                                {loading ? 'Verifying...' : 'Verify'}
                            </button>
                        </div>
                        {result && (
                            <div className={`p-6 rounded-xl border animate-in fade-in slide-in-from-top-2 ${(result.type === 'token' ? result.valid : (result.exists && !result.revoked)) ? 'bg-green-900/20 border-green-500/50' : 'bg-red-900/20 border-red-500/50'}`}>
                                <pre className="text-xs text-gray-300 whitespace-pre-wrap font-mono">{JSON.stringify(result, null, 2)}</pre>
                            </div>
                        )}
                    </div>
                )}

                {error && <div className="text-red-500 mt-4">{error}</div>}
            </div>
        </div>
    );
}
