import { debugLogger } from '../utils/DebugLogger';
import { storageService, OfflineRequest, SyncStatus } from './StorageService';
import { networkService } from './NetworkService';

const DEBUG_MODE = true;

const debugLog = (message: string, data?: any) => {
  if (DEBUG_MODE) {
    debugLogger.log(`[OfflineService] ${message}`, data);
  }
};

const debugError = (message: string, error?: any) => {
  if (DEBUG_MODE) {
    debugLogger.error(`[OfflineService] ${message}`, error);
  }
};

export interface OfflineOperation {
  id: string;
  type: 'CREATE' | 'UPDATE' | 'DELETE' | 'SUBMIT';
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  data?: any;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface SyncResult {
  success: boolean;
  syncedCount: number;
  failedCount: number;
  errors: string[];
}

class OfflineService {
  private syncInProgress = false;
  private syncListeners: Array<(status: SyncStatus) => void> = [];
  private networkListener: (() => void) | null = null;

  constructor() {
    this.initializeNetworkListener();
  }

  /**
   * Initialize network state listener for automatic sync
   */
  private initializeNetworkListener() {
    this.networkListener = networkService.addListener(async (isConnected) => {
      debugLog('Network state changed', { isConnected });
      
      if (isConnected) {
        // Wait a bit for network to stabilize
        setTimeout(async () => {
          await this.performAutoSync();
        }, 2000);
      }
      
      // Update sync status
      await this.updateSyncStatus({ isOnline: isConnected });
    });
  }

  /**
   * Add sync status listener
   */
  addSyncListener(listener: (status: SyncStatus) => void): () => void {
    this.syncListeners.push(listener);
    
    return () => {
      const index = this.syncListeners.indexOf(listener);
      if (index > -1) {
        this.syncListeners.splice(index, 1);
      }
    };
  }

  /**
   * Notify all sync listeners
   */
  private async notifySyncListeners() {
    const status = await storageService.getSyncStatus();
    this.syncListeners.forEach(listener => listener(status));
  }

  /**
   * Update sync status and notify listeners
   */
  private async updateSyncStatus(status: Partial<SyncStatus>) {
    await storageService.updateSyncStatus(status);
    await this.notifySyncListeners();
  }

  /**
   * Check if app is online
   */
  async isOnline(): Promise<boolean> {
    return await networkService.checkConnectivity();
  }

  /**
   * Add operation to offline queue
   */
  async addToQueue(operation: Omit<OfflineOperation, 'id' | 'timestamp' | 'retryCount'>): Promise<string> {
    const id = `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const request: OfflineRequest = {
      id,
      type: operation.type,
      endpoint: operation.endpoint,
      method: operation.method,
      data: operation.data,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries: operation.maxRetries || 3,
    };

    await storageService.addToOfflineQueue(request);
    
    // Update sync status
    const queue = await storageService.getOfflineQueue();
    await this.updateSyncStatus({ pendingRequests: queue.length });
    
    debugLog('Added operation to queue', { id, type: operation.type, endpoint: operation.endpoint });
    
    return id;
  }

  /**
   * Get all pending operations
   */
  async getPendingOperations(): Promise<OfflineRequest[]> {
    return await storageService.getOfflineQueue();
  }

  /**
   * Remove operation from queue
   */
  async removeFromQueue(operationId: string): Promise<void> {
    await storageService.removeFromOfflineQueue(operationId);
    
    // Update sync status
    const queue = await storageService.getOfflineQueue();
    await this.updateSyncStatus({ pendingRequests: queue.length });
    
    debugLog('Removed operation from queue', { operationId });
  }

  /**
   * Update operation retry count
   */
  async updateRetryCount(operationId: string, retryCount: number): Promise<void> {
    await storageService.updateRequestRetryCount(operationId, retryCount);
    debugLog('Updated retry count', { operationId, retryCount });
  }

  /**
   * Execute a single operation
   */
  private async executeOperation(operation: OfflineRequest): Promise<boolean> {
    try {
      debugLog('Executing operation', { id: operation.id, type: operation.type, endpoint: operation.endpoint });
      
      const token = await storageService.getAuthToken();
      if (!token) {
        debugError('No auth token available for operation', { operationId: operation.id });
        return false;
      }

      const url = `http://192.168.1.4:8080/api/v1${operation.endpoint}`;
      
      const options: RequestInit = {
        method: operation.method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      };

      if (operation.data && operation.method !== 'GET') {
        options.body = JSON.stringify(operation.data);
      }

      const response = await fetch(url, options);
      
      if (response.ok) {
        debugLog('Operation executed successfully', { id: operation.id });
        return true;
      } else {
        const errorText = await response.text();
        debugError('Operation failed', { 
          id: operation.id, 
          status: response.status, 
          error: errorText 
        });
        return false;
      }
    } catch (error) {
      debugError('Error executing operation', { id: operation.id, error });
      return false;
    }
  }

  /**
   * Perform manual sync of all pending operations
   */
  async performManualSync(): Promise<SyncResult> {
    if (this.syncInProgress) {
      debugLog('Sync already in progress, skipping');
      return { success: false, syncedCount: 0, failedCount: 0, errors: ['Sync already in progress'] };
    }

    const isOnline = await this.isOnline();
    if (!isOnline) {
      debugLog('No internet connection, cannot sync');
      return { success: false, syncedCount: 0, failedCount: 0, errors: ['No internet connection'] };
    }

    return await this.performSync();
  }

  /**
   * Perform automatic sync when network becomes available
   */
  private async performAutoSync(): Promise<SyncResult> {
    if (this.syncInProgress) {
      debugLog('Auto sync skipped - sync already in progress');
      return { success: false, syncedCount: 0, failedCount: 0, errors: ['Sync already in progress'] };
    }

    const queue = await storageService.getOfflineQueue();
    if (queue.length === 0) {
      debugLog('No pending operations to sync');
      return { success: true, syncedCount: 0, failedCount: 0, errors: [] };
    }

    debugLog('Performing auto sync', { pendingOperations: queue.length });
    return await this.performSync();
  }

  /**
   * Perform the actual sync operation
   */
  private async performSync(): Promise<SyncResult> {
    this.syncInProgress = true;
    await this.updateSyncStatus({ syncInProgress: true });

    const result: SyncResult = {
      success: true,
      syncedCount: 0,
      failedCount: 0,
      errors: [],
    };

    try {
      const queue = await storageService.getOfflineQueue();
      debugLog('Starting sync', { totalOperations: queue.length });

      // Sort operations by priority and timestamp
      const sortedQueue = queue.sort((a, b) => {
        // Priority order: HIGH > MEDIUM > LOW
        const priorityOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 };
        const aPriority = priorityOrder[a.type as keyof typeof priorityOrder] || 1;
        const bPriority = priorityOrder[b.type as keyof typeof priorityOrder] || 1;
        
        if (aPriority !== bPriority) {
          return bPriority - aPriority; // Higher priority first
        }
        
        return a.timestamp - b.timestamp; // Older operations first
      });

      for (const operation of sortedQueue) {
        try {
          const success = await this.executeOperation(operation);
          
          if (success) {
            await this.removeFromQueue(operation.id);
            result.syncedCount++;
            debugLog('Operation synced successfully', { id: operation.id });
          } else {
            // Increment retry count
            const newRetryCount = operation.retryCount + 1;
            await this.updateRetryCount(operation.id, newRetryCount);
            
            // Remove if max retries exceeded
            if (newRetryCount >= operation.maxRetries) {
              await this.removeFromQueue(operation.id);
              result.failedCount++;
              result.errors.push(`Operation ${operation.id} failed after ${newRetryCount} retries`);
              debugLog('Operation removed after max retries', { id: operation.id, retryCount: newRetryCount });
            } else {
              result.failedCount++;
              debugLog('Operation failed, will retry', { id: operation.id, retryCount: newRetryCount });
            }
          }
        } catch (error) {
          result.failedCount++;
          result.errors.push(`Error processing operation ${operation.id}: ${error}`);
          debugError('Error processing operation', { id: operation.id, error });
        }
      }

      // Update last sync time
      await storageService.updateLastSyncTime();
      
      debugLog('Sync completed', result);
    } catch (error) {
      result.success = false;
      result.errors.push(`Sync failed: ${error}`);
      debugError('Sync failed', error);
    } finally {
      this.syncInProgress = false;
      await this.updateSyncStatus({ syncInProgress: false });
    }

    return result;
  }

  /**
   * Get current sync status
   */
  async getSyncStatus(): Promise<SyncStatus> {
    return await storageService.getSyncStatus();
  }

  /**
   * Get last sync time
   */
  async getLastSyncTime(): Promise<number> {
    return await storageService.getLastSyncTime();
  }

  /**
   * Check if sync is in progress
   */
  isSyncInProgress(): boolean {
    return this.syncInProgress;
  }

  /**
   * Get pending operations count
   */
  async getPendingCount(): Promise<number> {
    const queue = await storageService.getOfflineQueue();
    return queue.length;
  }

  /**
   * Clear all pending operations
   */
  async clearPendingOperations(): Promise<void> {
    const queue = await storageService.getOfflineQueue();
    for (const operation of queue) {
      await this.removeFromQueue(operation.id);
    }
    debugLog('Cleared all pending operations');
  }

  /**
   * Get storage information
   */
  async getStorageInfo() {
    return await storageService.getStorageInfo();
  }

  /**
   * Clear all offline data
   */
  async clearOfflineData(): Promise<void> {
    await storageService.clearOfflineData();
    await storageService.clearCache();
    debugLog('Cleared all offline data');
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    if (this.networkListener) {
      this.networkListener();
      this.networkListener = null;
    }
    this.syncListeners = [];
  }
}

export const offlineService = new OfflineService(); 