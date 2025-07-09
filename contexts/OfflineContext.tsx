import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { offlineService } from '../services/OfflineService';
import { SyncStatus } from '../services/StorageService';

interface OfflineContextType {
  isOnline: boolean;
  pendingRequests: number;
  syncInProgress: boolean;
  lastSyncTime: number;
  performSync: () => Promise<void>;
  getStorageInfo: () => Promise<any>;
  clearOfflineData: () => Promise<void>;
}

const OfflineContext = createContext<OfflineContextType | undefined>(undefined);

interface OfflineProviderProps {
  children: ReactNode;
}

export const OfflineProvider: React.FC<OfflineProviderProps> = ({ children }) => {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    lastSyncTime: 0,
    isOnline: false,
    pendingRequests: 0,
    syncInProgress: false,
  });

  useEffect(() => {
    // Subscribe to sync status changes
    const unsubscribe = offlineService.addSyncListener((status) => {
      setSyncStatus(status);
    });

    // Get initial status
    const getInitialStatus = async () => {
      const status = await offlineService.getSyncStatus();
      setSyncStatus(status);
    };
    
    getInitialStatus();

    return unsubscribe;
  }, []);

  const performSync = async () => {
    try {
      await offlineService.performManualSync();
    } catch (error) {
      console.error('Manual sync failed:', error);
    }
  };

  const getStorageInfo = async () => {
    return await offlineService.getStorageInfo();
  };

  const clearOfflineData = async () => {
    await offlineService.clearOfflineData();
  };

  const value: OfflineContextType = {
    isOnline: syncStatus.isOnline,
    pendingRequests: syncStatus.pendingRequests,
    syncInProgress: syncStatus.syncInProgress,
    lastSyncTime: syncStatus.lastSyncTime,
    performSync,
    getStorageInfo,
    clearOfflineData,
  };

  return (
    <OfflineContext.Provider value={value}>
      {children}
    </OfflineContext.Provider>
  );
};

export const useOffline = (): OfflineContextType => {
  const context = useContext(OfflineContext);
  if (context === undefined) {
    throw new Error('useOffline must be used within an OfflineProvider');
  }
  return context;
}; 