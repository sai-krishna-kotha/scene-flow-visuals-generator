import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi, User, AuthResponse } from '../services/api/auth';
import { setAccessToken } from '../services/api/client';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// React StrictMode intentionally mounts effects twice in development.
// Deduplicate the one-time session bootstrap so both mounts share the same
// refresh request instead of rotating the same refresh token concurrently.
let authInitializationPromise: Promise<AuthResponse> | null = null;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize the auth state on mount
  useEffect(() => {
    let isMounted = true;
    
    const initAuth = async () => {
      try {
        // The access token intentionally lives only in memory. On a fresh page
        // load there is no access token yet, so rehydrate the session directly
        // from the HttpOnly refresh cookie instead of making an expected 401
        // request to /auth/me first.
        if (!authInitializationPromise) {
          authInitializationPromise = authApi.refresh().finally(() => {
            authInitializationPromise = null;
          });
        }

        const data = await authInitializationPromise;
        if (isMounted) {
          setAccessToken(data.access_token);
          setUser(data.user);
        }
      } catch (err) {
        // No valid refresh session means the user is simply signed out.
        if (isMounted) {
          setAccessToken(null);
          setUser(null);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    
    initAuth();
    
    // Listen for the unauthorized event from the interceptor
    const handleUnauthorized = () => {
      setUser(null);
    };
    window.addEventListener('auth:unauthorized', handleUnauthorized);
    
    return () => {
      isMounted = false;
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, []);

  const login = async (email: string, password: string) => {
    const data = await authApi.login(email, password);
    setAccessToken(data.access_token);
    setUser(data.user);
  };

  const register = async (email: string, password: string) => {
    const data = await authApi.register(email, password);
    setAccessToken(data.access_token);
    setUser(data.user);
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (err) {
      console.error('Logout failed:', err);
    } finally {
      setAccessToken(null);
      setUser(null);
    }
  };

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    login,
    register,
    logout
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
