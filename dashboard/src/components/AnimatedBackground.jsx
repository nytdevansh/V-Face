import React from 'react';
import { motion } from 'framer-motion';

export default function AnimatedBackground() {
    return (
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
            {/* Base dark background */}
            <div className="absolute inset-0 bg-[#0B0C15]" />

            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-900/5 via-transparent to-cyan-900/5" />

            {/* Large floating orbs */}
            <motion.div
                animate={{
                    x: [0, 100, -100, 0],
                    y: [0, -100, 100, 0],
                    scale: [1, 1.2, 0.8, 1]
                }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-[100px]"
            />

            <motion.div
                animate={{
                    x: [0, -150, 150, 0],
                    y: [0, 150, -150, 0],
                    scale: [1, 1.5, 0.5, 1]
                }}
                transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[120px]"
            />

            {/* Additional smaller orbs */}
            <motion.div
                animate={{
                    x: [0, -80, 80, 0],
                    y: [0, 80, -80, 0],
                    scale: [1, 1.3, 0.9, 1]
                }}
                transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-1/2 left-1/2 w-64 h-64 bg-purple-500/15 rounded-full blur-[80px]"
            />

            <motion.div
                animate={{
                    x: [0, 120, -120, 0],
                    y: [0, -120, 120, 0],
                    scale: [1, 0.7, 1.4, 1]
                }}
                transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-3/4 left-3/4 w-80 h-80 bg-cyan-400/10 rounded-full blur-[100px]"
            />

            {/* Animated gradient mesh */}
            <div className="absolute inset-0 opacity-30">
                <motion.div
                    animate={{
                        backgroundPosition: ['0% 0%', '100% 100%', '0% 0%'],
                    }}
                    transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-0"
                    style={{
                        backgroundImage: `
                            radial-gradient(circle at 20% 50%, rgba(124, 58, 237, 0.1) 0%, transparent 50%),
                            radial-gradient(circle at 80% 80%, rgba(34, 211, 238, 0.1) 0%, transparent 50%),
                            radial-gradient(circle at 40% 20%, rgba(167, 139, 250, 0.08) 0%, transparent 50%)
                        `,
                        backgroundSize: '200% 200%'
                    }}
                />
            </div>

            {/* Noise texture overlay */}
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />

            {/* Grid overlay */}
            <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:50px_50px]" />

            {/* Scanning lines effect */}
            <motion.div
                animate={{
                    y: ['-100%', '200%'],
                }}
                transition={{
                    duration: 8,
                    repeat: Infinity,
                    ease: "linear"
                }}
                className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent"
            />

            {/* Floating particles */}
            {[...Array(20)].map((_, i) => (
                <motion.div
                    key={i}
                    initial={{
                        x: Math.random() * window.innerWidth,
                        y: Math.random() * window.innerHeight,
                        opacity: 0
                    }}
                    animate={{
                        y: [null, Math.random() * window.innerHeight],
                        opacity: [0, 0.3, 0],
                    }}
                    transition={{
                        duration: Math.random() * 10 + 10,
                        repeat: Infinity,
                        delay: Math.random() * 5,
                        ease: "linear"
                    }}
                    className="absolute w-1 h-1 bg-cyan-400 rounded-full"
                    style={{
                        boxShadow: '0 0 4px rgba(34, 211, 238, 0.5)'
                    }}
                />
            ))}

            {/* Vignette effect */}
            <div className="absolute inset-0 bg-radial-gradient opacity-50"
                style={{
                    background: 'radial-gradient(circle at center, transparent 0%, rgba(11, 12, 21, 0.8) 100%)'
                }}
            />
        </div>
    );
}