import React, { useState } from 'react';
import Layout from './layout/Layout';
import Register from './pages/Register';
import Verify from './pages/Verify';
import { WalletProvider } from './context/WalletContext';
import './index.css'

function AppContent() {
  const [activeTab, setActiveTab] = useState('Register');
  const [identity, setIdentity] = useState(null);

  const handleIdentityCreated = (id) => {
    setIdentity(id);
    // Optional: don't auto-switch, let user choose
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'Register':
        return <Register onIdentityCreated={handleIdentityCreated} />;
      case 'Verify':
        return <Verify />;
      default:
        return <Register />;
    }
  };

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab}>
      {renderContent()}
    </Layout>
  );
}

export default function App() {
  return (
    <WalletProvider>
      <AppContent />
    </WalletProvider>
  );
}
