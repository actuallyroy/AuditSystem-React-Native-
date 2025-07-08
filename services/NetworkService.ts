import NetInfo from '@react-native-community/netinfo';
import { debugLogger } from '../utils/DebugLogger';

const DEBUG_MODE = true;

const debugLog = (message: string, data?: any) => {
  if (DEBUG_MODE) {
    debugLogger.log(`[NetworkService] ${message}`, data);
  }
};

const debugError = (message: string, error?: any) => {
  if (DEBUG_MODE) {
    debugLogger.error(`[NetworkService] ${message}`, error);
  }
};

class NetworkService {
  private listeners: Array<(isConnected: boolean) => void> = [];

  constructor() {
    this.initializeNetworkListener();
  }

  /**
   * Initialize network state listener
   */
  private initializeNetworkListener() {
    NetInfo.addEventListener((state: any) => {
      const isConnected = Boolean(state.isConnected) && Boolean(state.isInternetReachable);
      debugLog('Network state changed', { 
        isConnected, 
        type: state.type, 
        isInternetReachable: state.isInternetReachable 
      });
      
      // Notify all listeners
      this.listeners.forEach(listener => listener(isConnected));
    });
  }

  /**
   * Check current network connectivity
   */
  async checkConnectivity(): Promise<boolean> {
    try {
      const state = await NetInfo.fetch();
      const isConnected = Boolean(state.isConnected) && Boolean(state.isInternetReachable);
      
      debugLog('Network connectivity check', { 
        isConnected, 
        type: state.type, 
        isInternetReachable: state.isInternetReachable 
      });
      
      return isConnected;
    } catch (error) {
      debugError('Error checking network connectivity:', error);
      return false;
    }
  }

  /**
   * Add network state change listener
   */
  addListener(listener: (isConnected: boolean) => void): () => void {
    this.listeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Get detailed network information
   */
  async getNetworkInfo(): Promise<{
    isConnected: boolean;
    type: string;
    isInternetReachable: boolean;
    isWifi: boolean;
    isCellular: boolean;
  }> {
    try {
      const state = await NetInfo.fetch();
      return {
        isConnected: Boolean(state.isConnected),
        type: state.type || 'unknown',
        isInternetReachable: Boolean(state.isInternetReachable),
        isWifi: state.type === 'wifi',
        isCellular: state.type === 'cellular',
      };
    } catch (error) {
      debugError('Error getting network info:', error);
      return {
        isConnected: false,
        type: 'unknown',
        isInternetReachable: false,
        isWifi: false,
        isCellular: false,
      };
    }
  }

  /**
   * Wait for network to become available
   */
  async waitForConnection(timeoutMs: number = 30000): Promise<boolean> {
    return new Promise((resolve) => {
      const startTime = Date.now();
      
      const checkConnection = async () => {
        const isConnected = await this.checkConnectivity();
        
        if (isConnected) {
          resolve(true);
          return;
        }
        
        // Check timeout
        if (Date.now() - startTime > timeoutMs) {
          resolve(false);
          return;
        }
        
        // Check again in 1 second
        setTimeout(checkConnection, 1000);
      };
      
      checkConnection();
    });
  }
}

export const networkService = new NetworkService(); 