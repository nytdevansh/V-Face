import React from 'react';
import { useWallet } from '../context/WalletContext';

export default function Layout({ children, activeTab, onTabChange }) {
    const { account, connectWallet, isConnected } = useWallet();

    const truncate = (str) => str ? `${str.slice(0, 6)}...${str.slice(-4)}` : '';

    const tabs = ['Register', 'Verify', 'Consent', 'Inspect'];

    return (
        <div className="min-h-screen bg-gray-900 text-gray-100 font-sans">
            <nav className="border-b border-gray-800 bg-gray-900/50 backdrop-blur fixed w-full top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-14 sm:h-16">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <span className="text-lg sm:text-xl font-bold bg-gradient-to-r from-purple-500 to-cyan-500 bg-clip-text text-transparent">
                                    V-FACE
                                </span>
                                <span className="ml-2 text-[10px] sm:text-xs text-gray-500 font-mono">PLAYGROUND</span>
                            </div>
                            {/* Desktop tabs */}
                            <div className="hidden md:block">
                                <div className="ml-10 flex items-baseline space-x-4">
                                    {tabs.map((tab) => (
                                        <button
                                            key={tab}
                                            onClick={() => onTabChange(tab)}
                                            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === tab
                                                ? 'bg-gray-800 text-white'
                                                : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                                                }`}
                                        >
                                            {tab}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div>
                            {isConnected ? (
                                <div className="flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-gray-800 rounded-full border border-gray-700">
                                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                    <span className="font-mono text-[10px] sm:text-xs text-gray-300">{truncate(account)}</span>
                                </div>
                            ) : (
                                <button
                                    onClick={connectWallet}
                                    className="px-3 sm:px-4 py-1.5 sm:py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-bold rounded-full transition-colors"
                                >
                                    Connect
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Mobile tab bar */}
                <div className="md:hidden border-t border-gray-800 overflow-x-auto">
                    <div className="flex">
                        {tabs.map((tab) => (
                            <button
                                key={tab}
                                onClick={() => onTabChange(tab)}
                                className={`flex-1 min-w-0 px-3 py-2.5 text-xs font-medium text-center transition-colors border-b-2 ${activeTab === tab
                                    ? 'text-white border-purple-500 bg-gray-800/50'
                                    : 'text-gray-400 border-transparent hover:text-gray-200 hover:bg-gray-800/30'
                                    }`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>
                </div>
            </nav>
            <main className="pt-[6.5rem] md:pt-20 pb-12 px-4 max-w-7xl mx-auto">
                {children}
            </main>
        </div>
    );
}

