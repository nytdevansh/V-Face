/**
 * V-FACE WebAuthn Client Hook
 * Usage: const { registerMFA, authenticateMFA, hasMFA } = useWebAuthn(wallet)
 *
 * Wraps @simplewebauthn/browser for easy React integration.
 */

import { useState, useCallback } from 'react';
import {
  startRegistration,
  startAuthentication,
  browserSupportsWebAuthn,
} from '@simplewebauthn/browser';

const API = import.meta.env.VITE_REGISTRY_URL || 'http://localhost:3000';

export function useWebAuthn(wallet, authToken) {
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);
  const [hasMFA,   setHasMFA]   = useState(false);

  const headers = {
    'Content-Type':  'application/json',
    'Authorization': `Bearer ${authToken}`,
  };

  const supported = browserSupportsWebAuthn();

  /**
   * Register a WebAuthn credential (called after face registration).
   * Prompts user to touch their hardware key / use TouchID.
   */
  const registerMFA = useCallback(async () => {
    if (!supported) throw new Error('WebAuthn not supported in this browser');
    if (!wallet)    throw new Error('Wallet not connected');

    setLoading(true);
    setError(null);

    try {
      // 1. Get options from server
      const optRes = await fetch(`${API}/webauthn/register/begin`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ wallet }),
      });
      if (!optRes.ok) throw new Error(await optRes.text());
      const options = await optRes.json();

      // 2. Prompt user (browser shows native dialog)
      const registrationResponse = await startRegistration(options);

      // 3. Verify with server
      const verRes = await fetch(`${API}/webauthn/register/finish`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ wallet, registrationResponse }),
      });
      if (!verRes.ok) throw new Error(await verRes.text());
      const result = await verRes.json();

      setHasMFA(true);
      return result;
    } catch (err) {
      // User cancelled: err.name === 'NotAllowedError'
      const msg = err.name === 'NotAllowedError'
        ? 'WebAuthn registration cancelled'
        : err.message;
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  }, [wallet, authToken, supported]);

  /**
   * Authenticate with WebAuthn (second factor after face verification).
   * Returns verified: true if assertion passes.
   */
  const authenticateMFA = useCallback(async () => {
    if (!supported) throw new Error('WebAuthn not supported');
    if (!wallet)    throw new Error('Wallet not connected');

    setLoading(true);
    setError(null);

    try {
      // 1. Get challenge
      const optRes = await fetch(`${API}/webauthn/auth/begin`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ wallet }),
      });
      if (!optRes.ok) throw new Error(await optRes.text());
      const options = await optRes.json();

      // 2. Prompt user
      const authResponse = await startAuthentication(options);

      // 3. Verify
      const verRes = await fetch(`${API}/webauthn/auth/finish`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ wallet, authResponse }),
      });
      if (!verRes.ok) throw new Error(await verRes.text());
      return verRes.json();
    } catch (err) {
      const msg = err.name === 'NotAllowedError'
        ? 'WebAuthn authentication cancelled or timed out'
        : err.message;
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  }, [wallet, authToken, supported]);

  return { registerMFA, authenticateMFA, hasMFA, loading, error, supported };
}
