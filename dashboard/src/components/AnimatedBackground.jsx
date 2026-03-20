import React from 'react';

/**
 * AnimatedBackground — GPU-accelerated, CSS-only
 *
 * Replaces the previous framer-motion implementation which ran
 * 6 orb animations + 20 particle animations in JavaScript.
 * This version uses pure CSS @keyframes → runs entirely on the
 * GPU compositor thread with zero JS overhead.
 */
export default function AnimatedBackground() {
    return (
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
            {/* Base dark background */}
            <div className="absolute inset-0 bg-[#0B0C15]" />

            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-900/5 via-transparent to-cyan-900/5" />

            {/* GPU-accelerated floating orbs — CSS only */}
            <div className="vface-orb vface-orb-1" />
            <div className="vface-orb vface-orb-2" />
            <div className="vface-orb vface-orb-3" />

            {/* Animated gradient mesh — CSS only */}
            <div className="absolute inset-0 opacity-30">
                <div className="vface-gradient-mesh" />
            </div>

            {/* Inline noise texture (no external fetch) */}
            <div
                className="absolute inset-0 opacity-15 mix-blend-overlay"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E")`,
                    backgroundRepeat: 'repeat',
                    backgroundSize: '256px 256px',
                }}
            />

            {/* Grid overlay */}
            <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:50px_50px]" />

            {/* Scanning line — CSS only */}
            <div className="vface-scanline" />

            {/* Vignette effect */}
            <div
                className="absolute inset-0"
                style={{
                    background: 'radial-gradient(circle at center, transparent 0%, rgba(11, 12, 21, 0.8) 100%)'
                }}
            />
        </div>
    );
}