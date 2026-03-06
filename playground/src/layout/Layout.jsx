import React, { useState } from 'react';
import { useWallet } from '../context/WalletContext';
import { AnimatePresence, motion } from 'framer-motion';

export default function Layout({ children, activeTab, onTabChange }) {
    const { account, connectWallet, isConnecting, isConnected, error, clearError } = useWallet();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const truncate = (str) => str ? `${str.slice(0, 6)}...${str.slice(-4)}` : '';

    const tabs = [
        { name: 'Register', icon: '📝', desc: 'Register your face' },
        { name: 'Verify', icon: '✓', desc: 'Verify identity' },
        { name: 'Consent', icon: '🔐', desc: 'Manage consent' },
        { name: 'Inspect', icon: '🔍', desc: 'Inspect token' }
    ];

    return (
        <div className="min-h-screen bg-gray-950 text-gray-100 font-sans">
            {/* Error Toast Notification */}
            <AnimatePresence>
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="fixed top-24 left-1/2 transform -translate-x-1/2 z-50 max-w-md px-4 sm:px-0"
                    >
                        <div className="bg-red-900/90 backdrop-blur-md border border-red-500/50 rounded-lg p-4 shadow-lg">
                            <div className="flex items-start gap-3">
                                <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                                <div className="flex-1">
                                    <h3 className="font-semibold text-red-200">Connection Error</h3>
                                    <p className="text-sm text-red-300 mt-1">{error}</p>
                                </div>
                                <button
                                    onClick={clearError}
                                    className="text-red-400 hover:text-red-300 transition-colors flex-shrink-0"
                                >
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Navigation Header */}
            <nav className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-md fixed w-full top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16 sm:h-20">
                        {/* Logo */}
                        <div className="flex items-center space-x-3">
                            <div className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-cyan-500 bg-clip-text text-transparent">
                                V-FACE
                            </div>
                            <div className="hidden sm:block text-[11px] text-gray-500 font-mono tracking-widest">
                                INTERACTIVE PLAYGROUND
                            </div>
                        </div>

                        {/* Desktop Navigation */}
                        <div className="hidden lg:flex items-center space-x-1">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.name}
                                    onClick={() => onTabChange(tab.name)}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                        activeTab === tab.name
                                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                                            : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
                                    }`}
                                >
                                    {tab.icon} {tab.name}
                                </button>
                            ))}
                        </div>

                        {/* Wallet Connection Button */}
                        <div className="flex items-center gap-2 sm:gap-3">
                            {isConnected ? (
                                <div className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-gray-800/50 rounded-full border border-gray-700 hover:border-cyan-500/30 transition-colors">
                                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                    <span className="font-mono text-[10px] sm:text-xs text-gray-300 hidden sm:inline">{truncate(account)}</span>
                                    <span className="font-mono text-[10px] text-gray-400 sm:hidden">{truncate(account)}</span>
                                </div>
                            ) : (
                                <button
                                    onClick={connectWallet}
                                    disabled={isConnecting}
                                    className="px-3 sm:px-5 py-2 bg-gradient-to-r from-cyan-500 to-cyan-400 hover:from-cyan-400 hover:to-cyan-300 text-gray-950 text-xs sm:text-sm font-bold rounded-lg transition-all hover:shadow-lg hover:shadow-cyan-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isConnecting ? "CONNECTING..." : "CONNECT"}
                                </button>
                            )}

                            {/* Mobile Menu Toggle */}
                            <button
                                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                                className="lg:hidden p-2 hover:bg-gray-800 rounded-lg transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={mobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* Mobile Tab Bar */}
                    {mobileMenuOpen && (
                        <div className="lg:hidden border-t border-gray-800 py-2">
                            <div className="grid grid-cols-2 gap-2">
                                {tabs.map((tab) => (
                                    <button
                                        key={tab.name}
                                        onClick={() => {
                                            onTabChange(tab.name);
                                            setMobileMenuOpen(false);
                                        }}
                                        className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                                            activeTab === tab.name
                                                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                                                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
                                        }`}
                                    >
                                        {tab.icon} {tab.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </nav>

            {/* Main Content */}
            <main className="pt-20 sm:pt-24 pb-12 px-4 max-w-7xl mx-auto">
                <div className="animate-fadeIn">
                    {children}
                </div>
            </main>

            {/* Footer Status Bar */}
            <footer className="border-t border-gray-800 bg-gray-900/30 backdrop-blur py-4 px-4 mt-12">
                <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                            <span className="font-mono">POLYGON MAINNET</span>
                        </div>
                    </div>
                    <div className="text-gray-600 mt-2 sm:mt-0">
                        V-FACE Protocol © 2024 — All Rights Reserved
                    </div>
                </div>
            </footer>

            <style>{`
                @keyframes fadeIn {
                    from {
                        opacity: 0;
                        transform: translateY(10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                .animate-fadeIn {
                    animation: fadeIn 0.3s ease-out;
                }
            `}</style>
        </div>
    );
}

