'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import * as api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sb_token');
    }
    return null;
  });
  const [loading, setLoading] = useState(true);

  // Fetch user profile when token is available
  useEffect(() => {
    if (token) {
      api.getUser().then(u => {
        setUser(u);
        setLoading(false);
      }).catch(() => {
        setToken(null);
        localStorage.removeItem('sb_token');
        localStorage.removeItem('sb_refresh');
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, [token]);

  // Listen for forced-logout events emitted by api.js on unrecoverable 401
  useEffect(() => {
    const handleForceLogout = () => {
      setUser(null);
      setToken(null);
    };
    window.addEventListener('auth:logout', handleForceLogout);
    return () => window.removeEventListener('auth:logout', handleForceLogout);
  }, []);

  const login = async (email, password) => {
    const res = await api.login(email, password);
    const tok = res.access_token || res.token;
    setToken(tok);
    localStorage.setItem('sb_token', tok);
    if (res.refresh_token) {
      localStorage.setItem('sb_refresh', res.refresh_token);
    }
    const u = await api.getUser();
    setUser(u);
    return u;
  };

  const register = async (username, email, password) => {
    return api.register(username, email, password);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('sb_token');
    localStorage.removeItem('sb_refresh');
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export default AuthContext;
