import { debugLogger } from '../utils/DebugLogger';
import { storageService } from './StorageService';
import { networkService } from './NetworkService';
import { auditService } from './AuditService';


const DEBUG_MODE = true;

const debugLog = (message: string, data?: any) => {
  if (DEBUG_MODE) {
    debugLogger.log(`[BackgroundSyncService] ${message}`, data);
  }
};

const debugError = (message: string, error?: any) => {
  if (DEBUG_MODE) {
    debugLogger.error(`[BackgroundSyncService] ${message}`, error);
  }
};

interface SyncTask {
  id: string;
  type: 'audit_progress' | 'audit_complete';
  auditId: string;
  data: any;
  createdAt: number;
  retryCount: number;
  maxRetries: number;
}

interface SyncResult {
  success: boolean;
  synced: number;
  failed: number;
  completed: number;
  errors: string[];
}

class BackgroundSyncService {
  private isRunning = false;
  private syncQueue: SyncTask[] = [];
  private networkListener: (() => void) | null = null;
  private syncInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.initializeNetworkListener();
    this.loadSyncQueue();
  }

  /**
   * Initialize network state listener to trigger sync when connection is restored
   */
  private initializeNetworkListener() {
    this.networkListener = networkService.addListener(async (isConnected) => {
      if (isConnected) {
        debugLog('Network connection restored, triggering sync');
        
        // Network connection restored
        
        // Trigger sync
        this.triggerSync();
      }
    });
  }

  /**
   * Load existing sync queue from storage
   */
  private async loadSyncQueue() {
    try {
      const queueData = await storageService.getData('sync_queue');
      if (queueData && Array.isArray(queueData)) {
        this.syncQueue = queueData;
        debugLog('Loaded sync queue from storage', { count: this.syncQueue.length });
      }
    } catch (error) {
      debugError('Error loading sync queue:', error);
    }
  }

  /**
   * Save sync queue to storage
   */
  private async saveSyncQueue() {
    try {
      await storageService.saveData('sync_queue', this.syncQueue);
      debugLog('Saved sync queue to storage', { count: this.syncQueue.length });
    } catch (error) {
      debugError('Error saving sync queue:', error);
    }
  }

  /**
   * Add a sync task to the queue
   */
  async addSyncTask(task: Omit<SyncTask, 'id' | 'createdAt' | 'retryCount'>): Promise<string> {
    const syncTask: SyncTask = {
      ...task,
      id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: Date.now(),
      retryCount: 0,
    };

    this.syncQueue.push(syncTask);
    await this.saveSyncQueue();
    
    debugLog('Added sync task to queue', { taskId: syncTask.id, type: syncTask.type });
    
    // Try to sync immediately if online
    const isOnline = await networkService.checkConnectivity();
    if (isOnline) {
      this.triggerSync();
    }

    return syncTask.id;
  }

  /**
   * Remove a sync task from the queue
   */
  async removeSyncTask(taskId: string): Promise<boolean> {
    const initialLength = this.syncQueue.length;
    this.syncQueue = this.syncQueue.filter(task => task.id !== taskId);
    
    if (this.syncQueue.length !== initialLength) {
      await this.saveSyncQueue();
      debugLog('Removed sync task from queue', { taskId });
      return true;
    }
    
    return false;
  }

  /**
   * Get all pending sync tasks
   */
  getPendingTasks(): SyncTask[] {
    return [...this.syncQueue];
  }

  /**
   * Trigger sync process
   */
  async triggerSync(): Promise<SyncResult> {
    if (this.isRunning) {
      debugLog('Sync already running, skipping');
      return { success: false, synced: 0, failed: 0, completed: 0, errors: ['Sync already running'] };
    }

    const isOnline = await networkService.checkConnectivity();
    if (!isOnline) {
      debugLog('No internet connection, skipping sync');
      return { success: false, synced: 0, failed: 0, completed: 0, errors: ['No internet connection'] };
    }

    this.isRunning = true;
    const result: SyncResult = { success: true, synced: 0, failed: 0, completed: 0, errors: [] };

    try {
      debugLog('Starting background sync', { queueSize: this.syncQueue.length });

      // Process each task in the queue
      for (const task of [...this.syncQueue]) {
        try {
          const taskResult = await this.processSyncTask(task);
          
          if (taskResult.success) {
            // Remove successful task from queue
            await this.removeSyncTask(task.id);
            result.synced++;
            
            if (task.type === 'audit_complete') {
              result.completed++;
            }
          } else {
            // Increment retry count for failed tasks
            task.retryCount++;
            
            if (task.retryCount >= task.maxRetries) {
              // Remove task that has exceeded max retries
              await this.removeSyncTask(task.id);
              result.failed++;
              result.errors.push(`Task ${task.id} exceeded max retries`);
            }
          }
        } catch (error) {
          debugError(`Error processing sync task ${task.id}:`, error);
          task.retryCount++;
          
          if (task.retryCount >= task.maxRetries) {
            await this.removeSyncTask(task.id);
            result.failed++;
            result.errors.push(`Task ${task.id} failed: ${error}`);
          }
        }
      }

      debugLog('Background sync completed', result);
      
      // Sync completed
    } catch (error) {
      debugError('Error during background sync:', error);
      result.success = false;
      result.errors.push(`Sync error: ${error}`);
    } finally {
      this.isRunning = false;
    }

    return result;
  }

  /**
   * Process a single sync task
   */
  private async processSyncTask(task: SyncTask): Promise<{ success: boolean; error?: string }> {
    try {
      debugLog('Processing sync task', { taskId: task.id, type: task.type });

      switch (task.type) {
        case 'audit_progress':
          // Update audit progress
          await auditService.updateAuditProgress(task.auditId, task.data);
          break;
          
        case 'audit_complete':
          // Submit completed audit
          await auditService.submitAudit(task.auditId, task.data, true);
          break;
          
        default:
          throw new Error(`Unknown sync task type: ${task.type}`);
      }

      debugLog('Sync task completed successfully', { taskId: task.id });
      return { success: true };
    } catch (error) {
      debugError(`Sync task failed: ${task.id}`, error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  /**
   * Start periodic sync (every 5 minutes when online)
   */
  startPeriodicSync(intervalMs: number = 5 * 60 * 1000) {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    this.syncInterval = setInterval(async () => {
      const isOnline = await networkService.checkConnectivity();
      if (isOnline && this.syncQueue.length > 0) {
        debugLog('Periodic sync triggered');
        this.triggerSync();
      }
    }, intervalMs);

    debugLog('Started periodic sync', { intervalMs });
  }

  /**
   * Stop periodic sync
   */
  stopPeriodicSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      debugLog('Stopped periodic sync');
    }
  }

  /**
   * Clean up resources
   */
  cleanup() {
    this.stopPeriodicSync();
    if (this.networkListener) {
      this.networkListener();
      this.networkListener = null;
    }
    debugLog('BackgroundSyncService cleaned up');
  }

  /**
   * Get sync statistics
   */
  getStats(): {
    queueSize: number;
    isRunning: boolean;
    hasPeriodicSync: boolean;
  } {
    return {
      queueSize: this.syncQueue.length,
      isRunning: this.isRunning,
      hasPeriodicSync: this.syncInterval !== null,
    };
  }
}

export const backgroundSyncService = new BackgroundSyncService(); 