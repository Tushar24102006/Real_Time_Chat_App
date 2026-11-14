import React, { createContext, useState, useEffect, useCallback } from 'react';
import { authApi, userApi } from '../services/api';

export const AuthContext = createContext({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  login: async () => {},
  register: async () => {},
  logout: () => {}
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('preppulse_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('preppulse_token'));
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(() => {
    localStorage.removeItem('preppulse_token');
    localStorage.removeItem('preppulse_user');
    setToken(null);
    setUser(null);
  }, []);

  // Sync token and verify user on startup
  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('preppulse_token');
      if (storedToken) {
        try {
          const profile = await userApi.getCurrentUser();
          setUser(profile);
          localStorage.setItem('preppulse_user', JSON.stringify(profile));
        } catch (err) {
          console.warn('Stored session invalid or expired:', err);
          logout();
        }
      }
      setIsLoading(false);
    };

    initializeAuth();

    // Auto-logout listener triggered by Axios 401 interceptor
    const handleExpired = () => logout();
    window.addEventListener('preppulse:auth-expired', handleExpired);
    return () => window.removeEventListener('preppulse:auth-expired', handleExpired);
  }, [logout]);

  const login = async (credentials) => {
    const data = await authApi.login(credentials);
    localStorage.setItem('preppulse_token', data.accessToken);
    localStorage.setItem('preppulse_user', JSON.stringify(data.user));
    setToken(data.accessToken);
    setUser(data.user);
    return data;
  };

  const register = async (userData) => {
    const data = await authApi.register(userData);
    localStorage.setItem('preppulse_token', data.accessToken);
    localStorage.setItem('preppulse_user', JSON.stringify(data.user));
    setToken(data.accessToken);
    setUser(data.user);
    return data;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        register,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

