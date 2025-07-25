import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthResponse, UserDetails } from './AuthService';

const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  USER_ID: 'user_id',
  USER_DATA: 'user_data',
  IS_AUTHENTICATED: 'is_authenticated',
  // Offline data storage keys
  OFFLINE_AUDITS: 'offline_audits',
  OFFLINE_AUDIT_PROGRESS: 'offline_audit_progress',
  OFFLINE_PENDING_REQUESTS: 'offline_pending_requests',
  OFFLINE_USER_DATA: 'offline_user_data',
  OFFLINE_TEMPLATES: 'offline_templates',
  OFFLINE_ASSIGNMENTS: 'offline_assignments',
  OFFLINE_NOTIFICATIONS: 'offline_notifications',
  // Cache keys
  CACHE_AUDITS: 'cache_audits',
  CACHE_TEMPLATES: 'cache_templates',
  CACHE_ASSIGNMENTS: 'cache_assignments',
  CACHE_USER_PROFILE: 'cache_user_profile',
  // Sync status
  LAST_SYNC_TIME: 'last_sync_time',
  SYNC_STATUS: 'sync_status',
};

// Offline request types
export interface OfflineRequest {
  id: string;
  type: 'CREATE' | 'UPDATE' | 'DELETE' | 'SUBMIT';
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  data?: any;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
}

export interface OfflineData {
  audits: any[];
  auditProgress: { [auditId: string]: any };
  templates: any[];
  assignments: any[];
  userData: any;
  notifications: any[];
}

export interface SyncStatus {
  lastSyncTime: number;
  isOnline: boolean;
  pendingRequests: number;
  syncInProgress: boolean;
}

class StorageService {
  /**
   * Store authentication data after successful login
   */
  async storeAuthData(authResponse: AuthResponse): Promise<void> {
    try {
      console.log('StorageService: Storing auth data:', {
        token: authResponse.token ? `${authResponse.token.substring(0, 10)}...` : 'null',
        userId: authResponse.userId,
        hasUserData: !!authResponse
      });
      
      await AsyncStorage.multiSet([
        [STORAGE_KEYS.AUTH_TOKEN, authResponse.token],
        [STORAGE_KEYS.USER_ID, authResponse.userId],
        [STORAGE_KEYS.USER_DATA, JSON.stringify(authResponse)],
        [STORAGE_KEYS.IS_AUTHENTICATED, 'true'],
      ]);
      
      console.log('StorageService: Auth data stored successfully');
    } catch (error) {
      console.error('Error storing auth data:', error);
      throw new Error('Failed to store authentication data');
    }
  }

  /**
   * Get stored authentication token
   */
  async getAuthToken(): Promise<string | null> {
    try {
      let token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      console.log('StorageService: getAuthToken - direct token:', token ? 'exists' : 'null');
      
      // If individual token is null, try to get it from user_data
      if (!token) {
        console.log('StorageService: getAuthToken - token is null, checking user_data');
        const userData = await this.getUserData();
        if (userData && userData.token) {
          console.log('StorageService: getAuthToken - found token in user_data, storing individually');
          // Store the token individually for future use
          await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, userData.token);
          token = userData.token;
        } else {
          console.log('StorageService: getAuthToken - no token found in user_data either');
        }
      }
      
      return token;
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  }

  /**
   * Get stored user ID
   */
  async getUserId(): Promise<string | null> {
    try {
      let userId = await AsyncStorage.getItem(STORAGE_KEYS.USER_ID);
      console.log('StorageService: getUserId - direct userId:', userId ? 'exists' : 'null');
      
      // If individual userId is null, try to get it from user_data
      if (!userId) {
        console.log('StorageService: getUserId - userId is null, checking user_data');
        const userData = await this.getUserData();
        if (userData && userData.userId) {
          console.log('StorageService: getUserId - found userId in user_data, storing individually');
          // Store the userId individually for future use
          await AsyncStorage.setItem(STORAGE_KEYS.USER_ID, userData.userId);
          userId = userData.userId;
        } else {
          console.log('StorageService: getUserId - no userId found in user_data either');
        }
      }
      
      return userId;
    } catch (error) {
      console.error('Error getting user ID:', error);
      return null;
    }
  }

  /**
   * Get stored user data
   */
  async getUserData(): Promise<AuthResponse | null> {
    try {
      const userData = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Error getting user data:', error);
      return null;
    }
  }

  /**
   * Synchronize auth data to ensure individual values match user_data
   */
  async syncAuthData(): Promise<void> {
    try {
      const userData = await this.getUserData();
      if (userData) {
        console.log('StorageService: Syncing auth data. Current user_data:', userData);
        // Ensure individual values are set correctly
        await AsyncStorage.multiSet([
          [STORAGE_KEYS.AUTH_TOKEN, userData.token],
          [STORAGE_KEYS.USER_ID, userData.userId],
          [STORAGE_KEYS.IS_AUTHENTICATED, 'true'],
        ]);
        console.log('StorageService: Auth data synced successfully.');
      } else {
        console.warn('StorageService: No user data found to sync.');
      }
    } catch (error) {
      console.error('Error syncing auth data:', error);
    }
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    try {
      const isAuth = await AsyncStorage.getItem(STORAGE_KEYS.IS_AUTHENTICATED);
      const token = await this.getAuthToken();
      return isAuth === 'true' && token !== null;
    } catch (error) {
      console.error('Error checking authentication status:', error);
      return false;
    }
  }

  /**
   * Clear all authentication data (logout)
   */
  async clearAuthData(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.AUTH_TOKEN,
        STORAGE_KEYS.USER_ID,
        STORAGE_KEYS.USER_DATA,
        STORAGE_KEYS.IS_AUTHENTICATED,
      ]);
    } catch (error) {
      console.error('Error clearing auth data:', error);
      throw new Error('Failed to clear authentication data');
    }
  }

  /**
   * Update user data in storage
   */
  async updateUserData(userData: UserDetails | AuthResponse): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
    } catch (error) {
      console.error('Error updating user data:', error);
      throw new Error('Failed to update user data');
    }
  }

  /**
   * Save generic data to storage
   */
  async saveData(key: string, data: any): Promise<void> {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving data:', error);
      throw new Error('Failed to save data');
    }
  }

  /**
   * Get generic data from storage
   */
  async getData(key: string): Promise<any | null> {
    try {
      const data = await AsyncStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error getting data:', error);
      return null;
    }
  }

  /**
   * Remove data from storage
   */
  async removeData(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error('Error removing data:', error);
      throw new Error('Failed to remove data');
    }
  }

  /**
   * Test method to manually store and retrieve auth data
   */
  async testAuthStorage(): Promise<{
    success: boolean;
    stored: { token: string; userId: string } | null;
    retrieved: { token: string | null; userId: string | null } | null;
    error?: string;
  }> {
    try {
      console.log('StorageService: Testing auth storage operations');
      
      // Test data
      const testToken = 'test_token_' + Date.now();
      const testUserId = 'test_user_' + Date.now();
      
      // Store test data
      await AsyncStorage.multiSet([
        [STORAGE_KEYS.AUTH_TOKEN, testToken],
        [STORAGE_KEYS.USER_ID, testUserId],
      ]);
      
      console.log('StorageService: Test data stored');
      
      // Retrieve test data
      const [retrievedToken, retrievedUserId] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN),
        AsyncStorage.getItem(STORAGE_KEYS.USER_ID),
      ]);
      
      console.log('StorageService: Test data retrieved:', {
        stored: { token: testToken, userId: testUserId },
        retrieved: { token: retrievedToken, userId: retrievedUserId }
      });
      
      // Clean up test data
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.AUTH_TOKEN,
        STORAGE_KEYS.USER_ID,
      ]);
      
      const success = retrievedToken === testToken && retrievedUserId === testUserId;
      
      return {
        success,
        stored: { token: testToken, userId: testUserId },
        retrieved: { token: retrievedToken, userId: retrievedUserId },
        error: success ? undefined : 'Retrieved values do not match stored values'
      };
    } catch (error) {
      console.error('StorageService: Test auth storage failed:', error);
      return {
        success: false,
        stored: null,
        retrieved: null,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Force re-store auth data from user_data (useful for fixing inconsistencies)
   */
  async forceRestoreAuthData(): Promise<void> {
    try {
      console.log('StorageService: Force restoring auth data from user_data');
      const userData = await this.getUserData();
      if (userData && userData.token && userData.userId) {
        console.log('StorageService: Found valid user_data, re-storing individual values');
        await AsyncStorage.multiSet([
          [STORAGE_KEYS.AUTH_TOKEN, userData.token],
          [STORAGE_KEYS.USER_ID, userData.userId],
          [STORAGE_KEYS.IS_AUTHENTICATED, 'true'],
        ]);
        console.log('StorageService: Auth data force restored successfully');
      } else {
        console.warn('StorageService: No valid user_data found for force restore');
      }
    } catch (error) {
      console.error('Error force restoring auth data:', error);
    }
  }

  /**
   * Debug method to inspect auth storage values
   */
  async debugAuthStorage(): Promise<{
    authToken: string | null;
    userId: string | null;
    userData: any;
    userDataRaw: string | null;
    isAuthenticated: string | null;
    allKeys: string[];
    userDataKeys: string[];
  }> {
    try {
      const [authToken, userId, userDataRaw, isAuthenticated, allKeys] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN),
        AsyncStorage.getItem(STORAGE_KEYS.USER_ID),
        AsyncStorage.getItem(STORAGE_KEYS.USER_DATA),
        AsyncStorage.getItem(STORAGE_KEYS.IS_AUTHENTICATED),
        AsyncStorage.getAllKeys(),
      ]);

      let userData = null;
      let userDataKeys: string[] = [];
      
      if (userDataRaw) {
        try {
          userData = JSON.parse(userDataRaw);
          userDataKeys = Object.keys(userData || {});
        } catch (parseError) {
          console.error('Error parsing user_data:', parseError);
        }
      }

      console.log('StorageService: Debug Auth Storage Details:', {
        authToken: authToken ? `${authToken.substring(0, 10)}...` : 'null',
        userId,
        userDataRaw: userDataRaw ? `${userDataRaw.substring(0, 100)}...` : 'null',
        userData,
        userDataKeys,
        isAuthenticated,
        allKeys: allKeys.filter(key => key.includes('auth') || key.includes('user') || key.includes('token'))
      });

      return {
        authToken,
        userId,
        userData,
        userDataRaw,
        isAuthenticated,
        allKeys: [...allKeys],
        userDataKeys,
      };
    } catch (error) {
      console.error('Error debugging auth storage:', error);
      return {
        authToken: null,
        userId: null,
        userData: null,
        userDataRaw: null,
        isAuthenticated: null,
        allKeys: [],
        userDataKeys: [],
      };
    }
  }

  /**
   * Get all storage keys
   */
  async getAllKeys(): Promise<string[]> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      return [...keys]; // Convert readonly array to mutable array
    } catch (error) {
      console.error('Error getting all keys:', error);
      return [];
    }
  }

  // ========== OFFLINE DATA MANAGEMENT ==========

  /**
   * Store offline audit data
   */
  async storeOfflineAudits(audits: any[]): Promise<void> {
    try {
      await this.saveData(STORAGE_KEYS.OFFLINE_AUDITS, audits);
    } catch (error) {
      console.error('Error storing offline audits:', error);
      throw new Error('Failed to store offline audits');
    }
  }

  /**
   * Get offline audit data
   */
  async getOfflineAudits(): Promise<any[]> {
    try {
      const audits = await this.getData(STORAGE_KEYS.OFFLINE_AUDITS);
      return audits || [];
    } catch (error) {
      console.error('Error getting offline audits:', error);
      return [];
    }
  }

  /**
   * Store offline audit progress
   */
  async storeOfflineAuditProgress(auditId: string, progress: any): Promise<void> {
    try {
      const existingProgress = await this.getData(STORAGE_KEYS.OFFLINE_AUDIT_PROGRESS) || {};
      existingProgress[auditId] = {
        ...progress,
        lastUpdated: Date.now(),
      };
      await this.saveData(STORAGE_KEYS.OFFLINE_AUDIT_PROGRESS, existingProgress);
    } catch (error) {
      console.error('Error storing offline audit progress:', error);
      throw new Error('Failed to store offline audit progress');
    }
  }

  /**
   * Get offline audit progress
   */
  async getOfflineAuditProgress(auditId?: string): Promise<any> {
    try {
      const progress = await this.getData(STORAGE_KEYS.OFFLINE_AUDIT_PROGRESS) || {};
      return auditId ? progress[auditId] : progress;
    } catch (error) {
      console.error('Error getting offline audit progress:', error);
      return auditId ? null : {};
    }
  }

  /**
   * Store offline templates
   */
  async storeOfflineTemplates(templates: any[]): Promise<void> {
    try {
      await this.saveData(STORAGE_KEYS.OFFLINE_TEMPLATES, templates);
    } catch (error) {
      console.error('Error storing offline templates:', error);
      throw new Error('Failed to store offline templates');
    }
  }

  /**
   * Get offline templates
   */
  async getOfflineTemplates(): Promise<any[]> {
    try {
      const templates = await this.getData(STORAGE_KEYS.OFFLINE_TEMPLATES);
      return templates || [];
    } catch (error) {
      console.error('Error getting offline templates:', error);
      return [];
    }
  }

  /**
   * Store offline assignments
   */
  async storeOfflineAssignments(assignments: any[]): Promise<void> {
    try {
      await this.saveData(STORAGE_KEYS.OFFLINE_ASSIGNMENTS, assignments);
    } catch (error) {
      console.error('Error storing offline assignments:', error);
      throw new Error('Failed to store offline assignments');
    }
  }

  /**
   * Get offline assignments
   */
  async getOfflineAssignments(): Promise<any[]> {
    try {
      const assignments = await this.getData(STORAGE_KEYS.OFFLINE_ASSIGNMENTS);
      return assignments || [];
    } catch (error) {
      console.error('Error getting offline assignments:', error);
      return [];
    }
  }

  /**
   * Store offline user data
   */
  async storeOfflineUserData(userData: any): Promise<void> {
    try {
      await this.saveData(STORAGE_KEYS.OFFLINE_USER_DATA, userData);
    } catch (error) {
      console.error('Error storing offline user data:', error);
      throw new Error('Failed to store offline user data');
    }
  }

  /**
   * Get offline user data
   */
  async getOfflineUserData(): Promise<any | null> {
    try {
      return await this.getData(STORAGE_KEYS.OFFLINE_USER_DATA);
    } catch (error) {
      console.error('Error getting offline user data:', error);
      return null;
    }
  }

  // ========== CACHE MANAGEMENT ==========

  /**
   * Store cached data
   */
  async storeCache(key: string, data: any, ttl: number = 24 * 60 * 60 * 1000): Promise<void> {
    try {
      const cacheData = {
        data,
        timestamp: Date.now(),
        ttl,
      };
      await this.saveData(key, cacheData);
    } catch (error) {
      console.error('Error storing cache:', error);
      throw new Error('Failed to store cache');
    }
  }

  /**
   * Get cached data
   */
  async getCache(key: string): Promise<any | null> {
    try {
      const cacheData = await this.getData(key);
      if (!cacheData) return null;

      const { data, timestamp, ttl } = cacheData;
      const now = Date.now();

      // Check if cache is expired
      if (now - timestamp > ttl) {
        await this.removeData(key);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error getting cache:', error);
      return null;
    }
  }

  /**
   * Clear expired cache entries
   */
  async clearExpiredCache(): Promise<void> {
    try {
      const cacheKeys = [
        STORAGE_KEYS.CACHE_AUDITS,
        STORAGE_KEYS.CACHE_TEMPLATES,
        STORAGE_KEYS.CACHE_ASSIGNMENTS,
        STORAGE_KEYS.CACHE_USER_PROFILE,
      ];

      for (const key of cacheKeys) {
        const cacheData = await this.getData(key);
        if (cacheData) {
          const { timestamp, ttl } = cacheData;
          const now = Date.now();

          if (now - timestamp > ttl) {
            await this.removeData(key);
          }
        }
      }
    } catch (error) {
      console.error('Error clearing expired cache:', error);
    }
  }

  // ========== OFFLINE REQUEST QUEUE ==========

  /**
   * Add request to offline queue
   */
  async addToOfflineQueue(request: OfflineRequest): Promise<void> {
    try {
      const queue = await this.getData(STORAGE_KEYS.OFFLINE_PENDING_REQUESTS) || [];
      queue.push(request);
      await this.saveData(STORAGE_KEYS.OFFLINE_PENDING_REQUESTS, queue);
    } catch (error) {
      console.error('Error adding to offline queue:', error);
      throw new Error('Failed to add to offline queue');
    }
  }

  /**
   * Get offline request queue
   */
  async getOfflineQueue(): Promise<OfflineRequest[]> {
    try {
      const queue = await this.getData(STORAGE_KEYS.OFFLINE_PENDING_REQUESTS);
      return queue || [];
    } catch (error) {
      console.error('Error getting offline queue:', error);
      return [];
    }
  }

  /**
   * Remove request from offline queue
   */
  async removeFromOfflineQueue(requestId: string): Promise<void> {
    try {
      const queue = await this.getOfflineQueue();
      const filteredQueue = queue.filter(req => req.id !== requestId);
      await this.saveData(STORAGE_KEYS.OFFLINE_PENDING_REQUESTS, filteredQueue);
    } catch (error) {
      console.error('Error removing from offline queue:', error);
      throw new Error('Failed to remove from offline queue');
    }
  }

  /**
   * Update request retry count
   */
  async updateRequestRetryCount(requestId: string, retryCount: number): Promise<void> {
    try {
      const queue = await this.getOfflineQueue();
      const updatedQueue = queue.map(req => 
        req.id === requestId ? { ...req, retryCount } : req
      );
      await this.saveData(STORAGE_KEYS.OFFLINE_PENDING_REQUESTS, updatedQueue);
    } catch (error) {
      console.error('Error updating request retry count:', error);
      throw new Error('Failed to update request retry count');
    }
  }

  // ========== SYNC STATUS MANAGEMENT ==========

  /**
   * Update sync status
   */
  async updateSyncStatus(status: Partial<SyncStatus>): Promise<void> {
    try {
      const currentStatus = await this.getData(STORAGE_KEYS.SYNC_STATUS) || {};
      const updatedStatus = { ...currentStatus, ...status };
      await this.saveData(STORAGE_KEYS.SYNC_STATUS, updatedStatus);
    } catch (error) {
      console.error('Error updating sync status:', error);
      throw new Error('Failed to update sync status');
    }
  }

  /**
   * Get sync status
   */
  async getSyncStatus(): Promise<SyncStatus> {
    try {
      const status = await this.getData(STORAGE_KEYS.SYNC_STATUS);
      return status || {
        lastSyncTime: 0,
        isOnline: false,
        pendingRequests: 0,
        syncInProgress: false,
      };
    } catch (error) {
      console.error('Error getting sync status:', error);
      return {
        lastSyncTime: 0,
        isOnline: false,
        pendingRequests: 0,
        syncInProgress: false,
      };
    }
  }

  /**
   * Update last sync time
   */
  async updateLastSyncTime(): Promise<void> {
    try {
      await this.saveData(STORAGE_KEYS.LAST_SYNC_TIME, Date.now());
    } catch (error) {
      console.error('Error updating last sync time:', error);
      throw new Error('Failed to update last sync time');
    }
  }

  /**
   * Get last sync time
   */
  async getLastSyncTime(): Promise<number> {
    try {
      const time = await this.getData(STORAGE_KEYS.LAST_SYNC_TIME);
      return time || 0;
    } catch (error) {
      console.error('Error getting last sync time:', error);
      return 0;
    }
  }

  // ========== UTILITY METHODS ==========

  /**
   * Get storage usage information
   */
  async getStorageInfo(): Promise<{
    totalKeys: number;
    offlineDataSize: number;
    cacheSize: number;
    queueSize: number;
  }> {
    try {
      const allKeys = await this.getAllKeys();
      const offlineKeys = allKeys.filter(key => key.includes('OFFLINE_'));
      const cacheKeys = allKeys.filter(key => key.includes('CACHE_'));
      const queueData = await this.getOfflineQueue();

      return {
        totalKeys: allKeys.length,
        offlineDataSize: offlineKeys.length,
        cacheSize: cacheKeys.length,
        queueSize: queueData.length,
      };
    } catch (error) {
      console.error('Error getting storage info:', error);
      return {
        totalKeys: 0,
        offlineDataSize: 0,
        cacheSize: 0,
        queueSize: 0,
      };
    }
  }

  /**
   * Clear all offline data
   */
  async clearOfflineData(): Promise<void> {
    try {
      const offlineKeys = [
        STORAGE_KEYS.OFFLINE_AUDITS,
        STORAGE_KEYS.OFFLINE_AUDIT_PROGRESS,
        STORAGE_KEYS.OFFLINE_PENDING_REQUESTS,
        STORAGE_KEYS.OFFLINE_USER_DATA,
        STORAGE_KEYS.OFFLINE_TEMPLATES,
        STORAGE_KEYS.OFFLINE_ASSIGNMENTS,
        STORAGE_KEYS.OFFLINE_NOTIFICATIONS,
      ];
      await AsyncStorage.multiRemove(offlineKeys);
    } catch (error) {
      console.error('Error clearing offline data:', error);
      throw new Error('Failed to clear offline data');
    }
  }

  /**
   * Clear all cache data
   */
  async clearCache(): Promise<void> {
    try {
      const cacheKeys = [
        STORAGE_KEYS.CACHE_AUDITS,
        STORAGE_KEYS.CACHE_TEMPLATES,
        STORAGE_KEYS.CACHE_ASSIGNMENTS,
        STORAGE_KEYS.CACHE_USER_PROFILE,
      ];
      await AsyncStorage.multiRemove(cacheKeys);
    } catch (error) {
      console.error('Error clearing cache:', error);
      throw new Error('Failed to clear cache');
    }
  }
}

export const storageService = new StorageService(); 