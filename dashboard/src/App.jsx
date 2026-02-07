import React from 'react';
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import AnimatedBackground from './components/AnimatedBackground';
import { useWallet } from './context/WalletContext';
import { motion } from 'framer-motion';

function App() {
  const { account, connectWallet, isConnecting } = useWallet();

  return (
    <div className="min-h-screen font-sans selection:bg-cyan-500/30 selection:text-cyan-200 text-gray-100 relative overflow-hidden">
      <AnimatedBackground />
      <div className="relative z-10">
        <Navbar />

        <main className="container mx-auto px-4 py-8">
          {!account ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="flex flex-col items-center justify-center min-h-[75vh] text-center space-y-12"
            >
              <div className="space-y-6 max-w-4xl">
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2, duration: 0.8 }}
                  className="relative inline-block"
                >
                  <div className="absolute -inset-4 bg-gradient-to-r from-purple-600 to-cyan-500 rounded-lg blur-xl opacity-30 animate-pulse" />
                  <h1 className="relative text-7xl md:text-9xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white via-white to-gray-400">
                    V-FACE
                  </h1>
                </motion.div>

                <motion.h2
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="text-2xl md:text-3xl font-light text-cyan-100/80 tracking-wide"
                >
                  IMMUTABLE IDENTITY PROTOCOL
                </motion.h2>

                <motion.p
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 }}
                  className="text-lg text-gray-400 max-w-2xl mx-auto leading-relaxed border-l-2 border-purple-500/50 pl-6 text-left"
                >
                  Reclaim your biometric sovereignty. Secure your face encoding on the
                  <span className="text-purple-400 font-mono"> Polygon</span> network.
                  Resistant to censorship. Owned by <span className="text-cyan-400 font-bold">YOU</span>.
                </motion.p>
              </div>

              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.8 }}
                whileHover={{ scale: 1.05, boxShadow: "0 0 40px rgba(124, 58, 237, 0.4)" }}
                whileTap={{ scale: 0.95 }}
                onClick={connectWallet}
                disabled={isConnecting}
                className="group relative px-10 py-5 bg-white text-black font-bold text-xl rounded-none hover:bg-cyan-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="absolute inset-0 border-2 border-white translate-x-1 translate-y-1 group-hover:translate-x-2 group-hover:translate-y-2 transition-transform duration-200 pointer-events-none" />
                <span className="relative z-10">
                  {isConnecting ? "INITIALIZING UPLINK..." : "CONNECT WALLET"}
                </span>
              </motion.button>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-20 w-full max-w-6xl">
                <FeatureCard
                  icon="🛡️"
                  title="Zero-Knowledge"
                  desc="Oracles verify your identity without leaking raw biometric data."
                  delay={1.0}
                />
                <FeatureCard
                  icon="⛓️"
                  title="Censorship Resistant"
                  desc="Your registration is etched into the blockchain. Forever."
                  delay={1.2}
                />
                <FeatureCard
                  icon="⚡"
                  title="Instant Consensus"
                  desc="Grant access to AI agents and dApps in milliseconds."
                  delay={1.4}
                />
              </div>

              {/* Trust Indicators */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.6 }}
                className="flex items-center justify-center gap-8 mt-12 text-xs text-gray-600"
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span>POLYGON MAINNET</span>
                </div>
                <div className="w-px h-4 bg-gray-800" />
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>AUDITED SMART CONTRACTS</span>
                </div>
                <div className="w-px h-4 bg-gray-800" />
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                  </svg>
                  <span>OPEN SOURCE</span>
                </div>
              </motion.div>
            </motion.div>
          ) : (
            <Dashboard />
          )}
        </main>
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, desc, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      whileHover={{ y: -10, borderColor: 'rgba(34, 211, 238, 0.3)' }}
      className="p-8 bg-gray-900/40 backdrop-blur-md border border-white/5 transition-all text-left group"
    >
      <div className="text-5xl mb-6 grayscale group-hover:grayscale-0 transition-all duration-500">{icon}</div>
      <h3 className="text-xl font-bold mb-3 text-white font-mono group-hover:text-cyan-400 transition-colors">
        {title}
      </h3>
      <p className="text-gray-400 text-sm leading-relaxed border-t border-gray-800 pt-4 group-hover:border-cyan-500/20 transition-colors">
        {desc}
      </p>
    </motion.div>
  );
}

export default App;