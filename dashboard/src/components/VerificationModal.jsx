import React, { useRef, useState, useEffect } from 'react';
import Webcam from 'react-webcam';
import * as faceapi from 'face-api.js';
import { useVFace } from '../hooks/useVFace';
import { motion } from 'framer-motion';

const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';

export default function VerificationModal({ onCancel, onComplete }) {
    const webcamRef = useRef(null);
    const [loadingModels, setLoadingModels] = useState(true);
    const [verifying, setVerifying] = useState(false);
    const [error, setError] = useState(null);
    const [progress, setProgress] = useState(0);
    const { checkRegistration } = useVFace();

    useEffect(() => {
        const loadModels = async () => {
            try {
                setLoadingModels(true);
                await Promise.all([
                    faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
                    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
                ]);
                setLoadingModels(false);
            } catch (err) {
                console.error("Failed to load models", err);
                setError("Failed to load neural networks. Check connection.");
                setLoadingModels(false);
            }
        };
        loadModels();
    }, []);

    const handleVerify = async () => {
        if (!webcamRef.current) return;
        setVerifying(true);
        setError(null);
        setProgress(0);

        try {
            // Simulate progress
            const progressInterval = setInterval(() => {
                setProgress(prev => Math.min(prev + 10, 90));
            }, 200);

            const imageSrc = webcamRef.current.getScreenshot();
            if (!imageSrc) throw new Error("Video feed interrupted");

            const img = new Image();
            img.src = imageSrc;
            await new Promise(resolve => img.onload = resolve);

            setProgress(40);

            const detection = await faceapi.detectSingleFace(img)
                .withFaceLandmarks()
                .withFaceDescriptor();

            if (!detection) {
                throw new Error("Biometric signature not detected. Align face.");
            }

            setProgress(70);

            // Check against registered identities
            const result = await checkRegistration(detection.descriptor);

            clearInterval(progressInterval);
            setProgress(100);

            // Wait a moment to show 100% completion
            await new Promise(resolve => setTimeout(resolve, 500));

            onComplete({
                verified: result.exists,
                confidence: result.confidence || 0,
                hash: result.hash
            });
        } catch (err) {
            console.error("Verification failed", err);
            setError(err.message || "Verification failed. Please try again.");
            setProgress(0);
        } finally {
            setVerifying(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4"
        >
            <div className="bg-[#0B0C15] border border-cyan-500/30 w-full max-w-2xl relative overflow-hidden shadow-[0_0_100px_rgba(34,211,238,0.1)]">
                {/* Scanning Line Animation */}
                {verifying && (
                    <motion.div
                        animate={{ top: ["0%", "100%"] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent shadow-[0_0_20px_#22d3ee] z-20 pointer-events-none"
                    />
                )}

                <button
                    onClick={onCancel}
                    className="absolute top-6 right-6 z-30 text-gray-500 hover:text-white transition-colors"
                >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
                    {loadingModels && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black z-20 space-y-4">
                            <div className="w-16 h-16 border-t-2 border-r-2 border-cyan-500 rounded-full animate-spin" />
                            <p className="text-cyan-500 font-mono text-xs tracking-widest animate-pulse">LOADING NEURAL NETWORKS...</p>
                        </div>
                    )}

                    <Webcam
                        audio={false}
                        ref={webcamRef}
                        screenshotFormat="image/jpeg"
                        className="w-full h-full object-cover opacity-80"
                        mirrored={true}
                    />

                    {/* HUD Overlay */}
                    <div className="absolute inset-8 border-2 border-dashed border-cyan-500/20 rounded-lg pointer-events-none">
                        <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-cyan-500" />
                        <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-cyan-500" />
                        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-cyan-500" />
                        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-cyan-500" />

                        <div className="absolute top-4 left-1/2 -translate-x-1/2 text-cyan-500/50 font-mono text-[10px] tracking-[0.2em]">
                            VERIFICATION MODE
                        </div>

                        {/* Center reticle */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32">
                            <div className="w-full h-full border border-cyan-500/30 rounded-full relative">
                                <div className="absolute top-1/2 left-0 right-0 h-px bg-cyan-500/30" />
                                <div className="absolute top-0 bottom-0 left-1/2 w-px bg-cyan-500/30" />
                                {verifying && (
                                    <motion.div
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                        className="absolute inset-0 border-2 border-transparent border-t-cyan-500 rounded-full"
                                    />
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    {verifying && progress > 0 && (
                        <div className="absolute bottom-8 left-8 right-8 bg-black/50 backdrop-blur-sm p-4 pointer-events-none">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-cyan-400 text-xs font-mono">ANALYZING...</span>
                                <span className="text-cyan-400 text-xs font-mono">{progress}%</span>
                            </div>
                            <div className="w-full h-1 bg-gray-800 rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${progress}%` }}
                                    className="h-full bg-gradient-to-r from-cyan-500 to-purple-500"
                                />
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-8 border-t border-white/5 bg-gradient-to-b from-[#0B0C15] to-[#131525]">
                    <div className="flex justify-between items-end mb-6">
                        <div>
                            <h3 className="text-2xl font-light text-white mb-2">Verify Identity</h3>
                            <p className="text-gray-500 text-xs font-mono max-w-sm leading-relaxed">
                                Position face within the HUD. System will compare against registered identities.
                            </p>
                        </div>
                        {error && (
                            <div className="text-right">
                                <p className="text-red-500 text-xs font-bold uppercase tracking-widest mb-1">Error Detected</p>
                                <p className="text-red-400/50 text-xs font-mono max-w-xs">{error}</p>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={handleVerify}
                        disabled={loadingModels || verifying}
                        className={`w-full py-4 font-bold text-sm uppercase tracking-[0.2em] transition-all relative overflow-hidden group
                            ${loadingModels || verifying
                                ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                                : 'bg-gradient-to-r from-cyan-500 to-cyan-600 text-black hover:from-cyan-400 hover:to-cyan-500 shadow-[0_0_30px_rgba(34,211,238,0.3)]'
                            }`}
                    >
                        {verifying ? (
                            <span className="flex items-center justify-center gap-3">
                                <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                                Verifying Biometrics...
                            </span>
                        ) : (
                            <span className="flex items-center justify-center gap-2">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Execute Verification Protocol
                            </span>
                        )}
                    </button>
                </div>
            </div>
        </motion.div>
    );
}