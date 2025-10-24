'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

interface UserContextType {
  userId: string | null;
  isLoading: boolean;
}

const UserContext = createContext<UserContextType>({
  userId: null,
  isLoading: true,
});

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Get user ID from localStorage (set during login)
    const storedUserId = localStorage.getItem('userId');
    setUserId(storedUserId);
    setIsLoading(false);
  }, []);

  return (
    <UserContext.Provider value={{ userId, isLoading }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
