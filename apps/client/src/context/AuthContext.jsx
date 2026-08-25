import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import * as authService from '../services/authService.js';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const refreshUser = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);
      return currentUser;
    } catch (requestError) {
      setUser(null);
      if (requestError.response?.status !== 401) setError('Unable to load your account. Please try again.');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { refreshUser(); }, [refreshUser]);

  const value = useMemo(() => ({
    user,
    isLoading,
    error,
    isAuthenticated: Boolean(user),
    register: async (values) => {
      const registeredUser = await authService.register(values);
      setError(null);
      setUser(registeredUser);
      return registeredUser;
    },
    login: async (values) => {
      const loggedInUser = await authService.login(values);
      setError(null);
      setUser(loggedInUser);
      return loggedInUser;
    },
    logout: async () => {
      await authService.logout();
      setUser(null);
      setError(null);
    },
    refreshUser,
  }), [error, isLoading, refreshUser, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
