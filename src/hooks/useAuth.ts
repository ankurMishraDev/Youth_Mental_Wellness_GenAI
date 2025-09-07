import { useState, useEffect, useCallback } from 'react';
import { authService, type User } from '../services/auth';

interface UseAuthReturn {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => void;
  saveName: (name: string) => Promise<void>;
  getUserSummary: () => Promise<object | null>;
  error: string | null;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Subscribe to auth state changes
  useEffect(() => {
    const unsubscribe = authService.onAuthStateChanged((user) => {
      setUser(user);
      setIsLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      setError(null);
      setIsLoading(true);
      await authService.login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signup = useCallback(async (email: string, password: string) => {
    try {
      setError(null);
      setIsLoading(true);
      await authService.signup(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    authService.logout();
    setError(null);
  }, []);

  const saveName = useCallback(async (name: string) => {
    try {
      setError(null);
      await authService.saveName(name);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save name');
      throw err;
    }
  }, []);

  const getUserSummary = useCallback(async () => {
    try {
      setError(null);
      return await authService.getUserSummary();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get summary');
      throw err;
    }
  }, []);

  return {
    user,
    isAuthenticated: authService.isAuthenticated(),
    isLoading,
    login,
    signup,
    logout,
    saveName,
    getUserSummary,
    error,
  };
}
