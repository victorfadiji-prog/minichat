import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import authService from '../services/authService';

const AuthContext = createContext(null);

/**
 * AuthProvider — manages authentication state.
 * Provides user, token, login, register, logout to all children.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => authService.getUser());
  const [token, setToken] = useState(() => authService.getToken());
  const [loading, setLoading] = useState(true);

  // Verify token on mount
  useEffect(() => {
    const verifyAuth = async () => {
      if (token) {
        try {
          const data = await authService.getMe();
          if (data.success) {
            setUser(data.user);
            localStorage.setItem('minichat_user', JSON.stringify(data.user));
          } else {
            handleLogout();
          }
        } catch {
          handleLogout();
        }
      }
      setLoading(false);
    };
    verifyAuth();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLogin = useCallback(async (email, password) => {
    const data = await authService.login(email, password);
    if (data.success) {
      setUser(data.user);
      setToken(data.token);
    }
    return data;
  }, []);

  const handleRegister = useCallback(async (username, email, password) => {
    const data = await authService.register(username, email, password);
    if (data.success) {
      setUser(data.user);
      setToken(data.token);
    }
    return data;
  }, []);

  const handleLogout = useCallback(async () => {
    await authService.logout();
    setUser(null);
    setToken(null);
  }, []);

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!token && !!user,
    login: handleLogin,
    register: handleRegister,
    logout: handleLogout,
    setUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
