import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AuthResponse, authService, setTokenExpirationCallback } from '../services/AuthService';
import { storageService } from '../services/StorageService';


interface AuthContextType {
  isAuthenticated: boolean;
  user: AuthResponse | null;
  login: (username: string, password: string) => Promise<void>;
  register: (userData: {
    username: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    password: string;
    organisationId?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<AuthResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const isAuth = await storageService.isAuthenticated();
      if (isAuth) {
        const userData = await storageService.getUserData();
        setUser(userData);
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (username: string, password: string) => {
    try {
      const authResponse = await authService.login({ username, password });
      await storageService.storeAuthData(authResponse);
      setUser(authResponse);
      setIsAuthenticated(true);
      
      // SignalR connection is handled by NotificationContext
    } catch (error) {
      throw error;
    }
  };

  const register = async (userData: {
    username: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    password: string;
    organisationId?: string;
  }) => {
    try {
      const authResponse = await authService.register(userData);
      await storageService.storeAuthData(authResponse);
      setUser(authResponse);
      setIsAuthenticated(true);
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      // SignalR disconnection is handled by NotificationContext
      
      await storageService.clearAuthData();
      setUser(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  // Set up token expiration callback
  useEffect(() => {
    const handleTokenExpiration = () => {
      console.log('Token expired, logging out user');
      logout();
    };

    setTokenExpirationCallback(handleTokenExpiration);

    // Cleanup function to remove the callback when component unmounts
    return () => {
      setTokenExpirationCallback(() => {});
    };
  }, []);

  const value: AuthContextType = {
    isAuthenticated,
    user,
    login,
    register,
    logout,
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 