import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { adminLogin, adminLogout, getAdminMe } from '../services/adminAuthApi';
import { setUnauthorizedHandler } from '../services/apiClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  const [status, setStatus] = useState('loading'); // 'loading' | 'authenticated' | 'anonymous'

  const checkAuth = useCallback(async () => {
    try {
      const data = await getAdminMe();
      if (data?.admin) {
        setAdmin(data.admin);
        setStatus('authenticated');
      } else {
        setAdmin(null);
        setStatus('anonymous');
      }
    } catch {
      setAdmin(null);
      setStatus('anonymous');
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Hook global 401 interceptor
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setAdmin(null);
      setStatus('anonymous');
    });

    return () => {
      setUnauthorizedHandler(null);
    };
  }, []);

  const login = useCallback(async (mobile, password) => {
    const data = await adminLogin(mobile, password);
    setAdmin(data.admin);
    setStatus('authenticated');
    return data;
  }, []);

  const logout = useCallback(async () => {
    try {
      await adminLogout();
    } catch {
      // Even if API fails, clear in-memory state
    } finally {
      setAdmin(null);
      setStatus('anonymous');
    }
  }, []);

  return (
    <AuthContext.Provider value={{ admin, status, login, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
