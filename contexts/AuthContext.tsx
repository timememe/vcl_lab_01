import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { User } from '../types/auth';
import { login as loginRequest, verifyToken, removeToken } from '../services/authService';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Verify JWT token on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const verifiedUser = await verifyToken();
        if (verifiedUser) {
          setUser(verifiedUser);
        }
      } catch (err) {
        console.error('Auth verification failed:', err);
      } finally {
        setLoading(false);
      }
    };

    void checkAuth();
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const authenticatedUser = await loginRequest({ username, password });
      setUser(authenticatedUser);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setError(null);
    removeToken();
  }, []);

  const value = useMemo<AuthContextValue>(() => ({ user, loading, error, login, logout }), [user, loading, error, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
