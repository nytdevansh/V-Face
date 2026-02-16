import React, { useRef, useState, useEffect } from 'react';
import Webcam from 'react-webcam';
import * as faceapi from 'face-api.js';
import { useVFace } from '../hooks/useVFace';
import { motion, AnimatePresence } from 'framer-motion';

const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';

export default function FaceScanner({ onCancel, onScanComplete }) {
    const webcamRef = useRef(null);
    const [loadingModels, setLoadingModels] = useState(true);
    const [scanning, setScanning] = useState(false);
    const [error, setError] = useState(null);
    const [faceDetected, setFaceDetected] = useState(false);
    const [progress, setProgress] = useState(0);
    const { registerFace } = useVFace();

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

    // Real-time face detection for feedback
    useEffect(() => {
        if (loadingModels || scanning) return;

        const detectFace = async () => {
            if (!webcamRef.current) return;

            try {
                const imageSrc = webcamRef.current.getScreenshot();
                if (!imageSrc) return;

                const img = new Image();
                img.src = imageSrc;
                await new Promise(resolve => img.onload = resolve);

                const detection = await faceapi.detectSingleFace(img);
                setFaceDetected(!!detection);
            } catch (err) {
                setFaceDetected(false);
            }
        };

        const interval = setInterval(detectFace, 1000);
        return () => clearInterval(interval);
    }, [loadingModels, scanning]);

    const handleScan = async () => {
        if (!webcamRef.current) return;
        setScanning(true);
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
                throw new Error("Biometric signature not detected. Align face within HUD.");
            }

            setProgress(70);

            const result = await registerFace(detection.descriptor);

            clearInterval(progressInterval);
            setProgress(100);

            // Show success animation before closing
            await new Promise(resolve => setTimeout(resolve, 1000));

            onScanComplete(result?.fingerprint);
        } catch (err) {
            console.error("Scan failed", err);
            if (err.code === "ACTION_REJECTED") {
                setError("User rejected cryptographic signature.");
            } else {
                setError(err.message || "Biometric extraction failed.");
            }
            setProgress(0);
        } finally {
            setScanning(false);
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
                <motion.div
                    animate={{ top: scanning ? ["0%", "100%"] : "0%" }}
                    transition={{ duration: 3, repeat: scanning ? Infinity : 0, ease: "linear" }}
                    className="absolute left-0 right-0 h-1 bg-cyan-500/50 shadow-[0_0_20px_#22d3ee] z-20 pointer-events-none"
                />

                <button
                    onClick={onCancel}
                    className="absolute top-6 right-6 z-30 text-gray-500 hover:text-white transition-colors group"
                >
                    <svg className="w-6 h-6 group-hover:rotate-90 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
                    {loadingModels && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black z-20 space-y-4">
                            <div className="w-16 h-16 border-t-2 border-r-2 border-cyan-500 rounded-full animate-spin" />
                            <p className="text-cyan-500 font-mono text-xs tracking-widest animate-pulse">LOADING NEURAL NETWORKS...</p>
                            <div className="flex gap-1 mt-4">
                                {[0, 1, 2].map((i) => (
                                    <motion.div
                                        key={i}
                                        animate={{ opacity: [0.3, 1, 0.3] }}
                                        transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
                                        className="w-2 h-2 bg-cyan-500 rounded-full"
                                    />
                                ))}
                            </div>
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
                        {/* Corner brackets */}
                        <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-cyan-500" />
                        <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-cyan-500" />
                        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-cyan-500" />
                        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-cyan-500" />

                        <div className="absolute top-4 left-1/2 -translate-x-1/2 text-cyan-500/50 font-mono text-[10px] tracking-[0.2em]">
                            BIOMETRIC SENSOR ARRAY
                        </div>

                        {/* Face detection indicator */}
                        <div className="absolute top-4 right-4 flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${faceDetected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                            <span className={`text-[10px] font-mono tracking-wider ${faceDetected ? 'text-green-500' : 'text-red-500'}`}>
                                {faceDetected ? 'FACE DETECTED' : 'NO FACE'}
                            </span>
                        </div>

                        {/* Center crosshair */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                            <div className="relative w-48 h-48">
                                {/* Outer ring */}
                                <div className={`absolute inset-0 border-2 rounded-full transition-colors duration-500 ${faceDetected ? 'border-green-500/50' : 'border-cyan-500/30'
                                    }`}>
                                    {scanning && (
                                        <motion.div
                                            animate={{ rotate: 360 }}
                                            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                            className="absolute inset-0 border-2 border-transparent border-t-cyan-500 rounded-full"
                                        />
                                    )}
                                </div>

                                {/* Crosshair lines */}
                                <div className="absolute top-1/2 left-0 right-0 h-px bg-cyan-500/30" />
                                <div className="absolute top-0 bottom-0 left-1/2 w-px bg-cyan-500/30" />

                                {/* Center dot */}
                                <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full ${faceDetected ? 'bg-green-500' : 'bg-cyan-500'
                                    } shadow-[0_0_10px_currentColor]`} />
                            </div>
                        </div>
                    </div>

                    {/* Progress overlay */}
                    {scanning && progress > 0 && (
                        <div className="absolute bottom-8 left-8 right-8 bg-black/80 backdrop-blur-md p-4 border border-cyan-500/30 pointer-events-none">
                            <div className="flex justify-between items-center mb-3">
                                <span className="text-cyan-400 text-xs font-mono">PROCESSING BIOMETRIC DATA...</span>
                                <span className="text-cyan-400 text-sm font-mono font-bold">{progress}%</span>
                            </div>
                            <div className="w-full h-1.5 bg-gray-900 rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${progress}%` }}
                                    className="h-full bg-gradient-to-r from-cyan-500 via-purple-500 to-cyan-500 relative"
                                >
                                    <motion.div
                                        animate={{ x: ['-100%', '200%'] }}
                                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent"
                                    />
                                </motion.div>
                            </div>
                            {progress === 100 && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="mt-3 text-green-500 text-xs font-mono flex items-center gap-2"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    IDENTITY REGISTERED SUCCESSFULLY
                                </motion.div>
                            )}
                        </div>
                    )}
                </div>

                <div className="p-8 border-t border-white/5 bg-gradient-to-b from-[#0B0C15] to-[#131525]">
                    <div className="flex justify-between items-start mb-6">
                        <div className="flex-1">
                            <h3 className="text-2xl font-light text-white mb-2">Initialize Registration</h3>
                            <p className="text-gray-500 text-xs font-mono max-w-sm leading-relaxed">
                                Position face within HUD. Data is locally hashed. No imagery leaves this runtime environment.
                            </p>

                            {/* Tips */}
                            <div className="mt-4 space-y-1">
                                <div className="flex items-start gap-2 text-xs text-gray-600">
                                    <svg className="w-3 h-3 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span>Ensure face is well-lit and centered</span>
                                </div>
                                <div className="flex items-start gap-2 text-xs text-gray-600">
                                    <svg className="w-3 h-3 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span>Remove glasses or accessories if possible</span>
                                </div>
                                <div className="flex items-start gap-2 text-xs text-gray-600">
                                    <svg className="w-3 h-3 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span>Look directly at the camera</span>
                                </div>
                            </div>
                        </div>

                        {error && (
                            <div className="text-right max-w-xs">
                                <p className="text-red-500 text-xs font-bold uppercase tracking-widest mb-1 flex items-center justify-end gap-2">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                    Error Detected
                                </p>
                                <p className="text-red-400/70 text-xs font-mono leading-relaxed">{error}</p>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={handleScan}
                        disabled={loadingModels || scanning || !faceDetected}
                        className={`w-full py-4 font-bold text-sm uppercase tracking-[0.2em] transition-all relative overflow-hidden group
                            ${loadingModels || scanning || !faceDetected
                                ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                                : 'bg-cyan-500 text-black hover:bg-cyan-400 shadow-[0_0_30px_rgba(34,211,238,0.3)] hover:shadow-[0_0_50px_rgba(34,211,238,0.5)]'
                            }`}
                    >
                        {scanning ? (
                            <span className="flex items-center justify-center gap-3">
                                <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                                Processing Biometrics...
                            </span>
                        ) : !faceDetected && !loadingModels ? (
                            <span>Waiting for Face Detection...</span>
                        ) : (
                            <span className="flex items-center justify-center gap-2">
                                <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                                Execute Registration Protocol
                            </span>
                        )}
                    </button>
                </div>
            </div>
        </motion.div>
    );
}