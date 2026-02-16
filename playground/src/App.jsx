import React, { useState } from 'react';
import Layout from './layout/Layout';
import Register from './pages/Register';
import Verify from './pages/Verify';
import Consent from './pages/Consent';
import Inspect from './pages/Inspect';
import { WalletProvider } from './context/WalletContext';
import './index.css'

function AppContent() {
  const [activeTab, setActiveTab] = useState('Register');
  const [identity, setIdentity] = useState(null);
  const [token, setToken] = useState(null);

  const handleIdentityCreated = (id) => {
    setIdentity(id);
  };

  const handleTokenIssued = (t) => {
    setToken(t);
    setActiveTab('Inspect');
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'Register':
        return <Register onIdentityCreated={handleIdentityCreated} />;
      case 'Verify':
        return <Verify />;
      case 'Consent':
        return <Consent identity={identity} onTokenIssued={handleTokenIssued} />;
      case 'Inspect':
        return <Inspect token={token} />;
      default:
        return <Register />;
    }
  };

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab} identity={identity}>
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
