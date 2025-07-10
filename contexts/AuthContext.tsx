import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AuthResponse, authService, setTokenExpirationCallback } from '../services/AuthService';
import { storageService } from '../services/StorageService';
import { debugLogger } from '../utils/DebugLogger';

const logger = debugLogger;

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
  tokenValidating: boolean;
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
  const [tokenValidating, setTokenValidating] = useState(false);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      setLoading(true);
      logger.log('Checking authentication status on app startup');
      
      const isAuth = await storageService.isAuthenticated();
      if (isAuth) {
        const userData = await storageService.getUserData();
        if (userData && userData.token) {
          logger.log('User data found, validating token');
          
          // Validate token before setting authenticated state
          const isTokenValid = await validateToken(userData.token);
          if (isTokenValid) {
            logger.log('Token is valid, setting authenticated state');
            setUser(userData);
            setIsAuthenticated(true);
          } else {
            logger.warn('Token is expired or invalid, clearing auth data');
            await handleTokenExpiration();
          }
        } else {
          logger.warn('No user data or token found, clearing auth data');
          await handleTokenExpiration();
        }
      } else {
        logger.log('No authentication data found');
      }
    } catch (error) {
      logger.error('Error checking auth status:', error);
      // If there's an error checking auth status, clear auth data to be safe
      await handleTokenExpiration();
    } finally {
      setLoading(false);
    }
  };

  const validateToken = async (token: string): Promise<boolean> => {
    try {
      setTokenValidating(true);
      logger.log('Validating token with server');
      
      // Test token validity by making a simple API call
      const isValid = await authService.testTokenValidity();
      
      if (isValid) {
        logger.log('Token validation successful');
        return true;
      } else {
        logger.warn('Token validation failed - token is invalid or expired');
        return false;
      }
    } catch (error) {
      logger.error('Token validation error:', error instanceof Error ? error.message : 'Unknown error');
      logger.error('Token validation error details:', { 
        errorType: error?.constructor?.name,
        errorMessage: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      return false;
    } finally {
      setTokenValidating(false);
    }
  };

  const handleTokenExpiration = async () => {
    try {
      logger.log('Handling token expiration');
      await storageService.clearAuthData();
      setUser(null);
      setIsAuthenticated(false);
    } catch (error) {
      logger.error('Error handling token expiration:', error);
    }
  };

  const login = async (username: string, password: string) => {
    try {
      logger.log('Starting login process');
      const authResponse = await authService.login({ username, password });
      
      // Validate the new token immediately
      logger.log('Login successful, validating token');
      const isTokenValid = await validateToken(authResponse.token);
      if (!isTokenValid) {
        logger.error('Token validation failed after login');
        logger.error('Token validation failure details:', {
          userId: authResponse.userId,
          tokenLength: authResponse.token?.length || 0,
          tokenPreview: authResponse.token ? `${authResponse.token.substring(0, 10)}...${authResponse.token.substring(authResponse.token.length - 10)}` : 'No token'
        });
        // Clear any partial auth data
        await storageService.clearAuthData();
        throw new Error('Login successful but session validation failed. Please try again.');
      }
      
      await storageService.storeAuthData(authResponse);
      setUser(authResponse);
      setIsAuthenticated(true);
      
      logger.log('Login successful and token validated');
      
      // SignalR connection is handled by NotificationContext
    } catch (error) {
      logger.error('Login error:', error instanceof Error ? error.message : 'Unknown error');
      logger.error('Login error details:', {
        errorType: error?.constructor?.name,
        errorMessage: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      // Ensure auth data is cleared on any login error
      await storageService.clearAuthData();
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
      logger.log('Starting registration process');
      const authResponse = await authService.register(userData);
      
      // Validate the new token immediately
      logger.log('Registration successful, validating token');
      const isTokenValid = await validateToken(authResponse.token);
      if (!isTokenValid) {
        logger.error('Token validation failed after registration');
        // Clear any partial auth data
        await storageService.clearAuthData();
        throw new Error('Registration successful but session validation failed. Please try again.');
      }
      
      await storageService.storeAuthData(authResponse);
      setUser(authResponse);
      setIsAuthenticated(true);
      
      logger.log('Registration successful and token validated');
    } catch (error) {
      logger.error('Registration error:', error);
      // Ensure auth data is cleared on any registration error
      await storageService.clearAuthData();
      throw error;
    }
  };

  const logout = async () => {
    try {
      logger.log('Starting logout process');
      
      // SignalR disconnection is handled by NotificationContext
      
      await storageService.clearAuthData();
      setUser(null);
      setIsAuthenticated(false);
      
      logger.log('Logout successful');
    } catch (error) {
      logger.error('Error logging out:', error);
    }
  };

  // Set up token expiration callback
  useEffect(() => {
    const handleTokenExpiration = () => {
      logger.log('Token expired callback triggered, logging out user');
      handleTokenExpiration();
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
    tokenValidating,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 