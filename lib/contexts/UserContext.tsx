'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { User } from '../types';

interface UserContextType {
  user: User | null;
  isLoading: boolean;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
}

const UserContext = createContext<UserContextType>({
  user: null,
  isLoading: true,
  refreshUser: async () => {},
  logout: async () => {},
});

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const fetchAttempts = useRef(0);
  const maxRetries = 3;

  const fetchUser = useCallback(async (isRetry = false) => {
    try {
      // Add small delay on retries to let cookies propagate
      if (isRetry && fetchAttempts.current > 0) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      const response = await fetch('/api/auth/me', {
        credentials: 'include',
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.user) {
          setUser(data.user);
          fetchAttempts.current = 0;
          return true;
        }
      }
      
      setUser(null);
      return false;
    } catch (error) {
      console.error('Failed to fetch user:', error);
      setUser(null);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    setIsLoading(true);
    fetchAttempts.current = 0;
    
    // Try fetching with retries
    let success = false;
    while (fetchAttempts.current < maxRetries && !success) {
      fetchAttempts.current++;
      success = await fetchUser(fetchAttempts.current > 1);
      
      if (!success && fetchAttempts.current < maxRetries) {
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    if (!success) {
      console.warn('Failed to refresh user after multiple attempts');
    }
  }, [fetchUser]);

  const logout = useCallback(async () => {
    try {
      // Call logout API to clear cookie
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      
      // Clear user state
      setUser(null);
      fetchAttempts.current = 0;
      
      // Force a hard redirect to clear all state
      window.location.href = '/auth';
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  return (
    <UserContext.Provider value={{ user, isLoading, refreshUser, logout }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within UserProvider');
  }
  return context;
}
