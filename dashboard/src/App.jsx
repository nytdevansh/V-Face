import React, { useState } from 'react';
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import AnimatedBackground from './components/AnimatedBackground';
import { useWallet } from './context/WalletContext';
import { motion } from 'framer-motion';

function App() {
  const { account, connectWallet, isConnecting } = useWallet();
  const [showDashboard, setShowDashboard] = useState(false);

  return (
    <div className="min-h-screen font-sans selection:bg-cyan-500/30 selection:text-cyan-200 text-gray-100 relative overflow-hidden bg-gray-950">
      <AnimatedBackground />
      <div className="relative z-10">
        <Navbar />

        <main className="container mx-auto px-4 py-12 md:py-16">
          {!account ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="flex flex-col items-center justify-center min-h-[80vh] text-center space-y-12"
            >
              <div className="space-y-8 max-w-4xl">
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1, duration: 0.8 }}
                  className="relative inline-block"
                >
                  <div className="absolute -inset-6 bg-gradient-to-r from-purple-600 to-cyan-500 rounded-2xl blur-2xl opacity-25 animate-pulse" />
                  <h1 className="relative text-6xl md:text-8xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-cyan-300 via-white to-gray-300">
                    V-FACE
                  </h1>
                </motion.div>

                <motion.h2
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-xl md:text-2xl font-light text-gray-300 tracking-widest"
                >
                  IMMUTABLE IDENTITY PROTOCOL
                </motion.h2>

                <motion.p
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 }}
                  className="text-lg text-gray-300 max-w-2xl mx-auto leading-relaxed border-l-2 border-cyan-500/40 pl-6 text-left"
                >
                  Reclaim your biometric sovereignty. Secure your face encoding on the
                  <span className="text-cyan-400 font-mono"> Polygon</span> network.
                  Resistant to censorship. Owned by <span className="text-cyan-300 font-bold">YOU</span>.
                </motion.p>
              </div>

              <motion.button
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.7 }}
                whileHover={{ scale: 1.05, boxShadow: "0 0 35px rgba(6, 182, 212, 0.3)" }}
                whileTap={{ scale: 0.98 }}
                onClick={connectWallet}
                disabled={isConnecting}
                className="relative px-8 py-4 bg-gradient-to-r from-cyan-500 to-cyan-400 text-gray-950 font-bold text-lg rounded-lg hover:from-cyan-400 hover:to-cyan-300 transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-lg hover:shadow-cyan-500/50"
              >
                <span className="relative z-10">
                  {isConnecting ? "INITIALIZING..." : "CONNECT WALLET"}
                </span>
              </motion.button>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20 w-full max-w-5xl">
                <FeatureCard
                  icon="🛡️"
                  title="Cryptographic Security"
                  desc="Zero-knowledge proofs verify your identity without exposing raw biometric data."
                  delay={1.0}
                />
                <FeatureCard
                  icon="⛓️"
                  title="Blockchain Immutable"
                  desc="Your registration is permanently recorded on Polygon, censorship-resistant."
                  delay={1.2}
                />
                <FeatureCard
                  icon="⚡"
                  title="Instant Access Control"
                  desc="Grant or revoke access to AI agents and dApps in real-time."
                  delay={1.4}
                />
              </div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.5 }}
                className="flex flex-wrap items-center justify-center gap-6 mt-16 text-xs text-gray-500"
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="font-mono">POLYGON MAINNET</span>
                </div>
                <div className="w-px h-4 bg-gray-700" />
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>AUDITED CONTRACTS</span>
                </div>
                <div className="w-px h-4 bg-gray-700" />
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
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      whileHover={{ y: -8 }}
      className="p-7 bg-gradient-to-br from-gray-800/60 to-gray-900/40 backdrop-blur-lg border border-gray-700/50 hover:border-cyan-500/30 rounded-xl transition-all text-left group cursor-default"
    >
      <div className="text-4xl mb-4 transform group-hover:scale-110 transition-transform duration-300">{icon}</div>
      <h3 className="text-lg font-bold mb-2 text-gray-100 group-hover:text-cyan-300 transition-colors">
        {title}
      </h3>
      <p className="text-gray-400 text-sm leading-relaxed font-light">
        {desc}
      </p>
    </motion.div>
  );
}

export default App;