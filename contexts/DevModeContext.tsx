import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { storageService } from '../services/StorageService';
import { updateDebugLoggerDevMode } from '../utils/DebugLogger';

interface DevModeContextType {
  isDevModeEnabled: boolean;
  toggleDevMode: () => Promise<void>;
  setDevMode: (enabled: boolean) => Promise<void>;
}

const DevModeContext = createContext<DevModeContextType | undefined>(undefined);

interface DevModeProviderProps {
  children: ReactNode;
}

export const DevModeProvider: React.FC<DevModeProviderProps> = ({ children }) => {
  const [isDevModeEnabled, setIsDevModeEnabled] = useState(false);

  useEffect(() => {
    loadDevModeSetting();
  }, []);

  const loadDevModeSetting = async () => {
    try {
      const devModeSetting = await storageService.getData('dev_mode_enabled');
      const enabled = devModeSetting === true;
      setIsDevModeEnabled(enabled);
      updateDebugLoggerDevMode(enabled);
    } catch (error) {
      console.error('Error loading dev mode setting:', error);
      setIsDevModeEnabled(false);
      updateDebugLoggerDevMode(false);
    }
  };

  const setDevMode = async (enabled: boolean) => {
    try {
      await storageService.saveData('dev_mode_enabled', enabled);
      setIsDevModeEnabled(enabled);
      updateDebugLoggerDevMode(enabled);
    } catch (error) {
      console.error('Error saving dev mode setting:', error);
    }
  };

  const toggleDevMode = async () => {
    await setDevMode(!isDevModeEnabled);
  };

  const value: DevModeContextType = {
    isDevModeEnabled,
    toggleDevMode,
    setDevMode,
  };

  return (
    <DevModeContext.Provider value={value}>
      {children}
    </DevModeContext.Provider>
  );
};

export const useDevMode = (): DevModeContextType => {
  const context = useContext(DevModeContext);
  if (context === undefined) {
    throw new Error('useDevMode must be used within a DevModeProvider');
  }
  return context;
}; 