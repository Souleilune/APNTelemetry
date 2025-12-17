import { api } from '@/lib/api';
import React, { createContext, useContext, useEffect, useState } from 'react';

interface User {
  id: string;
  email: string;
  fullName?: string;
  createdAt?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error?: string; message?: string }>;
  signIn: (email: string, password: string) => Promise<{ error?: string; message?: string }>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Check authentication status on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const isAuth = await api.isAuthenticated();
      
      if (isAuth) {
        const response = await api.getCurrentUser();
        
        if (response.data?.user) {
          setUser(response.data.user);
        } else {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Auth check error:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    try {
      const response = await api.register({ email, password, fullName });

      if (response.error) {
        return { 
          error: response.error, 
          message: response.message || 'Registration failed' 
        };
      }

      return { message: 'Registration successful! Please sign in.' };
    } catch (error) {
      return { 
        error: 'Registration error', 
        message: error instanceof Error ? error.message : 'An error occurred' 
      };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const response = await api.login({ email, password });

      if (response.error) {
        return { 
          error: response.error, 
          message: response.message || 'Login failed' 
        };
      }

      if (response.data?.user) {
        setUser(response.data.user);
      }

      return { message: 'Login successful!' };
    } catch (error) {
      return { 
        error: 'Login error', 
        message: error instanceof Error ? error.message : 'An error occurred' 
      };
    }
  };

  const signOut = async () => {
    try {
      await api.logout();
      setUser(null);
    } catch (error) {
      console.error('Sign out error:', error);
      // Clear user even if API call fails
      setUser(null);
    }
  };

  const refreshUser = async () => {
    try {
      const response = await api.getCurrentUser();
      
      if (response.data?.user) {
        setUser(response.data.user);
      }
    } catch (error) {
      console.error('Refresh user error:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signUp,
        signIn,
        signOut,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}