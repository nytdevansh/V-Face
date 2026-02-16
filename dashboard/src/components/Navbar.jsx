import React, { useState } from 'react';
import { useWallet } from '../context/WalletContext';
import { motion, AnimatePresence } from 'framer-motion';

export default function Navbar() {
    const { account, connectWallet, isConnecting } = useWallet();
    const [showMenu, setShowMenu] = useState(false);
    const [showMobileNav, setShowMobileNav] = useState(false);

    return (
        <nav className="fixed top-0 w-full z-50 bg-[#0B0C15]/80 backdrop-blur-md border-b border-white/5">
            <div className="container mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
                {/* Logo */}
                <div className="flex items-center space-x-3 group cursor-pointer">
                    <motion.div
                        whileHover={{ rotate: 6, scale: 1.1 }}
                        className="w-8 h-8 bg-gradient-to-br from-purple-600 to-cyan-400 rounded-lg flex items-center justify-center transform rotate-3 transition-transform relative"
                    >
                        <span className="text-white font-bold text-lg">V</span>
                        <div className="absolute inset-0 bg-gradient-to-br from-purple-600 to-cyan-400 rounded-lg blur-md opacity-50 group-hover:opacity-75 transition-opacity" />
                    </motion.div>
                    <div className="flex flex-col">
                        <span className="font-bold text-xl tracking-[0.2em] text-white font-mono leading-none">FACE</span>
                        <span className="text-[8px] text-gray-500 tracking-widest font-mono">PROTOCOL v1.0</span>
                    </div>
                </div>

                {/* Navigation Links - Desktop */}
                <div className="hidden md:flex items-center space-x-8">
                    <a href="#" className="text-sm text-gray-400 hover:text-white transition-colors relative group">
                        DOCS
                        <span className="absolute bottom-0 left-0 w-0 h-px bg-cyan-500 group-hover:w-full transition-all duration-300" />
                    </a>
                    <a href="#" className="text-sm text-gray-400 hover:text-white transition-colors relative group">
                        GOVERNANCE
                        <span className="absolute bottom-0 left-0 w-0 h-px bg-cyan-500 group-hover:w-full transition-all duration-300" />
                    </a>
                    <a href="#" className="text-sm text-gray-400 hover:text-white transition-colors relative group">
                        EXPLORER
                        <span className="absolute bottom-0 left-0 w-0 h-px bg-cyan-500 group-hover:w-full transition-all duration-300" />
                    </a>
                </div>

                {/* Wallet Connection */}
                <div className="flex items-center space-x-2 sm:space-x-4">
                    {/* Network Indicator */}
                    <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-purple-500/10 border border-purple-500/20 rounded-sm">
                        <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-pulse" />
                        <span className="text-xs font-mono text-purple-400">POLYGON</span>
                    </div>

                    {account ? (
                        <div className="relative">
                            <button
                                onClick={() => setShowMenu(!showMenu)}
                                className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 bg-white/5 border border-white/10 hover:border-cyan-500/30 rounded-none text-xs font-mono text-cyan-400 transition-colors group"
                            >
                                <div className="w-2 h-2 bg-green-500 rounded-full shadow-[0_0_8px_currentColor]" />
                                <span>{account.slice(0, 6)}...{account.slice(-4)}</span>
                                <svg
                                    className={`w-4 h-4 transition-transform ${showMenu ? 'rotate-180' : ''}`}
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>

                            {/* Dropdown Menu */}
                            <AnimatePresence>
                                {showMenu && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        className="absolute right-0 mt-2 w-64 bg-[#0B0C15] border border-white/10 shadow-xl overflow-hidden z-50"
                                    >
                                        <div className="p-4 border-b border-white/5 bg-white/[0.02]">
                                            <p className="text-xs text-gray-500 mb-1">Connected Address</p>
                                            <p className="text-sm font-mono text-white break-all">{account}</p>
                                        </div>
                                        <div className="p-2">
                                            <button
                                                onClick={() => { navigator.clipboard.writeText(account); setShowMenu(false); }}
                                                className="w-full px-4 py-2 text-left text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-colors flex items-center gap-2"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                </svg>
                                                Copy Address
                                            </button>
                                        </div>
                                        <div className="p-2 border-t border-white/5">
                                            <button className="w-full px-4 py-2 text-left text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors flex items-center gap-2">
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                                </svg>
                                                Disconnect
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    ) : (
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={connectWallet}
                            disabled={isConnecting}
                            className="relative px-4 sm:px-6 py-2 bg-white text-black text-xs font-bold uppercase tracking-widest hover:bg-cyan-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed group overflow-hidden"
                        >
                            {isConnecting ? (
                                <span className="flex items-center gap-2">
                                    <div className="w-3 h-3 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                                    <span className="hidden sm:inline">Connecting...</span>
                                    <span className="sm:hidden">...</span>
                                </span>
                            ) : (
                                <>
                                    <span className="relative z-10">Connect</span>
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-400/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                                </>
                            )}
                        </motion.button>
                    )}

                    {/* Mobile Menu Button */}
                    <button
                        onClick={() => setShowMobileNav(!showMobileNav)}
                        className="md:hidden p-2 text-gray-400 hover:text-white transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            {showMobileNav ? (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            )}
                        </svg>
                    </button>
                </div>
            </div>

            {/* Mobile Navigation */}
            <AnimatePresence>
                {showMobileNav && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="md:hidden border-t border-white/5 bg-[#0B0C15]/95 backdrop-blur-md"
                    >
                        <div className="px-4 py-3 space-y-2">
                            {['DOCS', 'GOVERNANCE', 'EXPLORER'].map(link => (
                                <a key={link} href="#" className="block px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-colors">
                                    {link}
                                </a>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </nav>
    );
}